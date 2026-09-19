-- Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

-- Bootstrap: existing users become admins so the private workspace keeps working
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- The very first account created becomes admin; later signups get no role by default
CREATE OR REPLACE FUNCTION public.grant_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_first_user_admin ON auth.users;
CREATE TRIGGER grant_first_user_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_first_user_admin();

-- quote_requests: staff only
DROP POLICY IF EXISTS "Authenticated can read requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Authenticated can update requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Authenticated can delete requests" ON public.quote_requests;

CREATE POLICY "Staff can read requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update requests"
ON public.quote_requests FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete requests"
ON public.quote_requests FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- Explicit INSERT policy: public submissions go through the validated server
-- function (service role); no anon/authenticated direct inserts except staff.
CREATE POLICY "Staff can insert requests"
ON public.quote_requests FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

REVOKE INSERT ON public.quote_requests FROM anon;

-- request_notes: staff only
DROP POLICY IF EXISTS "Authenticated can read notes" ON public.request_notes;
DROP POLICY IF EXISTS "Authenticated can insert notes" ON public.request_notes;
DROP POLICY IF EXISTS "Authenticated can delete own notes" ON public.request_notes;

CREATE POLICY "Staff can read notes"
ON public.request_notes FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert notes"
ON public.request_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id AND public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete own notes"
ON public.request_notes FOR DELETE TO authenticated
USING (auth.uid() = author_id AND public.is_staff(auth.uid()));

-- pricing_settings: read staff, write admin only
DROP POLICY IF EXISTS "Authenticated can read pricing" ON public.pricing_settings;
DROP POLICY IF EXISTS "Authenticated can update pricing" ON public.pricing_settings;

CREATE POLICY "Staff can read pricing"
ON public.pricing_settings FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can update pricing"
ON public.pricing_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
