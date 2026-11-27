import { buildRoznamchaLines, buildRoznamchaDays, khataLedger, khataTotals } from '../../src/utils/roznamcha.js';
import { cashBalance } from '../../src/utils/finance.js';

export default function run(t) {
  // Roznamcha pages 358-359 (15-16 May 2026), opening 3,352 from 14 May.
  const expenses = [
    { id: 1, date: '2026-05-15', amount: 185400, folio: 17, item_name: 'NP', description: 'Fertilizer for sugarcane' },
    { id: 2, date: '2026-05-15', amount: 81900, folio: 17 },
    { id: 3, date: '2026-05-15', amount: 18200, folio: 56 },
    { id: 4, date: '2026-05-15', amount: 2000, folio: 40 },
    { id: 5, date: '2026-05-15', amount: 570, folio: 33 },
    { id: 6, date: '2026-05-15', amount: 300, folio: 33 },
    { id: 7, date: '2026-05-15', amount: 200, folio: 53 },
    { id: 8, date: '2026-05-15', amount: 3450, folio: 50 },
    { id: 9, date: '2026-05-15', amount: 560, folio: 40 },
    { id: 10, date: '2026-05-16', amount: 1944900, folio: 157, is_capital: true },
    { id: 11, date: '2026-05-16', amount: 2980, folio: 57 },
    { id: 12, date: '2026-05-16', amount: 2400, folio: 40 },
    { id: 13, date: '2026-05-16', amount: 200, folio: 53 },
    { id: 14, date: '2026-05-16', amount: 200, folio: 33 },
  ];
  const revenue = [{ id: 1, date: '2026-05-15', amount: 600, folio: 55, description: 'Jantar sale' }];
  const loans = [
    { id: 27, date: '2026-05-14', type: 'Lent', party: 'Ahmad Abbas', principal: 370000, folio: 132,
      payments: [{ id: 1, date: '2026-05-15', amount: 368000, note: 'BAHL cheque' }] },
    { id: 28, date: '2026-05-16', type: 'Borrowed', party: 'Hafiz Sultan', principal: 799000, folio: 49, payments: [] },
    { id: 29, date: '2026-05-16', type: 'Lent', party: 'Ahmad Abbas', principal: 799000, folio: 132,
      payments: [{ id: 2, date: '2026-05-16', amount: 200000, note: 'BAHL cheque' }] },
  ];
  const creditEntries = [
    { id: 15, date: '2026-05-09', type: 'Credit Purchase', party: 'Ch Javaid', total_amount: 39900, folio: 19,
      payments: [{ id: 1, date: '2026-05-15', amount: 39900 }] },
    { id: 16, date: '2026-05-13', type: 'Credit Purchase', party: 'Naya Sawera', total_amount: 21350, folio: 67,
      payments: [{ id: 2, date: '2026-05-15', amount: 20650 }] },
    { id: 18, date: '2026-05-16', type: 'Credit Purchase', party: 'Al Shehbaz', total_amount: 1944900, folio: 156,
      payments: [{ id: 3, date: '2026-05-16', amount: 200000 }] },
  ];

  const lines = buildRoznamchaLines({ expenses, revenue, loans, creditEntries });
  const days = buildRoznamchaDays(lines.filter(l => l.date >= '2026-05-15'), 3352);
  const d15 = days.find(d => d.date === '2026-05-15');
  const d16 = days.find(d => d.date === '2026-05-16');

  t.equal(d15.totalIn, 368600, '15 May aamdan: BAHL cheque 368,000 + Jantar 600');
  t.equal(d15.grandIn, 371952, '15 May total with sabiqa = 371,952 (as in book)');
  t.equal(d15.totalOut, 353130, '15 May kharch = 353,130 (as in book)');
  t.equal(d15.closing, 18822, '15 May baqaya = 18,822 (book wrote 18,222 by mistake)');
  t.equal(d16.opening, 18822, 'closing carries forward as next day sabiqa');
  t.equal(d16.grandIn, 2962722, '16 May aamdan incl. sabiqa');
  t.equal(d16.totalOut, 2949680, '16 May kharch = 2,949,680 (as in book)');
  // Starting from the book's 14 May sabiqa (3,352, which carries the +500 and +97 slips),
  // only the 15 May slip (-600) is corrected here: 12,442 + 600.
  t.equal(d16.closing, 13042, '16 May baqaya from the book sabiqa, with the 15 May slip corrected');

  const al = khataLedger(lines, 156);
  t.equal(al.length, 2, 'Al Shehbaz khata (156): jama solar + cheque');
  t.equal(al[al.length - 1].balance, 1744900, 'Al Shehbaz balance 17,44,900 still owed');
  const bahl = khataTotals(lines).find(x => x.folio === 132);
  t.equal(bahl.balance, 568000 - 1169000, 'BAHL khata: sent 1,169,000, withdrawn 568,000 -> 601,000 still held');

  // The daybook balance and the Dashboard cash formula must agree for the same records.
  const all = buildRoznamchaDays(lines);
  t.equal(all[all.length - 1].closing, cashBalance({ revenue, expenses, loans, creditEntries }), 'roznamcha closing == Dashboard cash balance');
}
