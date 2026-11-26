import { useCallback } from 'react';
import { useGlobalStore } from '../store/globalStore';
import { filterByDate } from '../utils/dataFilters';

export const useDateFilter = () => {
  const dateRange = useGlobalStore(state => state.dateRange);
  const setDateRange = useGlobalStore(state => state.setDateRange);
  const customRange = useGlobalStore(state => state.customRange);
  const setCustomRange = useGlobalStore(state => state.setCustomRange);

  const filterByDateRange = useCallback(
    (data) => filterByDate(data, dateRange, customRange),
    [dateRange, customRange]
  );

  return {
    dateRange,
    setDateRange,
    customRange,
    setCustomRange,
    filterByDate: filterByDateRange
  };
};
