import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconPrinter, IconNotebook, IconBook2, IconPlus, IconArrowLeft } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { useExpenses, useRevenue, useLoans, useCreditEntries, useFarms, useKhatas } from '../../hooks/queries';
import { useFarmFilteredData } from '../../hooks/useFilteredData';
import { buildRoznamchaLines, buildRoznamchaDays, khataLedger, khataTotals } from '../../utils/roznamcha';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import Button from '../shared/Button';

// Bilingual label: Urdu on top (right-to-left), English below.
const Bi = ({ ur, en, className = '' }) => (
  <span className={`inline-flex flex-col leading-tight ${className}`}>
    <span dir="rtl" lang="ur" className="font-bold">{ur}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{en}</span>
  </span>
);

const amt = (n) => formatPKR(n).replace('Rs ', '');

const LineRow = ({ l, onOpenKhata, khataName }) => (
  <tr className="border-b border-border/60">
    <td className="px-3 py-1.5 text-[13px] text-text-primary">{l.text}</td>
    <td className="px-2 py-1.5 text-center">
      {l.folio ? (
        <button type="button" onClick={() => onOpenKhata(l.folio)} title={khataName(l.folio)}
          className="font-bold text-primary hover:underline print:no-underline">{l.folio}</button>
      ) : <span className="text-accent-amber font-bold" title="No folio set">—</span>}
    </td>
    <td className="px-3 py-1.5 text-right font-pkr text-[13px] whitespace-nowrap">{amt(l.amount)}</td>
  </tr>
);

const ColumnHead = ({ ur, en }) => (
  <thead>
    <tr className="agri-table-header">
      <th className="px-3 py-2 text-left"><Bi ur={ur} en={en} /></th>
      <th className="px-2 py-2 text-center w-16"><Bi ur="صفحہ" en="Folio" /></th>
      <th className="px-3 py-2 text-right w-32"><Bi ur="رقم" en="Amount" /></th>
    </tr>
  </thead>
);

const Roznamcha = () => {
  const orgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(orgId);
  const farmIds = farms.map(f => f.id);

  // Cash book is a running balance: every date, current farm filter.
  const expenses = useFarmFilteredData(useExpenses(farmIds).data || []);
  const revenue = useFarmFilteredData(useRevenue(farmIds).data || []);
  const loans = useFarmFilteredData(useLoans(farmIds).data || []);
  const creditEntries = useFarmFilteredData(useCreditEntries(farmIds).data || []);
  const { data: khatas = [], refetch: refetchKhatas } = useKhatas(orgId);

  const [tab, setTab] = useState('day');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedFolio, setSelectedFolio] = useState(null);
  const [newKhata, setNewKhata] = useState({ folio: '', name: '', name_ur: '' });
  const [savingKhata, setSavingKhata] = useState(false);

  const lines = useMemo(
    () => buildRoznamchaLines({ expenses, revenue, loans, creditEntries }),
    [expenses, revenue, loans, creditEntries]
  );
  const days = useMemo(() => buildRoznamchaDays(lines), [lines]);
  const khataByFolio = useMemo(() => new Map(khatas.map(k => [k.folio, k])), [khatas]);
  const khataName = (folio) => {
    const k = khataByFolio.get(folio);
    return k ? `${k.name}${k.name_ur ? ` / ${k.name_ur}` : ''}` : (folio ? `Folio ${folio}` : 'No folio');
  };

  // Default to the latest day that has entries.
  const dayIndex = useMemo(() => {
    if (!days.length) return -1;
    if (!selectedDate) return days.length - 1;
    const i = days.findIndex(d => d.date === selectedDate);
    return i;
  }, [days, selectedDate]);
  const day = dayIndex >= 0 ? days[dayIndex] : null;
  const pageNo = dayIndex >= 0 ? dayIndex + 1 : null;
  // A picked date with no entries: show the balance carried into it.
  const emptyDayBalance = useMemo(() => {
    if (day || !selectedDate) return null;
    const before = days.filter(d => d.date < selectedDate);
    return before.length ? before[before.length - 1].closing : 0;
  }, [day, days, selectedDate]);

  const register = useMemo(() => {
    const totals = new Map(khataTotals(lines).map(t => [t.folio ?? 0, t]));
    const folios = new Set([...khatas.map(k => k.folio), ...[...totals.keys()].filter(Boolean)]);
    const rows = [...folios].sort((a, b) => a - b).map(f => ({
      folio: f,
      khata: khataByFolio.get(f),
      ...(totals.get(f) || { jama: 0, naam: 0, balance: 0, count: 0 })
    }));
    const unposted = totals.get(0);
    return { rows, unposted };
  }, [lines, khatas, khataByFolio]);

  const ledger = useMemo(() => (selectedFolio ? khataLedger(lines, selectedFolio) : []), [lines, selectedFolio]);

  const openKhata = (folio) => {
    if (!folio) return;
    setSelectedFolio(folio);
    setTab('khata');
  };

  const goDay = (delta) => {
    const i = (dayIndex >= 0 ? dayIndex : days.length - 1) + delta;
    if (i >= 0 && i < days.length) setSelectedDate(days[i].date);
  };

  const saveKhata = async (e) => {
    e.preventDefault();
    const folio = parseInt(newKhata.folio, 10);
    if (!folio || folio <= 0 || !newKhata.name.trim()) {
      toast.error('Enter a folio number and khata name.');
      return;
    }
    setSavingKhata(true);
    try {
      const { error } = await supabase.from('khatas').upsert(
        [{ org_id: orgId, folio, name: newKhata.name.trim(), name_ur: newKhata.name_ur.trim() || null }],
        { onConflict: 'org_id,folio' }
      );
      if (error) throw error;
      toast.success(`Khata ${folio} saved`);
      setNewKhata({ folio: '', name: '', name_ur: '' });
      await refetchKhatas();
    } catch (err) {
      toast.error('Could not save khata: ' + err.message);
    } finally {
      setSavingKhata(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <IconNotebook size={22} /> <span dir="rtl" lang="ur">روزنامچہ</span> <span>/ Roznamcha</span>
          </h2>
          <p className="text-sm text-text-muted">Daily cash book and khata (ledger) pages, built from your entries. All dates, current farm filter.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-bold">
          <button type="button" onClick={() => setTab('day')}
            className={`px-3 py-2 flex items-center gap-1 ${tab === 'day' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg'}`}>
            <IconNotebook size={14} /> Roznamcha / روزنامچہ
          </button>
          <button type="button" onClick={() => setTab('khata')}
            className={`px-3 py-2 flex items-center gap-1 ${tab === 'khata' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg'}`}>
            <IconBook2 size={14} /> Khata Register / کھاتہ رجسٹر
          </button>
        </div>
      </div>

      {tab === 'day' && (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button size="small" variant="outline" onClick={() => goDay(-1)} disabled={dayIndex <= 0}>
              <IconChevronLeft size={16} /> Previous day
            </Button>
            <input type="date" className="agri-input w-auto" value={day?.date || selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value || null)} />
            <Button size="small" variant="outline" onClick={() => goDay(1)} disabled={dayIndex < 0 || dayIndex >= days.length - 1}>
              Next day <IconChevronRight size={16} />
            </Button>
            <div className="flex-1" />
            <Button size="small" variant="outline" onClick={() => window.print()}>
              <IconPrinter size={16} /> Print / PDF
            </Button>
          </div>

          {!days.length && (
            <div className="agri-card p-10 text-center text-text-muted">No entries yet.</div>
          )}

          {emptyDayBalance !== null && (
            <div className="agri-card p-6 text-center">
              <p className="font-bold text-text-primary">No entries on {formatDate(selectedDate)}.</p>
              <p className="text-sm text-text-muted mt-1">
                <span dir="rtl" lang="ur">بقایا</span> / Balance carried into this day: <span className="font-bold">{formatPKR(emptyDayBalance)}</span>
              </p>
            </div>
          )}

          {day && (
            <div className="agri-card overflow-hidden">
              <div className="flex justify-between items-end px-4 py-3 border-b border-border bg-bg">
                <span className="text-xs text-text-muted font-bold">Page {pageNo}</span>
                <div className="text-center">
                  <div className="text-lg font-bold"><span dir="rtl" lang="ur">روزنامچہ</span> / Roznamcha</div>
                  <div className="text-sm font-bold text-text-secondary">{formatDate(day.date)}</div>
                </div>
                <span className="text-xs text-text-muted font-bold">
                  {new Date(day.date).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-border">
                {/* Kharch (left, as in the book) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <ColumnHead ur="تفصیلِ خرچ" en="Payments (Kharch)" />
                    <tbody>
                      {day.kharch.map(l => <LineRow key={l.key} l={l} onOpenKhata={openKhata} khataName={khataName} />)}
                      {!day.kharch.length && (
                        <tr><td colSpan="3" className="px-3 py-4 text-center text-xs text-text-muted">No payments</td></tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-text-primary/40">
                        <td className="px-3 py-2 font-bold"><Bi ur="میزان خرچ" en="Total payments" /></td>
                        <td />
                        <td className="px-3 py-2 text-right font-bold font-pkr text-expense">{amt(day.totalOut)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Aamdan (right) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <ColumnHead ur="تفصیلِ آمدن" en="Receipts (Aamdan)" />
                    <tbody>
                      <tr className="border-b border-border/60 bg-bg/60">
                        <td className="px-3 py-1.5 text-[13px] font-bold"><Bi ur="سابقہ" en="Opening balance (b/f)" /></td>
                        <td />
                        <td className="px-3 py-1.5 text-right font-pkr text-[13px] font-bold">{amt(day.opening)}</td>
                      </tr>
                      {day.aamdan.map(l => <LineRow key={l.key} l={l} onOpenKhata={openKhata} khataName={khataName} />)}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-text-primary/40">
                        <td className="px-3 py-1.5 font-bold"><Bi ur="میزان" en="Total incl. opening" /></td>
                        <td />
                        <td className="px-3 py-1.5 text-right font-bold font-pkr">{amt(day.grandIn)}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5"><Bi ur="خرچ" en="Less payments" /></td>
                        <td />
                        <td className="px-3 py-1.5 text-right font-pkr text-expense">− {amt(day.totalOut)}</td>
                      </tr>
                      <tr className="border-t-2 border-double border-text-primary/60 bg-revenue/5">
                        <td className="px-3 py-2 font-bold"><Bi ur="بقایا" en="Closing balance (c/f)" /></td>
                        <td />
                        <td className={`px-3 py-2 text-right font-bold font-pkr ${day.closing < 0 ? 'text-expense' : 'text-revenue'}`}>{amt(day.closing)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'khata' && !selectedFolio && (
        <div className="space-y-4">
          <div className="agri-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="agri-table-header">
                    <th className="px-4 py-2 w-20"><Bi ur="صفحہ" en="Folio" /></th>
                    <th className="px-4 py-2"><Bi ur="کھاتہ" en="Khata" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="جمع" en="Jama (in)" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="نام" en="Naam (out)" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="بقایا" en="Balance" /></th>
                  </tr>
                </thead>
                <tbody>
                  {register.rows.map(r => (
                    <tr key={r.folio} className="agri-table-row cursor-pointer" onClick={() => setSelectedFolio(r.folio)}>
                      <td className="px-4 py-2 font-bold text-primary">{r.folio}</td>
                      <td className="px-4 py-2">
                        <div className="font-bold text-text-primary">{r.khata?.name || <span className="text-accent-amber">Not in register</span>}</div>
                        {r.khata?.name_ur && <div dir="rtl" lang="ur" className="text-[13px] text-text-muted text-left">{r.khata.name_ur}</div>}
                      </td>
                      <td className="px-4 py-2 text-right font-pkr text-revenue">{r.jama ? amt(r.jama) : '—'}</td>
                      <td className="px-4 py-2 text-right font-pkr text-expense">{r.naam ? amt(r.naam) : '—'}</td>
                      <td className="px-4 py-2 text-right font-pkr font-bold">{amt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {register.unposted && (
              <p className="px-4 py-2 text-xs text-accent-amber border-t border-border">
                {register.unposted.count} entries have no folio yet. Edit them and add the folio so they post to a khata.
              </p>
            )}
          </div>

          <form onSubmit={saveKhata} className="agri-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end print:hidden">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Folio / صفحہ</label>
              <input type="number" min="1" className="agri-input" value={newKhata.folio}
                onChange={e => setNewKhata(p => ({ ...p, folio: e.target.value }))} placeholder="e.g. 58" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Khata name (English)</label>
              <input className="agri-input" value={newKhata.name}
                onChange={e => setNewKhata(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wheat" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">کھاتہ نام (اردو)</label>
              <input dir="rtl" lang="ur" className="agri-input" value={newKhata.name_ur}
                onChange={e => setNewKhata(p => ({ ...p, name_ur: e.target.value }))} placeholder="گندم" />
            </div>
            <Button type="submit" variant="primary" disabled={savingKhata}>
              <IconPlus size={16} /> {savingKhata ? 'Saving...' : 'Add / update khata'}
            </Button>
          </form>
        </div>
      )}

      {tab === 'khata' && selectedFolio && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 print:hidden">
            <Button size="small" variant="outline" onClick={() => setSelectedFolio(null)}>
              <IconArrowLeft size={16} /> All khatas
            </Button>
            <div className="flex-1" />
            <Button size="small" variant="outline" onClick={() => window.print()}>
              <IconPrinter size={16} /> Print / PDF
            </Button>
          </div>
          <div className="agri-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg flex justify-between items-center">
              <div>
                <div className="text-xs text-text-muted font-bold">Folio / صفحہ {selectedFolio}</div>
                <div className="text-lg font-bold">{khataByFolio.get(selectedFolio)?.name || `Folio ${selectedFolio}`}</div>
              </div>
              {khataByFolio.get(selectedFolio)?.name_ur && (
                <div dir="rtl" lang="ur" className="text-xl font-bold">{khataByFolio.get(selectedFolio).name_ur}</div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="agri-table-header">
                    <th className="px-4 py-2"><Bi ur="تاریخ" en="Date" /></th>
                    <th className="px-4 py-2"><Bi ur="تفصیل" en="Detail" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="جمع" en="Jama (in)" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="نام" en="Naam (out)" /></th>
                    <th className="px-4 py-2 text-right"><Bi ur="بقایا" en="Balance" /></th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(l => (
                    <tr key={l.key} className="agri-table-row">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button type="button" className="text-primary hover:underline" onClick={() => { setSelectedDate(l.date); setTab('day'); }}>
                          {formatDate(l.date)}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-[13px]">{l.text}</td>
                      <td className="px-4 py-2 text-right font-pkr text-revenue">{l.jama ? amt(l.jama) : ''}</td>
                      <td className="px-4 py-2 text-right font-pkr text-expense">{l.naam ? amt(l.naam) : ''}</td>
                      <td className="px-4 py-2 text-right font-pkr font-bold">{amt(l.balance)}</td>
                    </tr>
                  ))}
                  {!ledger.length && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-text-muted text-sm">No entries in this khata yet.</td></tr>
                  )}
                </tbody>
                {ledger.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-text-primary/40 font-bold">
                      <td className="px-4 py-2" colSpan="2"><Bi ur="میزان" en="Total" /></td>
                      <td className="px-4 py-2 text-right font-pkr text-revenue">{amt(ledger.reduce((s, l) => s + l.jama, 0))}</td>
                      <td className="px-4 py-2 text-right font-pkr text-expense">{amt(ledger.reduce((s, l) => s + l.naam, 0))}</td>
                      <td className="px-4 py-2 text-right font-pkr">{amt(ledger[ledger.length - 1].balance)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roznamcha;
