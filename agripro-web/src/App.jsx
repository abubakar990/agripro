import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import FarmFilterBar from './components/layout/FarmFilterBar';
import Auth from './components/modules/Auth';
import Dashboard from './components/modules/Dashboard';
import Revenue from './components/modules/Revenue';
import Expenses from './components/modules/Expenses';
import CreditLedger from './components/modules/CreditLedger';
import Loans from './components/modules/Loans';
import Labor from './components/modules/Labor';
import Inventory from './components/modules/Inventory';
import Machinery from './components/modules/Machinery';
import Livestock from './components/modules/Livestock';
import CropCycles from './components/modules/CropCycles';
import Irrigation from './components/modules/Irrigation';
import Farms from './components/modules/Farms';
import SprayLog from './components/modules/SprayLog';
import MandiPrices from './components/modules/MandiPrices';
import VendorsBuyers from './components/modules/VendorsBuyers';
import Reports from './components/modules/Reports';
import { useFarmFilter } from './hooks/useFarmFilter';
import { useDateFilter } from './hooks/useDateFilter';
import { useSupabaseData } from './hooks/useSupabaseData';
import { IconPlant } from '@tabler/icons-react';

function App() {
  const [session, setSession] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { 
    farms, 
    revenue, 
    expenses, 
    machinery, 
    machineUsage,
    livestock, 
    animalHealth,
    workers, 
    inventory, 
    creditEntries, 
    loans, 
    attendance, 
    cropCycles, 
    mandiPrices, 
    irrigationLog, 
    sprayLog, 
    vendorsBuyers,
    categories,
    loading 
  } = useSupabaseData(session);

  const { farmFilter, setFarmFilter, filteredData, currentFarmName } = useFarmFilter(farms);
  const { dateRange, setDateRange, customRange, setCustomRange, filterByDate } = useDateFilter();

  const applyFilters = (data) => {
    return filterByDate(filteredData(data));
  };

  const filteredRevenue = applyFilters(revenue);
  const filteredExpenses = applyFilters(expenses);
  const filteredMachinery = filteredData(machinery);
  const filteredLivestock = filteredData(livestock);
  const filteredWorkers = filteredData(workers);
  const filteredInventory = filteredData(inventory);
  const filteredCreditEntries = applyFilters(creditEntries);
  const filteredLoans = applyFilters(loans);
  const filteredAttendance = applyFilters(attendance);
  const filteredCropCycles = applyFilters(cropCycles);
  const filteredIrrigationLog = applyFilters(irrigationLog);
  const filteredSprayLog = applyFilters(sprayLog);
  const filteredMandiPrices = applyFilters(mandiPrices);
  const filteredVendorsBuyers = filteredData(vendorsBuyers);
  const filteredMachineUsage = applyFilters(machineUsage);

  if (!session) {
    return <Auth />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-bg">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
          creditEntries={creditEntries}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            farms={farms} 
            farmFilter={farmFilter} 
            setFarmFilter={setFarmFilter} 
            currentFarmName={currentFarmName} 
            user={session.user}
          />
          
          <main className="flex-1 p-6 overflow-y-auto">
            <FarmFilterBar 
              farms={farms} 
              farmFilter={farmFilter} 
              setFarmFilter={setFarmFilter}
              dateRange={dateRange}
              setDateRange={setDateRange}
              customRange={customRange}
              setCustomRange={setCustomRange}
            />
            
            <Routes>
              <Route path="/" element={
                <Dashboard 
                  revenue={filteredRevenue}
                  expenses={filteredExpenses}
                  farms={farms}
                  workers={filteredWorkers}
                  machinery={filteredMachinery}
                  livestock={filteredLivestock}
                  creditEntries={filteredCreditEntries}
                  loans={filteredLoans}
                  inventory={filteredInventory}
                  attendance={filteredAttendance}
                />
              } />
              <Route path="/revenue" element={
                <Revenue 
                  revenue={filteredRevenue} 
                  farms={farms} 
                  categories={categories.filter(c => c.module === 'revenue')} 
                />
              } />
              <Route path="/farms" element={
                <Farms farms={farms} />
              } />
              <Route path="/expenses" element={
                <Expenses 
                  expenses={filteredExpenses} 
                  farms={farms} 
                  categories={categories.filter(c => c.module === 'expense')} 
                />
              } />
              <Route path="/credit" element={
                <CreditLedger creditEntries={filteredCreditEntries} farms={farms} />
              } />
              <Route path="/loans" element={
                <Loans loans={filteredLoans} farms={farms} />
              } />
              <Route path="/crop-cycles" element={
                <CropCycles cropCycles={filteredCropCycles} farms={farms} />
              } />
              <Route path="/irrigation" element={
                <Irrigation irrigationLog={filteredIrrigationLog} farms={farms} />
              } />
              <Route path="/spray" element={
                <SprayLog sprayLog={filteredSprayLog} farms={farms} />
              } />
              <Route path="/mandi" element={
                <MandiPrices mandiPrices={filteredMandiPrices} />
              } />
              <Route path="/labor" element={
                <Labor workers={filteredWorkers} attendance={filteredAttendance} farms={farms} />
              } />
              <Route path="/inventory" element={
                <Inventory 
                  inventory={filteredInventory} 
                  farms={farms} 
                  categories={categories.filter(c => c.module === 'inventory')} 
                />
              } />
              <Route path="/machinery" element={
                <Machinery 
                  machinery={filteredMachinery} 
                  machineUsage={filteredMachineUsage} 
                  farms={farms} 
                  categories={categories.filter(c => c.module === 'machinery')} 
                />
              } />
              <Route path="/livestock" element={
                <Livestock 
                  livestock={filteredLivestock} 
                  animalHealth={animalHealth} 
                  farms={farms} 
                  categories={categories.filter(c => c.module === 'livestock')} 
                />
              } />
              <Route path="/parties" element={
                <VendorsBuyers vendorsBuyers={filteredVendorsBuyers} />
              } />
              <Route path="/reports" element={
                <Reports 
                  revenue={filteredRevenue}
                  expenses={filteredExpenses}
                  farms={farms}
                  machinery={filteredMachinery}
                  livestock={filteredLivestock}
                  inventory={filteredInventory}
                  creditEntries={filteredCreditEntries}
                  loans={filteredLoans}
                />
              } />
              <Route path="*" element={
                <div className="agri-card p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center text-primary mb-4">
                    <IconPlant size={32} />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary mb-2">Module Not Found</h2>
                  <p className="text-sm text-text-muted max-w-xs">
                    The requested page could not be found.
                  </p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
