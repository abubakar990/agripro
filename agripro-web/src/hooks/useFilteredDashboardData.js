import { useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { useDateFilter } from './useDateFilter';
import { useFarmFilter } from './useFarmFilter';
import { 
  useFarms, useRevenue, useExpenses, useWorkers, useMachinery, 
  useLivestock, useCreditEntries, useLoans, useInventory
} from './queries';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export const useFilteredDashboardData = () => {
  // Global State Context
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  
  // React Query Hooks (Fetch all required data for dashboard)
  const { data: farms = [], isLoading: loadingFarms } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: revenue = [], isLoading: loadingRev } = useRevenue(farmIds);
  const { data: expenses = [], isLoading: loadingExp } = useExpenses(farmIds);
  const { data: workers = [], isLoading: loadingWorkers } = useWorkers(farmIds);
  const { data: machinery = [], isLoading: loadingMachinery } = useMachinery(farmIds);
  const { data: livestock = [], isLoading: loadingLivestock } = useLivestock(farmIds);
  const { data: creditEntries = [], isLoading: loadingCredit } = useCreditEntries(farmIds);
  const { data: loans = [], isLoading: loadingLoans } = useLoans(farmIds);
  const { data: inventory = [], isLoading: loadingInventory } = useInventory(farmIds);
  
  // Custom fetch for attendance (limited logic)
  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance', farmIds],
    queryFn: async () => {
      const { data } = await supabase.from('attendance').select('*').in('farm_id', farmIds).order('date', { ascending: false }).limit(1000);
      return data || [];
    },
    enabled: farmIds.length > 0
  });

  // Filter instances (Assuming we refactored these to use Zustand, but we can manually use Zustand here)
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const dateRange = useGlobalStore(state => state.dateRange);
  const customRange = useGlobalStore(state => state.customRange);

  // Manual filter logic mirroring App.jsx
  const filterByFarm = (data) => {
    if (farmFilter === 'all') return data;
    return data.filter(item => item.farm_id === Number(farmFilter));
  };

  const filterByDate = (data) => {
    if (dateRange === 'all') return data;
    const now = new Date();
    let startDate = new Date();

    if (dateRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
    else if (dateRange === '90d') startDate.setDate(now.getDate() - 90);
    else if (dateRange === '1y') startDate.setFullYear(now.getFullYear() - 1);
    else if (dateRange === 'custom' && customRange.start && customRange.end) {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return data.filter(item => {
        const itemDate = new Date(item.date || item.created_at || item.sowing_date);
        return itemDate >= start && itemDate <= end;
      });
    }

    return data.filter(item => {
      const dateStr = item.date || item.created_at || item.sowing_date || item.dob;
      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      return itemDate >= startDate;
    });
  };

  const applyFilters = (data) => filterByDate(filterByFarm(data));

  const isLoading = loadingFarms || loadingRev || loadingExp || loadingWorkers || 
                    loadingMachinery || loadingLivestock || loadingCredit || 
                    loadingLoans || loadingInventory || loadingAttendance;

  return {
    farms,
    revenue: applyFilters(revenue),
    expenses: applyFilters(expenses),
    machinery: filterByFarm(machinery),
    livestock: filterByFarm(livestock),
    workers: filterByFarm(workers),
    inventory: filterByFarm(inventory),
    creditEntries: applyFilters(creditEntries),
    loans: applyFilters(loans),
    attendance: applyFilters(attendance),
    isLoading
  };
};
