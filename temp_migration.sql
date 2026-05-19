-- 1. Add farm_access to organization_members and invitations
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS farm_access JSONB DEFAULT '{"type": "all"}';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS farm_access JSONB DEFAULT '{"type": "all"}';

-- 2. Create Activity Logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their org logs" ON public.activity_logs;
CREATE POLICY "Admins can view their org logs"
ON public.activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = activity_logs.org_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- 4. Update the 'has_farm_access' function
CREATE OR REPLACE FUNCTION public.has_farm_access(_farm_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  access_info JSONB;
BEGIN
  -- Get the current user's access for the org this farm belongs to
  SELECT farm_access INTO access_info
  FROM public.organization_members
  WHERE user_id = auth.uid()
  AND org_id = (SELECT org_id FROM public.farms WHERE id = _farm_id);

  IF access_info IS NULL THEN
    RETURN FALSE;
  END IF;

  IF access_info->>'type' = 'all' THEN
    RETURN TRUE;
  END IF;

  IF access_info->>'type' = 'specific' THEN
    RETURN (access_info->'farm_ids') @> to_jsonb(_farm_id);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
