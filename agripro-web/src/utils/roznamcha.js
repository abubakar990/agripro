import { toNumber as num, round2 } from './finance.js';

/*
 * Roznamcha (daily cash book) built from the app's records, in the same style as the
 * paper book: every movement is written gross, on both sides where it passes through
 * (a credit purchase is "jama <dealer>" in Aamdan and the expense in Kharch; amanat sent
 * to a bank is Aamdan from the lender and Kharch to the bank). So the running balance
 * (baqaya) is the cash actually in hand, and equals finance.cashBalance().
 *
 * Line: { key, date, side: 'in' | 'out', folio, text, amount, source }
 *   in  = Aamdan (آمدن) -> "jama" on that folio's khata
 *   out = Kharch (خرچ)  -> "naam" on that folio's khata
 * Payments carry the folio of the entry they belong to.
 */

const clean = (s) => (s || '').toString().trim();
const join = (...parts) => parts.map(clean).filter(Boolean).join(' - ');
/** Folio number from a form value; null when blank or invalid. */
export const parseFolio = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const folioOf = parseFolio;

export function buildRoznamchaLines({ expenses = [], revenue = [], loans = [], creditEntries = [] } = {}) {
  const lines = [];
  const push = (l) => { if (num(l.amount) > 0 && l.date) lines.push({ ...l, amount: round2(num(l.amount)) }); };

  for (const r of revenue) {
    push({ key: `rev-${r.id}`, date: r.date, side: 'in', folio: folioOf(r.folio), text: join(r.description || r.category, r.item_name && r.item_name !== r.description ? r.item_name : ''), amount: r.amount, source: 'revenue' });
  }

  for (const e of expenses) {
    const what = e.description || join(e.category, e.sub_category);
    const qty = e.quantity != null && e.unit ? `${Number(e.quantity)} ${e.unit}${e.unit_price != null ? ` @ ${Number(e.unit_price)}` : ''}` : '';
    push({ key: `exp-${e.id}`, date: e.date, side: 'out', folio: folioOf(e.folio), text: join(e.item_name && !clean(what).includes(clean(e.item_name)) ? e.item_name : '', what, qty), amount: e.amount, source: 'expense' });
  }

  for (const l of loans) {
    const f = folioOf(l.folio);
    const borrowed = l.type === 'Borrowed';
    push({ key: `loan-${l.id}`, date: l.date, side: borrowed ? 'in' : 'out', folio: f, text: borrowed ? join(`Jama ${clean(l.party)}`, l.purpose) : join(`Naam ${clean(l.party)}`, l.purpose), amount: l.principal, source: 'loan' });
    for (const p of l.payments || []) {
      // Repaying what we borrowed is cash out; recovering what we lent / held elsewhere is cash in.
      push({ key: `lpay-${p.id}`, date: p.date, side: borrowed ? 'out' : 'in', folio: f, text: join(borrowed ? `Wapsi ${clean(l.party)}` : `Wasooli ${clean(l.party)}`, p.note), amount: p.amount, source: 'loan_payment' });
    }
  }

  for (const c of creditEntries) {
    const f = folioOf(c.folio);
    const purchase = c.type === 'Credit Purchase';
    // Purchase on credit: dealer is credited (jama) - Aamdan. Sale on credit: buyer is debited (naam) - Kharch.
    push({ key: `cr-${c.id}`, date: c.date, side: purchase ? 'in' : 'out', folio: f, text: join(purchase ? `Jama ${clean(c.party)}` : `Naam ${clean(c.party)}`, c.item), amount: c.total_amount, source: 'credit' });
    if (num(c.advance) > 0) {
      push({ key: `cradv-${c.id}`, date: c.date, side: purchase ? 'out' : 'in', folio: f, text: join(purchase ? `Adaigi ${clean(c.party)}` : `Wasooli ${clean(c.party)}`, 'advance'), amount: c.advance, source: 'credit_payment' });
    }
    for (const p of c.payments || []) {
      push({ key: `crpay-${p.id}`, date: p.date, side: purchase ? 'out' : 'in', folio: f, text: join(purchase ? `Adaigi ${clean(c.party)}` : `Wasooli ${clean(c.party)}`, p.note), amount: p.amount, source: 'credit_payment' });
    }
  }

  const order = { in: 0, out: 1 };
  return lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : order[a.side] - order[b.side]));
}

/** Groups lines into daily pages with opening (sabiqa), totals and closing (baqaya) carried forward. */
export function buildRoznamchaDays(lines = [], openingBalance = 0) {
  const byDate = new Map();
  for (const l of lines) {
    if (!byDate.has(l.date)) byDate.set(l.date, []);
    byDate.get(l.date).push(l);
  }
  let balance = round2(num(openingBalance));
  return [...byDate.keys()].sort().map(date => {
    const dayLines = byDate.get(date);
    const aamdan = dayLines.filter(l => l.side === 'in');
    const kharch = dayLines.filter(l => l.side === 'out');
    const totalIn = round2(aamdan.reduce((s, l) => s + l.amount, 0));
    const totalOut = round2(kharch.reduce((s, l) => s + l.amount, 0));
    const opening = balance;
    balance = round2(opening + totalIn - totalOut);
    return { date, opening, aamdan, kharch, totalIn, totalOut, grandIn: round2(opening + totalIn), closing: balance };
  });
}

/** Khata page for one folio: jama (Aamdan) / naam (Kharch) with running balance (jama - naam). */
export function khataLedger(lines = [], folio) {
  const f = folioOf(folio);
  let bal = 0;
  return lines
    .filter(l => l.folio === f)
    .map(l => {
      const jama = l.side === 'in' ? l.amount : 0;
      const naam = l.side === 'out' ? l.amount : 0;
      bal = round2(bal + jama - naam);
      return { ...l, jama, naam, balance: bal };
    });
}

/** Per-folio totals for the khata register. */
export function khataTotals(lines = []) {
  const map = new Map();
  for (const l of lines) {
    const key = l.folio ?? 0;
    if (!map.has(key)) map.set(key, { folio: l.folio, jama: 0, naam: 0, count: 0 });
    const t = map.get(key);
    if (l.side === 'in') t.jama = round2(t.jama + l.amount); else t.naam = round2(t.naam + l.amount);
    t.count += 1;
  }
  return [...map.values()].map(t => ({ ...t, balance: round2(t.jama - t.naam) }));
}
