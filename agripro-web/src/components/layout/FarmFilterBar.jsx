import React from 'react';
import { IconCalendar } from '@tabler/icons-react';

const FarmFilterBar = ({ farms, farmFilter, setFarmFilter, dateRange, setDateRange, customRange, setCustomRange }) => {
  const dateOptions = [
    { id: 'all', label: 'All Time' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '3 Months' },
    { id: '1y', label: '1 Year' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
        <button
          onClick={() => setFarmFilter('all')}
          className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all border whitespace-nowrap ${
            farmFilter === 'all'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-bg'
          }`}
        >
          🌾 All Farms
        </button>
        {farms.map(farm => (
          <button
            key={farm.id}
            onClick={() => setFarmFilter(farm.id)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all border whitespace-nowrap ${
              Number(farmFilter) === farm.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-text-secondary border-border hover:bg-bg'
            }`}
          >
            🏡 {farm.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center lg:justify-end gap-2 lg:flex-1">
        <div className="flex items-center gap-1 bg-white p-1 h-[42px] rounded-full border border-border shadow-sm">
          <div className="pl-3 pr-2 text-text-muted border-r border-border mr-1 h-4 flex items-center">
            <IconCalendar size={14} />
          </div>
          {dateOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setDateRange(option.id)}
              className={`px-3 h-full rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                dateRange === option.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-bg'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-white px-4 h-[42px] rounded-full border border-border animate-in fade-in slide-in-from-left-2 duration-200 shadow-sm">
            <input 
              type="date" 
              className="bg-transparent border-none text-[11px] font-bold outline-none text-text-primary h-full"
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
            />
            <span className="text-[10px] text-text-muted font-bold">TO</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-[11px] font-bold outline-none text-text-primary h-full"
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmFilterBar;
