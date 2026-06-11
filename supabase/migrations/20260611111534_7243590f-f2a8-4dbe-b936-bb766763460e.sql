-- Revoke EXECUTE from anon/authenticated on internal helpers that should not be callable from the app
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_count() FROM anon, PUBLIC;
-- Keep get_user_count callable by authenticated users only (used in dashboard)
GRANT EXECUTE ON FUNCTION public.get_user_count() TO authenticated;