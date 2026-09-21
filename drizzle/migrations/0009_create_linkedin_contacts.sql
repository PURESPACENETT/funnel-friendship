CREATE TABLE public.linkedin_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company text,
  city text,
  role_key text,
  linkedin_url text,
  status public.prospect_status NOT NULL DEFAULT 'a_contacter',
  notes text,
  contacted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_contacts TO authenticated;
GRANT ALL ON public.linkedin_contacts TO service_role;

ALTER TABLE public.linkedin_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read linkedin contacts" ON public.linkedin_contacts
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert linkedin contacts" ON public.linkedin_contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update linkedin contacts" ON public.linkedin_contacts
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete linkedin contacts" ON public.linkedin_contacts
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER linkedin_contacts_touch BEFORE UPDATE ON public.linkedin_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();