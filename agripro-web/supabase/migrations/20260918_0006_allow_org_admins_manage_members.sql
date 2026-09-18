-- Helper function to check if the current user is an admin or owner of the organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy to allow admins and owners to insert members
CREATE POLICY "Owners and admins can insert members" ON public.organization_members 
FOR INSERT WITH CHECK (
  public.is_org_admin(org_id)
);

-- Policy to allow admins and owners to update members
CREATE POLICY "Owners and admins can update members" ON public.organization_members 
FOR UPDATE USING (
  public.is_org_admin(org_id)
) WITH CHECK (
  public.is_org_admin(org_id)
);

-- Policy to allow admins and owners to delete members
CREATE POLICY "Owners and admins can delete members" ON public.organization_members 
FOR DELETE USING (
  public.is_org_admin(org_id)
);

-- Policy to allow a user to remove themselves
CREATE POLICY "Users can remove themselves" ON public.organization_members
FOR DELETE USING (
  user_id = auth.uid()
);
