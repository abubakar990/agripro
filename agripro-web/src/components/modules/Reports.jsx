import React, { useState, useMemo } from 'react';
import { IconFileDownload, IconPrinter, IconScale, IconReceipt, IconPackage, IconUsers } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import * as XLSX from 'xlsx';

const Reports = ({ revenue, expenses, farms, machinery, livestock, inventory, creditEntries, loans }) => {
  const [activeTab, setActiveTab] = useState('balance');

  const financialData = useMemo(() => {
    const totalRev = revenue.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    
    const getPaidAmount = (entry) => {
      if (entry.payments && entry.payments.length > 0) {
        return entry.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      }
      return Number(entry.paid) || 0;
    };

    const creditReceivable = creditEntries
      .filter(e => e.type === 'Credit Sale')
      .reduce((sum, e) => sum + (Number(e.total_amount) - getPaidAmount(e)), 0);

    const loansReceivable = loans
      .filter(l => l.type === 'Lent')
      .reduce((sum, l) => sum + (Number(l.principal) - getPaidAmount(l)), 0);

    const creditPayable = creditEntries
      .filter(e => e.type === 'Credit Purchase')
      .reduce((sum, e) => sum + (Number(e.total_amount) - getPaidAmount(e)), 0);

    const loansPayable = loans
      .filter(l => l.type === 'Borrowed')
      .reduce((sum, l) => sum + (Number(l.principal) - getPaidAmount(l)), 0);

    const machineryByCategory = machinery.reduce((acc, m) => {
      const cat = m.type || 'Uncategorized';
      const key = `Machinery - ${cat}`;
      acc[key] = (acc[key] || 0) + Number(m.current_value || 0);
      return acc;
    }, {});

    const livestockByCategory = livestock.reduce((acc, l) => {
      const cat = l.type || 'Uncategorized';
      const key = `Livestock - ${cat}`;
      acc[key] = (acc[key] || 0) + Number(l.current_value || 0);
      return acc;
    }, {});

    const inventoryByCategory = inventory.reduce((acc, i) => {
      const cat = i.category || 'Uncategorized';
      const key = `Inventory - ${cat}`;
      acc[key] = (acc[key] || 0) + Number(i.value || 0);
      return acc;
    }, {});

    const assets = {
      'Land Value': farms.reduce((sum, f) => sum + (Number(f.land_value) || 0), 0),
      ...machineryByCategory,
      ...livestockByCategory,
      ...inventoryByCategory,
      'Estimated Cash / Bank': Math.max(0, totalRev - totalExp),
      'Total Receivables': creditReceivable + loansReceivable,
    };

    const totalMachinery = Object.values(machineryByCategory).reduce((s, v) => s + v, 0);
    const totalLivestock = Object.values(livestockByCategory).reduce((s, v) => s + v, 0);
    const totalInventory = Object.values(inventoryByCategory).reduce((s, v) => s + v, 0);

    const liabilities = {
      loans: loansPayable,
      payable: creditPayable,
    };

    const totalAssets = Object.values(assets).reduce((s, v) => s + v, 0);
    const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + v, 0);
    const netWorth = totalAssets - totalLiabilities;

    // Grouping for P&L
    const revenueByCategory = revenue.reduce((acc, r) => {
      const cat = r.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + Number(r.amount);
      return acc;
    }, {});

    const expensesByCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
      return acc;
    }, {});

    // Detailed lists for Receivables/Payables
    const receivablesList = [
      ...creditEntries.filter(e => e.type === 'Credit Sale').map(e => ({
        id: `c-${e.id}`,
        party: e.party,
        type: 'Credit Sale',
        amount: Number(e.total_amount) - getPaidAmount(e),
        dueDate: e.due_date
      })),
      ...loans.filter(l => l.type === 'Lent').map(l => ({
        id: `l-${l.id}`,
        party: l.party,
        type: 'Loan (Lent)',
        amount: Number(l.principal) - getPaidAmount(l),
        dueDate: l.due_date
      }))
    ].filter(i => i.amount > 0);

    const payablesList = [
      ...creditEntries.filter(e => e.type === 'Credit Purchase').map(e => ({
        id: `c-${e.id}`,
        party: e.party,
        type: 'Credit Purchase',
        amount: Number(e.total_amount) - getPaidAmount(e),
        dueDate: e.due_date
      })),
      ...loans.filter(l => l.type === 'Borrowed').map(l => ({
        id: `l-${l.id}`,
        party: l.party,
        type: 'Loan (Borrowed)',
        amount: Number(l.principal) - getPaidAmount(l),
        dueDate: l.due_date
      }))
    ].filter(i => i.amount > 0);

    return { 
      assets, 
      liabilities, 
      totalAssets, 
      totalLiabilities, 
      netWorth, 
      totalRev, 
      totalExp,
      revenueByCategory,
      expensesByCategory,
      receivablesList,
      payablesList,
      totalMachinery,
      totalLivestock,
      totalInventory
    };
  }, [revenue, expenses, farms, machinery, livestock, inventory, creditEntries, loans]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const balanceData = [
      ['Financial Report - AgriPro', '', 'Generated on:', formatDate(new Date())],
      [],
      ['BALANCE SHEET'],
      ['Assets', '', 'Amount (PKR)'],
      ...Object.entries(financialData.assets).map(([name, val]) => [name, '', val]),
      ['TOTAL ASSETS', '', financialData.totalAssets],
      [],
      ['Liabilities', '', 'Amount (PKR)'],
      ['Outstanding Loans', '', financialData.liabilities.loans],
      ['Credit Payables', '', financialData.liabilities.payable],
      ['TOTAL LIABILITIES', '', financialData.totalLiabilities],
      [],
      ['NET WORTH (EQUITY)', '', financialData.netWorth],
    ];

    const pnlData = [
      ['PROFIT & LOSS STATEMENT'],
      [],
      ['Revenue Categories', 'Amount (PKR)'],
      ...Object.entries(financialData.revenueByCategory).map(([cat, amt]) => [cat, amt]),
      ['TOTAL REVENUE', financialData.totalRev],
      [],
      ['Expense Categories', 'Amount (PKR)'],
      ...Object.entries(financialData.expensesByCategory).map(([cat, amt]) => [cat, amt]),
      ['TOTAL EXPENSES', financialData.totalExp],
      [],
      ['NET PROFIT / LOSS', financialData.totalRev - financialData.totalExp],
    ];

    const wsBalance = XLSX.utils.aoa_to_sheet(balanceData);
    const wsPnl = XLSX.utils.aoa_to_sheet(pnlData);

    XLSX.utils.book_append_sheet(wb, wsBalance, 'Balance Sheet');
    XLSX.utils.book_append_sheet(wb, wsPnl, 'P&L Statement');

    XLSX.writeFile(wb, `AgriPro_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Financial Reports</h2>
          <p className="text-sm text-text-muted">Comprehensive business health snapshot.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <IconFileDownload size={18} />
            Export Excel
          </Button>
          <Button variant="primary" onClick={printPDF}>
            <IconPrinter size={18} />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="flex border-b border-border gap-6 print:hidden">
        {[
          { id: 'balance', label: 'Balance Sheet', icon: IconScale },
          { id: 'pnl', label: 'P&L Statement', icon: IconReceipt },
          { id: 'assets', label: 'Assets Snapshot', icon: IconPackage },
          { id: 'recpay', label: 'Receivables / Payables', icon: IconUsers },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="agri-card p-8 print:shadow-none print:border-none">
        {activeTab === 'balance' && (
          <div className="space-y-8">
            <div className="flex justify-between items-end border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Balance Sheet</h3>
                <p className="text-xs text-text-muted">As of {formatDate(new Date())}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted font-bold uppercase block">Net Worth (Equity)</span>
                <span className={`text-2xl font-bold ${financialData.netWorth >= 0 ? 'text-revenue' : 'text-expense'}`}>
                  {formatPKR(financialData.netWorth)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-bg pb-2">Assets</h4>
                <div className="space-y-3">
                  {Object.entries(financialData.assets).map(([name, val]) => (
                    <div key={name} className="flex justify-between text-[13px]">
                      <span className="text-text-secondary">{name}</span>
                      <span className="font-bold">{formatPKR(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-4 text-primary">
                    <span>TOTAL ASSETS</span>
                    <span>{formatPKR(financialData.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-expense uppercase tracking-wider border-b border-bg pb-2">Liabilities</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-secondary">Outstanding Loans</span>
                    <span className="font-bold">{formatPKR(financialData.liabilities.loans)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text-secondary">Credit Payables</span>
                    <span className="font-bold">{formatPKR(financialData.liabilities.payable)}</span>
                  </div>
                  <div className="h-[120px] print:hidden"></div>
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-4 text-expense">
                    <span>TOTAL LIABILITIES</span>
                    <span>{formatPKR(financialData.totalLiabilities)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pnl' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-text-primary">Profit & Loss Statement</h3>
              <p className="text-xs text-text-muted">For the current financial period</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-revenue uppercase border-b border-revenue border-opacity-20 pb-1">Revenue</h4>
                <div className="space-y-2">
                  {Object.entries(financialData.revenueByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-bold">{formatPKR(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(financialData.revenueByCategory).length === 0 && (
                    <p className="text-xs text-text-muted italic">No revenue recorded</p>
                  )}
                  <div className="flex justify-between text-sm font-bold text-revenue border-t border-bg pt-2">
                    <span>Total Revenue</span>
                    <span>{formatPKR(financialData.totalRev)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-expense uppercase border-b border-expense border-opacity-20 pb-1">Expenses</h4>
                <div className="space-y-2">
                  {Object.entries(financialData.expensesByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-bold">{formatPKR(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(financialData.expensesByCategory).length === 0 && (
                    <p className="text-xs text-text-muted italic">No expenses recorded</p>
                  )}
                  <div className="flex justify-between text-sm font-bold text-expense border-t border-bg pt-2">
                    <span>Total Expenses</span>
                    <span>{formatPKR(financialData.totalExp)}</span>
                  </div>
                </div>
              </div>

              <div className={`flex justify-between p-4 rounded-md text-lg font-bold ${financialData.totalRev - financialData.totalExp >= 0 ? 'bg-green-50 text-revenue' : 'bg-red-50 text-expense'}`}>
                <span>NET PROFIT / LOSS</span>
                <span>{formatPKR(financialData.totalRev - financialData.totalExp)}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="agri-card p-6 bg-bg text-center space-y-2">
              <span className="text-2xl">🏡</span>
              <h5 className="text-[10px] font-bold text-text-muted uppercase">Land</h5>
              <p className="text-lg font-bold text-primary">{formatPKR(financialData.assets['Land Value'])}</p>
            </div>
            <div className="agri-card p-6 bg-bg text-center space-y-2">
              <span className="text-2xl">🚜</span>
              <h5 className="text-[10px] font-bold text-text-muted uppercase">Machinery</h5>
              <p className="text-lg font-bold text-primary">{formatPKR(financialData.totalMachinery)}</p>
            </div>
            <div className="agri-card p-6 bg-bg text-center space-y-2">
              <span className="text-2xl">🐄</span>
              <h5 className="text-[10px] font-bold text-text-muted uppercase">Livestock</h5>
              <p className="text-lg font-bold text-primary">{formatPKR(financialData.totalLivestock)}</p>
            </div>
            <div className="agri-card p-6 bg-bg text-center space-y-2">
              <span className="text-2xl">📦</span>
              <h5 className="text-[10px] font-bold text-text-muted uppercase">Inventory</h5>
              <p className="text-lg font-bold text-primary">{formatPKR(financialData.totalInventory)}</p>
            </div>
          </div>
        )}

        {activeTab === 'recpay' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-revenue uppercase tracking-wider border-b border-revenue border-opacity-10 pb-2">Receivables (Receiving)</h4>
              <div className="space-y-3">
                {financialData.receivablesList.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-[13px] p-2 bg-bg rounded">
                    <div className="flex flex-col">
                      <span className="font-bold">{item.party}</span>
                      <span className="text-[10px] text-text-muted">{item.type} {item.dueDate && `• Due: ${formatDate(item.dueDate)}`}</span>
                    </div>
                    <span className="font-bold text-revenue">{formatPKR(item.amount)}</span>
                  </div>
                ))}
                {financialData.receivablesList.length === 0 && (
                  <p className="text-sm text-text-muted italic text-center py-4">No active receivables</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-expense uppercase tracking-wider border-b border-expense border-opacity-10 pb-2">Payables (Paying Out)</h4>
              <div className="space-y-3">
                {financialData.payablesList.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-[13px] p-2 bg-bg rounded">
                    <div className="flex flex-col">
                      <span className="font-bold">{item.party}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">{item.type} {item.dueDate && `• Due: ${formatDate(item.dueDate)}`}</span>
                        {item.dueDate && new Date(item.dueDate) < new Date() && (
                          <span className="text-[8px] font-bold text-expense uppercase">Overdue</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-expense">{formatPKR(item.amount)}</span>
                  </div>
                ))}
                {financialData.payablesList.length === 0 && (
                  <p className="text-sm text-text-muted italic text-center py-4">No active payables</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
