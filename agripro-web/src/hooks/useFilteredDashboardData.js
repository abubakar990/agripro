import { useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';
import {
  useFarms, useRevenue, useExpenses, useWorkers, useMachinery,
  useLivestock, useCreditEntries, useLoans, useInventory
} from './queries';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { applyFilters, filterByFarm } from '../utils/dataFilters';

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

  const isLoading = loadingFarms || loadingRev || loadingExp || loadingWorkers ||
                    loadingMachinery || loadingLivestock || loadingCredit ||
                    loadingLoans || loadingInventory || loadingAttendance;

  return useMemo(() => {
    const filters = { farmFilter, dateRange, customRange };
    // Period data: narrowed by both farm and date.
    const period = (data) => applyFilters(data, filters);
    // Point-in-time data (assets you own, balances you are owed / owe): farm only.
    // Date-filtering these hid assets and understated receivables — see utils/dataFilters.
    const pointInTime = (data) => filterByFarm(data, farmFilter);

    return {
      // The farms table keys on `id`, not `farm_id`.
      farms: filterByFarm(farms, farmFilter, 'id'),
      revenue: period(revenue),
      // Cash in hand is a running balance, so it needs every date, not just the selected period.
      allRevenue: pointInTime(revenue),
      allExpenses: pointInTime(expenses),
      expenses: period(expenses),
      attendance: period(attendance),
      machinery: pointInTime(machinery),
      livestock: pointInTime(livestock),
      workers: pointInTime(workers),
      inventory: pointInTime(inventory),
      creditEntries: pointInTime(creditEntries),
      loans: pointInTime(loans),
      isLoading
    };
  }, [farms, revenue, expenses, machinery, livestock, workers, inventory, creditEntries, loans, attendance, farmFilter, dateRange, customRange, isLoading]);
};
