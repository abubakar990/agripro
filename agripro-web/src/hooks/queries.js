import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch organizations for the user
export const useOrganizations = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*, organization_members(*)');
      if (error) throw error;
      return data || [];
    }
  });
};

// Generic hook to fetch module data for given farms
export const useFarmModuleData = (table, farmIds, options = {}) => {
  const { orderBy = 'id', ascending = false, limit = null, select = '*' } = options;
  
  return useQuery({
    queryKey: [table, farmIds],
    queryFn: async () => {
      let query = supabase.from(table).select(select).in('farm_id', farmIds).order(orderBy, { ascending });
      if (limit) query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!farmIds && farmIds.length > 0
  });
};

// Hooks for specific modules
export const useFarms = (orgId) => {
  return useQuery({
    queryKey: ['farms', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('farms').select('*').eq('org_id', orgId).order('id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });
};

export const useRevenue = (farmIds) => useFarmModuleData('revenue', farmIds, { orderBy: 'date' });
export const useExpenses = (farmIds) => useFarmModuleData('expenses', farmIds, { orderBy: 'date' });
export const useInventory = (farmIds) => useFarmModuleData('inventory', farmIds, { orderBy: 'id' });
export const useWorkers = (farmIds) => useFarmModuleData('workers', farmIds, { orderBy: 'id' });
export const useMachinery = (farmIds) => useFarmModuleData('machinery', farmIds, { orderBy: 'id' });
export const useLivestock = (farmIds) => useFarmModuleData('livestock', farmIds, { orderBy: 'id' });
export const useCreditEntries = (farmIds) => useFarmModuleData('credit_entries', farmIds, { select: '*, payments:credit_payments(*)', orderBy: 'date' });
export const useLoans = (farmIds) => useFarmModuleData('loans', farmIds, { select: '*, payments:loan_payments(*)', orderBy: 'date' });
export const useFarmPlots = (farmIds) => useFarmModuleData('farm_plots', farmIds, { orderBy: 'name', ascending: true });
export const useCropCycles = (farmIds) => useFarmModuleData('crop_cycles', farmIds, { orderBy: 'sowing_date' });
export const useIrrigationLog = (farmIds) => useFarmModuleData('irrigation_log', farmIds, { orderBy: 'date', limit: 500 });
export const useSprayLog = (farmIds) => useFarmModuleData('spray_log', farmIds, { orderBy: 'date', limit: 500 });
export const useAttendance = (farmIds) => useFarmModuleData('attendance', farmIds, { orderBy: 'date', limit: 1000 });
export const useAnimalHealth = (farmIds) => useFarmModuleData('animal_health', farmIds, { orderBy: 'date' });
export const useAcrePresets = (orgId) => {
  return useQuery({
    queryKey: ['acre_presets', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('acre_presets').select('*').or(`org_id.eq.${orgId},org_id.is.null`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });
};
export const useMachineUsage = (farmIds) => useFarmModuleData('machine_usage', farmIds, { orderBy: 'date', limit: 500 });

// Global data hooks
export const useMandiPrices = () => {
  return useQuery({
    queryKey: ['mandi_prices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mandi_prices').select('*').order('date', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    }
  });
};

export const useVendorsBuyers = (orgId) => {
  return useQuery({
    queryKey: ['vendors_buyers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors_buyers').select('*').eq('org_id', orgId).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });
};

export const useCategories = (orgId) => {
  return useQuery({
    queryKey: ['categories', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').or(`org_id.eq.${orgId},user_id.is.null`).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });
};
