-- SECURITY FIX: any org owner/admin could self-grant "pro" by updating their own
-- organizations row from the browser (subscription_* columns were unprotected, bypassing Stripe).
-- Freeze the billing columns unless the caller is the service_role (Stripe webhook / edge fn)
-- or a verified system admin (AdminPanel grant-Pro flow, server-enforced via is_system_admin()).
CREATE OR REPLACE FUNCTION public.protect_org_billing_columns()
RETURNS trigger AS $$
BEGIN
  IF (auth.role() IS DISTINCT FROM 'service_role') AND NOT COALESCE(public.is_system_admin(), false) THEN
    NEW.subscription_tier       := OLD.subscription_tier;
    NEW.subscription_status     := OLD.subscription_status;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.stripe_customer_id      := OLD.stripe_customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_org_billing ON public.organizations;
CREATE TRIGGER trg_protect_org_billing
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_org_billing_columns();

REVOKE EXECUTE ON FUNCTION public.protect_org_billing_columns() FROM PUBLIC, anon, authenticated;
