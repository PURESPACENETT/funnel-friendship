ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.is_staff(uuid) SECURITY INVOKER;

CREATE POLICY "Direct role inserts are forbidden"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Direct role updates are forbidden"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Direct role deletes are forbidden"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);