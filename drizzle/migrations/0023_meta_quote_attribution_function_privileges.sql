REVOKE EXECUTE ON FUNCTION public.capture_meta_quote_attribution() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_meta_quote_attribution() TO postgres, service_role;