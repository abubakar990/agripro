import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData(session, preferredOrgId) {
  const [data, setData] = useState({
    organizations: [],
    currentOrg: null,
    isSystemAdmin: false,
    farms: [],
    farmPlots: [],
    revenue: [],
    expenses: [],
    creditEntries: [],
    loans: [],
    inventory: [],
    workers: [],
    attendance: [],
    machinery: [],
    machineUsage: [],
    livestock: [],
    animalHealth: [],
    cropCycles: [],
    mandiPrices: [],
    irrigationLog: [],
    sprayLog: [],
    vendorsBuyers: [],
    categories: [],
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
      const [
        { data: revenue },
        { data: expenses },
        { data: creditEntries },
        { data: loans },
        { data: inventory },
        { data: workers },
        { data: attendance },
        { data: machinery },
        { data: machineUsage },
        { data: livestock },
        { data: mandiPrices },
        { data: irrigationLog },
        { data: sprayLog },
        { data: vendorsBuyers },
        { data: categories }
      ] = await Promise.all([
        supabase.from('revenue').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('expenses').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('credit_entries').select('*, payments:credit_payments(*)').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('loans').select('*, payments:loan_payments(*)').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('inventory').select('*').in('farm_id', farmIds).order('id'),
        supabase.from('workers').select('*').in('farm_id', farmIds).order('id'),
        supabase.from('attendance').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('machinery').select('*').in('farm_id', farmIds).order('id'),
        supabase.from('machine_usage').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('livestock').select('*').in('farm_id', farmIds).order('id'),
        supabase.from('mandi_prices').select('*').order('date', { ascending: false }), // Global
        supabase.from('irrigation_log').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('spray_log').select('*').in('farm_id', farmIds).order('date', { ascending: false }),
        supabase.from('vendors_buyers').select('*').eq('org_id', currentOrg.id).order('name'),
        supabase.from('categories').select('*').or(`org_id.eq.${currentOrg.id},user_id.is.null`).order('name')
      ]);

      // Nested fetches for details (health, etc)
      let animalHealth = [];
      let cropCycles = [];
      let farmPlots = [];
      
      if (farmIds.length > 0) {
        const [{ data: health }, { data: cycles }, { data: plots }] = await Promise.all([
          supabase.from('animal_health').select('*').in('livestock_id', (await supabase.from('livestock').select('id').in('farm_id', farmIds)).data?.map(l => l.id) || []).order('date', { ascending: false }),
          supabase.from('crop_cycles').select('*').in('farm_id', farmIds).order('sowing_date', { ascending: false }),
          supabase.from('farm_plots').select('*').in('farm_id', farmIds).order('name')
        ]);
        animalHealth = health || [];
        cropCycles = cycles || [];
        farmPlots = plots || [];
      }

      const isSystemAdmin = organizations?.some(org => 
        org.organization_members?.some(m => m.user_id === session.user.id && m.is_system_admin)
      ) || false;

      setData({
        organizations: organizations || [],
        currentOrg,
        isSystemAdmin,
        farms: farms || [],
        revenue: revenue || [],
        expenses: expenses || [],
        creditEntries: creditEntries || [],
        loans: loans || [],
        inventory: inventory || [],
        workers: workers || [],
        attendance: attendance || [],
        machinery: machinery || [],
        machineUsage: machineUsage || [],
        livestock: livestock || [],
        animalHealth,
        cropCycles,
        farmPlots,
        mandiPrices: mandiPrices || [],
        irrigationLog: irrigationLog || [],
        sprayLog: sprayLog || [],
        vendorsBuyers: vendorsBuyers || [],
        categories: categories || []
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();

      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public' 
        }, (payload) => {
          fetchData(true); // Silent refetch
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Reset state on logout
      setData({
        organizations: [],
        currentOrg: null,
        isSystemAdmin: false,
        farms: [],
        revenue: [],
        expenses: [],
        creditEntries: [],
        loans: [],
        inventory: [],
        workers: [],
        attendance: [],
        machinery: [],
        machineUsage: [],
        livestock: [],
        animalHealth: [],
        cropCycles: [],
        farmPlots: [],
        mandiPrices: [],
        irrigationLog: [],
        sprayLog: [],
        vendorsBuyers: [],
        categories: [],
      });
      setLoading(false);
    }
  }, [session, preferredOrgId]);

  return { ...data, loading, refetch: fetchData };
}
