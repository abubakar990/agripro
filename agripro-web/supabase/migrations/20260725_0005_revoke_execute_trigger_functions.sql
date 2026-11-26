-- SECURITY (least-privilege): these SECURITY DEFINER functions are trigger bodies only.
-- Not exploitable via /rpc (they error without trigger context) but should not be in the
-- anon/authenticated API surface. Triggers still fire without caller EXECUTE privilege.
-- The RLS helper functions (is_org_member, has_farm_access, get_my_orgs, is_system_admin)
-- are intentionally left executable because RLS policy evaluation references them.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.handle_new_user_profile()',
    'public.process_pending_invitations()',
    'public.log_activity()',
    'public.mirror_to_archive()',
    'public.check_inventory_stock()',
    'public.protect_org_billing_columns()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function %', fn;
    END;
  END LOOP;
END $$;
