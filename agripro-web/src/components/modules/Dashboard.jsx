import React, { useMemo } from 'react';
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconScale, 
  IconCreditCard, 
  IconBuildingBank, 
  IconEngine, 
  IconUsers, 
  IconMilk 
} from '@tabler/icons-react';
import { formatPKR } from '../../utils/format';
import Badge from '../shared/Badge';

const KpiCard = ({ title, value, icon: Icon, colorClass, trend }) => (
  <div className={`agri-card p-5 border-l-4 ${colorClass}`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</span>
      <Icon size={20} className={colorClass.replace('border-', 'text-')} />
    </div>
    <div className="flex flex-col">
      <span className="text-lg font-bold text-text-primary">{value}</span>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <IconTrendingUp size={14} className="text-revenue" />
          <span className="text-[10px] font-bold text-revenue">{trend}</span>
        </div>
      )}
    </div>
  </div>
);

const Dashboard = ({ revenue, expenses, farms, workers, machinery, livestock, creditEntries, loans, inventory, attendance = [] }) => {
  const stats = useMemo(() => {
    const totalRev = revenue.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const totalExp = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const netProfit = totalRev - totalExp;
    
    const creditReceivable = creditEntries.reduce((sum, entry) => {
      const payments = entry.payments?.reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0) || 0;
      return sum + (parseFloat(entry.total_amount) - parseFloat(entry.advance) - payments);
    }, 0);

    const outstandingLoans = loans.reduce((sum, loan) => {
      const payments = loan.payments?.reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0) || 0;
      return sum + (parseFloat(loan.principal) - parseFloat(loan.paid) - payments);
    }, 0);

    const assetValue = machinery.reduce((sum, m) => sum + (parseFloat(m.current_value) || 0), 0) + 
                  livestock.reduce((sum, l) => sum + (parseFloat(l.current_value) || 0), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = (attendance || []).filter(a => a.date === today && a.present).length;
    
    return {
      totalRev,
      totalExp,
      netProfit,
      creditReceivable,
      outstandingLoans,
      assetValue,
      attendance: `${todayAttendance} / ${workers.length}`,
      livestockCount: livestock.length
    };
  }, [revenue, expenses, workers, machinery, livestock, creditEntries, loans, attendance]);

  const recentTransactions = useMemo(() => {
    const all = [
      ...revenue.map(r => ({ ...r, type: 'revenue' })),
      ...expenses.map(e => ({ ...e, type: 'expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    return all.slice(0, 6);
  }, [revenue, expenses]);

  const revenueByCategory = useMemo(() => {
    const categories = {};
    revenue.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + (parseFloat(r.amount) || 0);
    });
    return Object.entries(categories)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [revenue]);

  const expenseByCategory = useMemo(() => {
    const categories = {};
    expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    return Object.entries(categories)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  const alerts = useMemo(() => {
    const list = [];
    
    // Overdue Credit
    const today = new Date();
    const overdueCreditCount = creditEntries.filter(entry => {
      const paymentsTotal = entry.payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
      const balance = (parseFloat(entry.total_amount) || 0) - (parseFloat(entry.advance) || 0) - paymentsTotal;
      return entry.due_date && new Date(entry.due_date) < today && balance > 0;
    }).length;
    if (overdueCreditCount > 0) {
      list.push({
        type: 'credit',
        title: `${overdueCreditCount} overdue credit entries need attention`,
        message: 'Review your credit ledger and send reminders.',
        color: 'red'
      });
    }

    // Low Stock Inventory
    const lowStockCount = inventory.filter(i => parseFloat(i.qty) <= parseFloat(i.reorder_level)).length;
    if (lowStockCount > 0) {
      list.push({
        type: 'inventory',
        title: `${lowStockCount} items are low on stock`,
        message: 'Check inventory and place reorder soon.',
        color: 'amber'
      });
    }

    // Outstanding Loan
    if (stats.outstandingLoans > 100000) {
      list.push({
        type: 'loan',
        title: `Significant outstanding loan debt: ${formatPKR(stats.outstandingLoans)}`,
        message: 'Ensure timely payments to avoid extra interest.',
        color: 'blue'
      });
    }

    return list;
  }, [creditEntries, inventory, stats.outstandingLoans]);

  const alertStyles = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', subtext: 'text-red-600', iconBg: 'bg-red-100', icon: 'text-red-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', subtext: 'text-amber-600', iconBg: 'bg-amber-100', icon: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', subtext: 'text-blue-600', iconBg: 'bg-blue-100', icon: 'text-blue-600' }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatPKR(stats.totalRev)} icon={IconTrendingUp} colorClass="border-revenue" />
        <KpiCard title="Total Expenses" value={formatPKR(stats.totalExp)} icon={IconTrendingDown} colorClass="border-expense" />
        <KpiCard title="Net Profit / Loss" value={formatPKR(stats.netProfit)} icon={IconScale} colorClass={stats.netProfit >= 0 ? "border-accent-blue" : "border-expense"} />
        <KpiCard title="Credit Receivable" value={formatPKR(stats.creditReceivable)} icon={IconCreditCard} colorClass="border-accent-amber" />
        <KpiCard title="Outstanding Loans" value={formatPKR(stats.outstandingLoans)} icon={IconBuildingBank} colorClass="border-expense" />
        <KpiCard title="Total Asset Value" value={formatPKR(stats.assetValue)} icon={IconEngine} colorClass="border-revenue" />
        <KpiCard title="Today's Attendance" value={stats.attendance} icon={IconUsers} colorClass="border-revenue" />
        <KpiCard title="Livestock Count" value={stats.livestockCount} icon={IconMilk} colorClass="border-accent-amber" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => {
            const style = alertStyles[alert.color];
            return (
              <div key={idx} className={`${style.bg} ${style.border} border rounded-md p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center ${style.icon}`}>
                    {alert.type === 'credit' ? <IconCreditCard size={18} /> : 
                     alert.type === 'inventory' ? <IconEngine size={18} /> : 
                     <IconBuildingBank size={18} />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${style.text}`}>{alert.title}</h4>
                    <p className={`text-xs ${style.subtext}`}>{alert.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="agri-card p-6">
          <h3 className="text-sm font-bold text-text-primary mb-6">Revenue by Category</h3>
          <div className="space-y-4">
            {revenueByCategory.length > 0 ? revenueByCategory.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-text-muted">{formatPKR(item.amount)}</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-revenue" style={{ width: `${(item.amount / revenueByCategory[0].amount) * 100}%` }}></div>
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-muted text-center py-8">No revenue data available.</p>
            )}
          </div>
        </div>

        <div className="agri-card p-6">
          <h3 className="text-sm font-bold text-text-primary mb-6">Expense by Category</h3>
          <div className="space-y-4">
            {expenseByCategory.length > 0 ? expenseByCategory.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-text-muted">{formatPKR(item.amount)}</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-expense" style={{ width: `${(item.amount / expenseByCategory[0].amount) * 100}%` }}></div>
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-muted text-center py-8">No expense data available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="agri-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-bold text-text-primary">Recent Transactions</h3>
          <button className="text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Party</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx, idx) => (
                <tr key={idx} className="agri-table-row">
                  <td className="px-6 py-3 whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-3">
                    <Badge variant={tx.type === 'revenue' ? 'success' : 'danger'}>
                      {tx.type.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">{tx.category}</td>
                  <td className="px-6 py-3 font-bold">{tx.party}</td>
                  <td className={`px-6 py-3 text-right font-bold ${tx.type === 'revenue' ? 'text-revenue' : 'text-expense'}`}>
                    {formatPKR(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
