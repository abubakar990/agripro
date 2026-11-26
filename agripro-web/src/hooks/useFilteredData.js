import { useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { applyFilters, filterByFarm } from '../utils/dataFilters';

/**
 * Farm + date filtered view of a dataset. Use for *period* data — rows that describe
 * something that happened on a date (revenue, expenses, attendance, irrigation, spray,
 * machine usage, crop cycles).
 */
export const useFilteredData = (dataArray) => {
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const dateRange = useGlobalStore(state => state.dateRange);
  const customRange = useGlobalStore(state => state.customRange);

  return useMemo(
    () => applyFilters(dataArray, { farmFilter, dateRange, customRange }),
    [dataArray, farmFilter, dateRange, customRange]
  );
};

/**
 * Farm-only filtered view of a dataset — deliberately ignores the date range.
 *
 * Use for *point-in-time* data: things you own or owe right now (inventory, machinery,
 * livestock, workers, and the outstanding balances on credit entries and loans). Applying
 * the date range to these hides assets and understates receivables/payables, because most
 * of these tables have no `date` column and fall back to `created_at`.
 *
 * Pass key='id' to filter the farms table itself rather than rows that reference it.
 */
export const useFarmFilteredData = (dataArray, key = 'farm_id') => {
  const farmFilter = useGlobalStore(state => state.farmFilter);

  return useMemo(() => filterByFarm(dataArray, farmFilter, key), [dataArray, farmFilter, key]);
};
