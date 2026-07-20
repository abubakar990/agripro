import { useMemo } from 'react';
import { useGlobalStore } from '../store/globalStore';

export const useFarmFilter = (initialFarms) => {
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const setFarmFilter = useGlobalStore(state => state.setFarmFilter);

  const filteredData = (data) => {
    if (farmFilter === 'all') return data;
    return data.filter(item => item.farm_id === Number(farmFilter));
  };

  const currentFarmName = useMemo(() => {
    if (farmFilter === 'all') return 'All Farms';
    const farm = initialFarms.find(f => f.id === Number(farmFilter));
    return farm ? farm.name : 'Unknown Farm';
  }, [farmFilter, initialFarms]);

  return {
    farmFilter,
    setFarmFilter,
    filteredData,
    currentFarmName
  };
};
