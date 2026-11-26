-- SECURITY FIX: profiles was world-readable (USING true) via the public anon key,
-- exposing every user's email + full_name. Restrict to self + organization co-members.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Users can view self and org co-members"
ON public.profiles
FOR SELECT
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.organization_members me
    JOIN public.organization_members them ON them.org_id = me.org_id
    WHERE me.user_id = (SELECT auth.uid())
      AND them.user_id = public.profiles.id
  )
  OR (SELECT public.is_system_admin())
);
