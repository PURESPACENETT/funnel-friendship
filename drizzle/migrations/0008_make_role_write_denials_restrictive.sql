DROP POLICY "Direct role inserts are forbidden" ON public.user_roles;
DROP POLICY "Direct role updates are forbidden" ON public.user_roles;
DROP POLICY "Direct role deletes are forbidden" ON public.user_roles;

CREATE POLICY "Direct role inserts are forbidden"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Direct role updates are forbidden"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Direct role deletes are forbidden"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);