import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  IconLayoutDashboard, 
  IconCash, 
  IconCreditCard, 
  IconUsers, 
  IconBuildingStore, 
  IconTractor, 
  IconBox, 
  IconCalendarEvent, 
  IconDroplet, 
  IconSpray, 
  IconReportMoney,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconReceipt2,
  IconManualGearbox,
  IconMilk,
  IconSettings,
  IconBuildingCommunity
} from '@tabler/icons-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, creditEntries = [] }) => {
  const overdueCount = React.useMemo(() => {
    const today = new Date();
    return creditEntries.filter(entry => {
      const paymentsTotal = entry.payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
      const balance = (parseFloat(entry.total_amount) || 0) - (parseFloat(entry.advance) || 0) - paymentsTotal;
      return entry.due_date && new Date(entry.due_date) < today && balance > 0;
    }).length;
  }, [creditEntries]);

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/', icon: IconLayoutDashboard },
      ]
    },
    {
      title: 'FINANCIALS',
      items: [
        { name: 'Revenue', path: '/revenue', icon: IconCash },
        { name: 'Expenses', path: '/expenses', icon: IconReceipt2 },
        { name: 'Credit Ledger', path: '/credit', icon: IconCreditCard, badge: overdueCount > 0 ? overdueCount : null },
        { name: 'Loans', path: '/loans', icon: IconReportMoney },
      ]
    },
    {
      title: 'FARM OPS',
      items: [
        { name: 'Crop Cycles', path: '/crop-cycles', icon: IconCalendarEvent },
        { name: 'Irrigation Log', path: '/irrigation', icon: IconDroplet },
        { name: 'Spray Log', path: '/spray', icon: IconSpray },
        { name: 'Mandi Prices', path: '/mandi', icon: IconManualGearbox },
      ]
    },
    {
      title: 'PEOPLE',
      items: [
        { name: 'Labor & Payroll', path: '/labor', icon: IconUsers },
      ]
    },
    {
      title: 'ASSETS',
      items: [
        { name: 'Inventory', path: '/inventory', icon: IconBox },
        { name: 'Machinery', path: '/machinery', icon: IconTractor },
        { name: 'Livestock', path: '/livestock', icon: IconMilk },
      ]
    },
    {
      title: 'PARTIES',
      items: [
        { name: 'Vendors & Buyers', path: '/parties', icon: IconBuildingStore },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { name: 'Financial Reports', path: '/reports', icon: IconChartBar },
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { name: 'Manage Farms', path: '/farms', icon: IconBuildingCommunity },
      ]
    }
  ];

  return (
    <div 
      className={`bg-primary h-screen sticky top-0 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-[60px]' : 'w-[230px]'}`}
    >
      <div className="h-[58px] flex items-center justify-between px-4 border-b border-white border-opacity-10">
        {!isCollapsed && <span className="text-white font-bold text-xl tracking-tight">AgriPro</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-white hover:bg-opacity-10 rounded-md p-2"
        >
          {isCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-6 text-[10px] font-bold text-white text-opacity-40 uppercase tracking-[1px] mb-2">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-white bg-opacity-20 text-white' 
                        : 'text-white text-opacity-70 hover:bg-white hover:bg-opacity-10 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} stroke={1.5} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-[13px]">{item.name}</span>
                      {item.badge && (
                        <span className="bg-expense text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-white border-opacity-10">
        {!isCollapsed && (
          <div className="text-white text-opacity-40 text-[10px] font-bold text-center">
            v4.0 | May 2026
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
