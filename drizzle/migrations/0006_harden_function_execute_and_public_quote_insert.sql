-- 1) SECURITY DEFINER functions must not be callable by anonymous visitors.
-- has_role / is_staff stay executable by signed-in users because RLS policies invoke them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM public, anon;

-- grant_first_user_admin only runs from the auth.users trigger: no role should call it directly.
REVOKE EXECUTE ON FUNCTION public.grant_first_user_admin() FROM public, anon, authenticated;

-- 2) Let the public quote form insert new requests without any read/write access.
GRANT INSERT ON public.quote_requests TO anon;

CREATE POLICY "Public can submit quote requests"
ON public.quote_requests
FOR INSERT
TO anon
WITH CHECK (status = 'nouveau'::public.request_status);