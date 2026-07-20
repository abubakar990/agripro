import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import FarmFilterBar from './components/layout/FarmFilterBar';
import LandingPage from './components/landing/LandingPage';
import Auth from './components/modules/Auth';
import ToastContainer from './components/shared/ToastContainer';
import ConfirmContainer from './components/shared/ConfirmContainer';
import { useFarmFilter } from './hooks/useFarmFilter';
import { useDateFilter } from './hooks/useDateFilter';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useFarms, useCreditEntries } from './hooks/queries';
import { IconPlant } from '@tabler/icons-react';

const Dashboard = React.lazy(() => import('./components/modules/Dashboard'));
const Revenue = React.lazy(() => import('./components/modules/Revenue'));
const Expenses = React.lazy(() => import('./components/modules/Expenses'));
const CreditLedger = React.lazy(() => import('./components/modules/CreditLedger'));
const Loans = React.lazy(() => import('./components/modules/Loans'));
const Labor = React.lazy(() => import('./components/modules/Labor'));
const Inventory = React.lazy(() => import('./components/modules/Inventory'));
const Machinery = React.lazy(() => import('./components/modules/Machinery'));
const Livestock = React.lazy(() => import('./components/modules/Livestock'));
const CropCycles = React.lazy(() => import('./components/modules/CropCycles'));
const Irrigation = React.lazy(() => import('./components/modules/Irrigation'));
const Farms = React.lazy(() => import('./components/modules/Farms'));
const FarmMap = React.lazy(() => import('./components/modules/FarmMap'));
const SprayLog = React.lazy(() => import('./components/modules/SprayLog'));
const MandiPrices = React.lazy(() => import('./components/modules/MandiPrices'));
const VendorsBuyers = React.lazy(() => import('./components/modules/VendorsBuyers'));
const Reports = React.lazy(() => import('./components/modules/Reports'));
const Billing = React.lazy(() => import('./components/modules/settings/Billing'));
const TeamSettings = React.lazy(() => import('./components/modules/settings/TeamSettings'));
const AdminPanel = React.lazy(() => import('./components/modules/settings/AdminPanel'));
const OrgSettings = React.lazy(() => import('./components/modules/settings/OrgSettings'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('App ErrorBoundary caught:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-bg p-10 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6 max-w-md">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [session, setSession] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(localStorage.getItem('agripro_current_org_id'));

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(prevSession => {
        if (prevSession?.access_token !== newSession?.access_token) {
          return newSession;
        }
        return prevSession;
      });
      setIsSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { 
    organizations = [],
    currentOrg = null,
    farms: legacyFarms = [], 
    creditEntries: legacyCredit = [], 
    isSystemAdmin = false,
    loading,
    refetch: globalRefetch
  } = useSupabaseData(session, currentOrgId);

  const { data: rqFarms } = useFarms(currentOrg?.id || currentOrgId);
  const farms = rqFarms || legacyFarms;
  const farmIds = farms.map(f => f.id);
  const { data: rqCredit } = useCreditEntries(farmIds);
  const creditEntries = rqCredit || legacyCredit;

  const handleOrgSwitch = (orgId) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('agripro_current_org_id', orgId);
  };

  const { farmFilter, setFarmFilter, filteredData, currentFarmName } = useFarmFilter(farms);
  const { dateRange, setDateRange, customRange, setCustomRange, filterByDate } = useDateFilter();

  if (isSessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  return (
    <ErrorBoundary>
      <ToastContainer />
      <ConfirmContainer />
      <Router>
        <div className="flex min-h-screen bg-bg relative">
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
              
              <Suspense fallback={
                <div className="flex h-64 w-full items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/revenue" element={<Revenue user={session.user} />} />
                  <Route path="/farms" element={<Farms currentOrg={currentOrg} />} />
                  <Route path="/farm-map/:farmId" element={<FarmMap />} />
                  <Route path="/billing" element={<Billing currentOrg={currentOrg} refetch={globalRefetch} />} />
                  <Route path="/settings" element={<OrgSettings currentOrg={currentOrg} user={session.user} refetch={globalRefetch} />} />
                  <Route path="/team" element={<TeamSettings currentOrg={currentOrg} user={session.user} farms={farms} />} />
                  {isSystemAdmin && <Route path="/admin" element={<AdminPanel />} />}
                  <Route path="/expenses" element={<Expenses user={session.user} />} />
                  <Route path="/credit" element={<CreditLedger />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/crop-cycles" element={<CropCycles />} />
                  <Route path="/irrigation" element={<Irrigation />} />
                  <Route path="/spray" element={<SprayLog />} />
                  <Route path="/mandi" element={<MandiPrices />} />
                  <Route path="/labor" element={<Labor />} />
                  <Route path="/inventory" element={<Inventory user={session.user} />} />
                  <Route path="/machinery" element={<Machinery user={session.user} />} />
                  <Route path="/livestock" element={<Livestock user={session.user} />} />
                  <Route path="/parties" element={<VendorsBuyers />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="*" element={
                    <div className="agri-card p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center text-primary mb-4">
                        <IconPlant size={32} />
                      </div>
                      <h2 className="text-lg font-bold text-text-primary mb-2">Module Not Found</h2>
                      <p className="text-sm text-text-muted max-w-xs">The requested page could not be found.</p>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
