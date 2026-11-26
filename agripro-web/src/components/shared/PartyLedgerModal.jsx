import { useState, useMemo } from 'react';
import {
  IconX,
  IconPhone,
  IconMapPin,
  IconPrinter,
  IconBrandWhatsapp,
  IconBuildingBank,
  IconCreditCard,
  IconReceipt2,
  IconArrowUpRight,
  IconArrowDownLeft,
  IconCheck,
  IconClock,
  IconCalendar
} from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { useParties } from '../../hooks/useParties';
import Modal from './Modal';
import Badge from './Badge';
import Button from './Button';

export default function PartyLedgerModal({
  isOpen,
  onClose,
  partyName = '',
  party: propParty = null
}) {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { getParty, farms } = useParties(currentOrgId);

  const [activeTab, setActiveTab] = useState('statement');
  const [filterType, setFilterType] = useState('ALL');

  const party = useMemo(() => {
    if (propParty) return propParty;
    if (partyName) return getParty(partyName);
    return null;
  }, [propParty, partyName, getParty]);

  const farmMap = useMemo(() => {
    const map = {};
    for (const f of farms) {
      map[f.id] = f.name;
    }
    return map;
  }, [farms]);

  if (!party) return null;

  const timeline = party.timeline || [];

  const filteredTimeline = useMemo(() => {
    if (filterType === 'ALL') return timeline;
    return timeline.filter((t) => t.module.toLowerCase().includes(filterType.toLowerCase()));
  }, [timeline, filterType]);

  const handlePrint = () => {
    window.print();
  };

  const isNetOwedByUs = party.weOwe > party.theyOwe;
  const isNetOwedToUs = party.theyOwe > party.weOwe;
  const netAmount = Math.abs(party.netBalance);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Financial Ledger: ${party.name}`}
      size="4xl"
      zIndex="z-[1100]"
    >
      <div className="space-y-6 print:p-0">
        {/* Top Header Card */}
        <div className="bg-bg p-5 rounded-2xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-primary">{party.name}</h2>
              {party.type && (
                <Badge variant="outline" className="uppercase text-[11px]">
                  {party.type}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted mt-2">
              {party.contact && (
                <div className="flex items-center gap-1.5">
                  <IconPhone size={14} className="text-primary" />
                  <a href={`tel:${party.contact}`} className="hover:underline font-medium text-text-primary">
                    {party.contact}
                  </a>
                  <a
                    href={`https://wa.me/${party.contact.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#25D366] hover:opacity-80 p-0.5"
                    title="Chat on WhatsApp"
                  >
                    <IconBrandWhatsapp size={16} />
                  </a>
                </div>
              )}

              {party.address && (
                <div className="flex items-center gap-1.5">
                  <IconMapPin size={14} className="text-text-muted" />
                  <span>{party.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 border border-border rounded-xl bg-white hover:bg-bg text-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Print Statement"
            >
              <IconPrinter size={16} />
              Print Khata
            </button>
          </div>
        </div>

        {/* Net Financial Position Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
            isNetOwedByUs
              ? 'bg-red-50 border-red-200 text-red-900'
              : isNetOwedToUs
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
              Net Financial Position
            </span>
            <span className="text-2xl font-black">
              {isNetOwedByUs && `You Owe: ${formatPKR(netAmount)}`}
              {isNetOwedToUs && `Owes You: ${formatPKR(netAmount)}`}
              {!isNetOwedByUs && !isNetOwedToUs && 'All Accounts Settled (Rs 0)'}
            </span>
          </div>

          <div className="flex gap-4 text-xs font-medium">
            <div className="text-right">
              <span className="opacity-75 block">Total Liabilities (We Owe)</span>
              <span className="font-bold text-sm text-red-700">{formatPKR(party.weOwe)}</span>
            </div>
            <div className="text-right">
              <span className="opacity-75 block">Total Assets (They Owe)</span>
              <span className="font-bold text-sm text-emerald-700">{formatPKR(party.theyOwe)}</span>
            </div>
          </div>
        </div>

        {/* 4 Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-bg rounded-xl border border-border">
            <span className="text-text-muted font-bold block uppercase text-[10px]">Loans Borrowed</span>
            <span className="text-base font-bold text-text-primary block mt-0.5">
              {formatPKR(party.totalBorrowed)}
            </span>
            <span className="text-[11px] text-red-600 font-semibold mt-1 block">
              Remaining: {formatPKR(party.outstandingBorrowed)}
            </span>
          </div>

          <div className="p-3 bg-bg rounded-xl border border-border">
            <span className="text-text-muted font-bold block uppercase text-[10px]">Loans Lent</span>
            <span className="text-base font-bold text-text-primary block mt-0.5">
              {formatPKR(party.totalLent)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Remaining: {formatPKR(party.outstandingLent)}
            </span>
          </div>

          <div className="p-3 bg-bg rounded-xl border border-border">
            <span className="text-text-muted font-bold block uppercase text-[10px]">Credit Purchases (Payable)</span>
            <span className="text-base font-bold text-text-primary block mt-0.5">
              {formatPKR(party.totalPayable)}
            </span>
            <span className="text-[11px] text-red-600 font-semibold mt-1 block">
              Unpaid: {formatPKR(party.outstandingPayable)}
            </span>
          </div>

          <div className="p-3 bg-bg rounded-xl border border-border">
            <span className="text-text-muted font-bold block uppercase text-[10px]">Credit Sales (Receivable)</span>
            <span className="text-base font-bold text-text-primary block mt-0.5">
              {formatPKR(party.totalReceivable)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Uncollected: {formatPKR(party.outstandingReceivable)}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('statement')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'statement'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <IconReceipt2 size={16} />
            Ledger Statement ({timeline.length})
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'loans'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <IconBuildingBank size={16} />
            Loans ({party.loans.length})
          </button>

          <button
            onClick={() => setActiveTab('credit')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'credit'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <IconCreditCard size={16} />
            Credit ({party.creditEntries.length})
          </button>
        </div>

        {/* TAB 1: Ledger Statement (Chronological Double Entry with Running Balance) */}
        {activeTab === 'statement' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <div className="flex gap-2">
                {['ALL', 'Loan', 'Credit', 'Payment'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterType === t
                        ? 'bg-primary text-white'
                        : 'bg-bg text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <span className="text-text-muted">{filteredTimeline.length} events</span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg text-text-muted font-bold uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type & Details</th>
                      <th className="p-3">Farm</th>
                      <th className="p-3 text-right">Debit (Owed to Us / Paid)</th>
                      <th className="p-3 text-right">Credit (Owed by Us / Received)</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTimeline.length > 0 ? (
                      filteredTimeline.map((item) => {
                        const isPositive = item.runningBalance > 0;
                        const isNegative = item.runningBalance < 0;

                        return (
                          <tr key={item.id} className="hover:bg-bg/40 transition-colors">
                            <td className="p-3 font-medium whitespace-nowrap text-text-secondary">
                              {item.date ? formatDate(item.date) : '—'}
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-text-primary">{item.type}</div>
                              <div className="text-[11px] text-text-muted truncate max-w-xs">
                                {item.description} {item.note ? `• ${item.note}` : ''}
                              </div>
                            </td>

                            <td className="p-3 text-text-muted whitespace-nowrap">
                              {farmMap[item.farm_id] || 'All Farms'}
                            </td>

                            <td className="p-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {item.debit > 0 ? formatPKR(item.debit) : '—'}
                            </td>

                            <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">
                              {item.credit > 0 ? formatPKR(item.credit) : '—'}
                            </td>

                            <td className="p-3 text-right font-black whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  isPositive
                                    ? 'bg-emerald-50 text-emerald-700 font-bold'
                                    : isNegative
                                    ? 'bg-red-50 text-red-700 font-bold'
                                    : 'text-text-muted'
                                }`}
                              >
                                {isPositive && `+${formatPKR(item.runningBalance)}`}
                                {isNegative && `-${formatPKR(Math.abs(item.runningBalance))}`}
                                {!isPositive && !isNegative && 'Rs 0'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-text-muted">
                          No transactions recorded for this party yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Loans Breakdown */}
        {activeTab === 'loans' && (
          <div className="space-y-3">
            {party.loans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {party.loans.map((loan) => (
                  <div key={loan.id} className="p-4 bg-bg rounded-xl border border-border space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-text-primary text-sm">
                          {loan.purpose || `Loan #${loan.id}`}
                        </span>
                        <span className="text-[11px] text-text-muted block">
                          {formatDate(loan.date)} • {farmMap[loan.farm_id] || 'General'}
                        </span>
                      </div>
                      <Badge variant={loan.type === 'Borrowed' ? 'danger' : 'success'}>
                        {loan.type}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-text-muted">Principal:</span>
                      <span className="font-bold text-text-primary">{formatPKR(loan.principal)}</span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Repayments ({loan.payments?.length || 0}):</span>
                      <span className="font-bold text-emerald-600">
                        {formatPKR(
                          (loan.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
                        )}
                      </span>
                    </div>

                    {loan.due_date && (
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>Due Date:</span>
                        <span className="font-medium">{formatDate(loan.due_date)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted bg-bg rounded-xl">
                No loan records for {party.name}.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Credit Entries Breakdown */}
        {activeTab === 'credit' && (
          <div className="space-y-3">
            {party.creditEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {party.creditEntries.map((credit) => (
                  <div key={credit.id} className="p-4 bg-bg rounded-xl border border-border space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-text-primary text-sm">
                          {credit.item || `Credit #${credit.id}`}
                        </span>
                        <span className="text-[11px] text-text-muted block">
                          {formatDate(credit.date)} • {farmMap[credit.farm_id] || 'General'}
                        </span>
                      </div>
                      <Badge variant={credit.type === 'Payable' ? 'danger' : 'success'}>
                        {credit.type}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-text-muted">Total Amount:</span>
                      <span className="font-bold text-text-primary">{formatPKR(credit.total_amount)}</span>
                    </div>

                    {Number(credit.advance) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Advance:</span>
                        <span className="font-medium text-emerald-600">{formatPKR(credit.advance)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Payments ({credit.payments?.length || 0}):</span>
                      <span className="font-bold text-emerald-600">
                        {formatPKR(
                          (credit.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted bg-bg rounded-xl">
                No credit records for {party.name}.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
