import { useState, useMemo } from 'react';

export const useDateFilter = () => {
  const [dateRange, setDateRange] = useState('all'); // '7d', '30d', '90d', '1y', 'all'
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

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
      // Look for common date fields
      const dateStr = item.date || item.created_at || item.sowing_date || item.dob;
      if (!dateStr) return true; // If no date, include it? Or exclude? Usually assets stay.
      
      const itemDate = new Date(dateStr);
      return itemDate >= startDate;
    });
  };

  return {
    dateRange,
    setDateRange,
    customRange,
    setCustomRange,
    filterByDate
  };
};
