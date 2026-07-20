import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData(session, preferredOrgId) {
  const [data, setData] = useState({
    organizations: [],
    currentOrg: null,
    isSystemAdmin: false,
    farms: [],
    creditEntries: []
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async (isSilent = false) => {
    if (!session) {
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    
    try {
      // 1. First fetch organizations to establish context
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('*, organization_members(*)');
      
      if (orgsError) throw orgsError;

      let currentOrg = null;
      if (organizations && organizations.length > 0) {
        currentOrg = organizations.find(o => o.id === preferredOrgId) || organizations[0];
        if (currentOrg.id !== preferredOrgId) {
          localStorage.setItem('agripro_current_org_id', currentOrg.id);
        }
      }

      if (!currentOrg) {
        setLoading(false);
        return;
      }

      // 2. Fetch Farms for this organization only
      const { data: farms, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('id');
      
      if (farmsError) throw farmsError;

      const farmIds = farms.map(f => f.id);

      // 3. Fetch module data filtered by these farms
      // 3. Fetch credit entries (needed for Sidebar badge)
      const [{ data: creditEntries }] = await Promise.all([
        supabase.from('credit_entries').select('*, payments:credit_payments(*)').in('farm_id', farmIds).order('date', { ascending: false })
      ]);



      const isSystemAdmin = organizations?.some(org => 
        org.organization_members?.some(m => m.user_id === session.user.id && m.is_system_admin)
      ) || false;

      setData({
        organizations: organizations || [],
        currentOrg,
        isSystemAdmin,
        farms: farms || [],
        creditEntries: creditEntries || []
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    let fetchTimeout;
    
    if (session) {
      fetchData();
    } else {
      // Reset state on logout
      setData({
        organizations: [],
        currentOrg: null,
        isSystemAdmin: false,
        farms: [],
        creditEntries: []
      });
      setLoading(false);
    }
  }, [session, preferredOrgId]);

  return { ...data, loading, refetch: fetchData };
}
