import { useGlobalStore } from '../store/globalStore';

export const useFilteredData = (dataArray) => {
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const dateRange = useGlobalStore(state => state.dateRange);
  const customRange = useGlobalStore(state => state.customRange);

  if (!dataArray || !Array.isArray(dataArray)) return [];

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
        const dateStr = item.date || item.created_at || item.sowing_date || item.dob;
        if (!dateStr) return true;
        const itemDate = new Date(dateStr);
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

  return filterByDate(filterByFarm(dataArray));
};
