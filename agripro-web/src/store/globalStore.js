import { create } from 'zustand';

export const useGlobalStore = create((set) => ({
  farmFilter: 'all',
  setFarmFilter: (filter) => set({ farmFilter: filter }),
  
  dateRange: '30d',
  setDateRange: (range) => set({ dateRange: range }),
  
  customRange: { start: '', end: '' },
  setCustomRange: (range) => set({ customRange: range }),

  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}));
