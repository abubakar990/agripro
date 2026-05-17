import { useState, useMemo } from 'react';

export const useFarmFilter = (initialFarms) => {
  const [farmFilter, setFarmFilter] = useState('all');

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
