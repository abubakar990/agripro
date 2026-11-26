-- SECURITY FIX: invitations copied `role` verbatim on signup, so an admin could invite a
-- confederate as 'owner'. Keep management limited to owners/admins AND forbid inviting as 'owner'.
DROP POLICY IF EXISTS "Owners and admins can manage invites" ON public.invitations;

CREATE POLICY "Owners and admins can manage invites"
ON public.invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = invitations.org_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND (organization_members.role)::text = ANY (ARRAY['owner','admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = invitations.org_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND (organization_members.role)::text = ANY (ARRAY['owner','admin'])
  )
  AND (role)::text = ANY (ARRAY['member','admin'])
);
