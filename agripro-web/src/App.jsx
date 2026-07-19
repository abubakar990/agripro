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
import FarmMap from './components/modules/FarmMap';
import SprayLog from './components/modules/SprayLog';
import MandiPrices from './components/modules/MandiPrices';
import VendorsBuyers from './components/modules/VendorsBuyers';
import Reports from './components/modules/Reports';
import Billing from './components/modules/settings/Billing';
import TeamSettings from './components/modules/settings/TeamSettings';
import AdminPanel from './components/modules/settings/AdminPanel';
import OrgSettings from './components/modules/settings/OrgSettings';
import LandingPage from './components/landing/LandingPage';
import { useFarmFilter } from './hooks/useFarmFilter';
import { useDateFilter } from './hooks/useDateFilter';
import { useSupabaseData } from './hooks/useSupabaseData';
import { IconPlant } from '@tabler/icons-react';

function App() {
  const [session, setSession] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(localStorage.getItem('agripro_current_org_id'));

  useEffect(() => {
    // Close mobile sidebar on route change
    setIsMobileSidebarOpen(false);
  }, []);

  useEffect(() => {
    console.log('App: Fetching session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('App: Session received:', session ? 'User logged in' : 'No session');
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('App: Auth state changed:', _event);
      setSession(prevSession => {
        // Only update if the session ID has actually changed
        if (prevSession?.access_token !== newSession?.access_token) {
          return newSession;
        }
        return prevSession;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const { 
    organizations = [],
    currentOrg = null,
    farms = [], 
    revenue = [], 
    expenses = [], 
    machinery = [], 
    machineUsage = [],
    livestock = [], 
    animalHealth = [],
    workers = [], 
    inventory = [], 
    creditEntries = [], 
    loans = [], 
    attendance = [], 
    cropCycles = [], 
    farmPlots = [],
    mandiPrices = [], 
    irrigationLog = [], 
    sprayLog = [], 
    vendorsBuyers = [],
    categories = [],
    acrePresets = [],
    isSystemAdmin = false,
    loading,
    refetch
  } = useSupabaseData(session, currentOrgId);

  const handleOrgSwitch = (orgId) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('agripro_current_org_id', orgId);
  };

  const { farmFilter, setFarmFilter, filteredData, currentFarmName } = useFarmFilter(farms);
  const { dateRange, setDateRange, customRange, setCustomRange, filterByDate } = useDateFilter();

  console.log('App: Render state:', { hasSession: !!session, loading, farmsCount: farms.length, categoriesCount: categories.length, currentOrg: currentOrg?.name });

  if (!session) {
    if (showAuth) {
      return (
        <div className="relative">
          <button 
            onClick={() => setShowAuth(false)}
            className="absolute top-8 left-8 text-primary font-bold flex items-center gap-2 hover:underline z-50"
          >
            <IconPlant size={20} />
            Back to Home
          </button>
          <Auth />
        </div>
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  try {
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
    const filteredFarmPlots = filteredData(farmPlots);
    const filteredIrrigationLog = applyFilters(irrigationLog);
    const filteredSprayLog = applyFilters(sprayLog);
    const filteredMandiPrices = applyFilters(mandiPrices);
    const filteredVendorsBuyers = filteredData(vendorsBuyers);
    const filteredMachineUsage = applyFilters(machineUsage);

    return (
      <Router>
        <div className="flex min-h-screen bg-bg relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-[100] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <div className={`
            fixed inset-y-0 left-0 z-[101] lg:relative lg:z-0
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            transition-transform duration-300 ease-in-out
          `}>
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              setIsCollapsed={setIsSidebarCollapsed} 
              creditEntries={creditEntries}
              organizations={organizations}
              currentOrg={currentOrg}
              user={session.user}
              isSystemAdmin={isSystemAdmin}
              onClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
          
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            <Header 
              farms={farms} 
              farmFilter={farmFilter} 
              setFarmFilter={setFarmFilter} 
              currentFarmName={currentFarmName} 
              user={session.user}
              organizations={organizations}
              currentOrg={currentOrg}
              onOrgSwitch={handleOrgSwitch}
              toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />
            
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
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
                    farmPlots={filteredFarmPlots}
                    cropCycles={filteredCropCycles}
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
                    farmPlots={filteredFarmPlots}
                    cropCycles={filteredCropCycles}
                    categories={categories.filter(c => c.module === 'revenue')} 
                    user={session.user}
                  />
                } />
                <Route path="/farms" element={
                  <Farms farms={farms} currentOrg={currentOrg} farmPlots={filteredFarmPlots} />
                } />
                <Route path="/farm-map/:farmId" element={
                  <FarmMap farms={farms} farmPlots={filteredFarmPlots} cropCycles={filteredCropCycles} expenses={filteredExpenses} revenue={filteredRevenue} acrePresets={acrePresets} />
                } />
                <Route path="/billing" element={
                  <Billing currentOrg={currentOrg} refetch={refetch} />
                } />
                <Route path="/settings" element={
                  <OrgSettings currentOrg={currentOrg} user={session.user} refetch={refetch} />
                } />
                <Route path="/team" element={
                  <TeamSettings currentOrg={currentOrg} user={session.user} farms={farms} />
                } />
                {isSystemAdmin && (
                  <Route path="/admin" element={<AdminPanel />} />
                )}
                <Route path="/expenses" element={
                  <Expenses 
                    expenses={filteredExpenses} 
                    farms={farms} 
                    farmPlots={filteredFarmPlots}
                    cropCycles={filteredCropCycles}
                    categories={categories.filter(c => c.module === 'expense')} 
                    user={session.user}
                  />
                } />
                <Route path="/credit" element={
                  <CreditLedger creditEntries={filteredCreditEntries} farms={farms} />
                } />
                <Route path="/loans" element={
                  <Loans loans={filteredLoans} farms={farms} />
                } />
                <Route path="/crop-cycles" element={
                  <CropCycles cropCycles={filteredCropCycles} farms={farms} farmPlots={filteredFarmPlots} />
                } />
                <Route path="/irrigation" element={
                  <Irrigation irrigationLog={filteredIrrigationLog} farms={farms} farmPlots={filteredFarmPlots} cropCycles={filteredCropCycles} />
                } />
                <Route path="/spray" element={
                  <SprayLog sprayLog={filteredSprayLog} farms={farms} farmPlots={filteredFarmPlots} cropCycles={filteredCropCycles} />
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
                    user={session.user}
                  />
                } />
                <Route path="/machinery" element={
                  <Machinery 
                    machinery={filteredMachinery} 
                    machineUsage={filteredMachineUsage} 
                    farms={farms} 
                    farmPlots={filteredFarmPlots}
                    cropCycles={filteredCropCycles}
                    categories={categories.filter(c => c.module === 'machinery')} 
                    user={session.user}
                  />
                } />
                <Route path="/livestock" element={
                  <Livestock 
                    livestock={filteredLivestock} 
                    animalHealth={animalHealth} 
                    farms={farms} 
                    categories={categories.filter(c => c.module === 'livestock')} 
                    user={session.user}
                  />
                } />                <Route path="/parties" element={
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
  } catch (err) {
    console.error('App: Rendering error:', err);
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
        <p className="text-gray-600">{err.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Reload Page
        </button>
      </div>
    );
  }
}

export default App;
