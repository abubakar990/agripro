import { round2 } from './finance.js';

const normalize = (s) => (s || '').trim().replace(/\s+/g, ' ');

/**
 * Collapses outstanding items into one row per party + type
 * (e.g. two "Dr Zain · Loan (Borrowed)" entries become one row of the summed amount).
 * Items: { id, party, type, amount, dueDate }. Keeps the earliest due date and the entry count.
 */
export function groupByParty(items = []) {
  const map = new Map();
  for (const item of items) {
    const party = normalize(item.party) || 'Unknown';
    const key = `${party.toLowerCase()}|${item.type}`;
    if (!map.has(key)) map.set(key, { id: key, party, type: item.type, amount: 0, count: 0, dueDate: null });
    const g = map.get(key);
    g.amount = round2(g.amount + (Number(item.amount) || 0));
    g.count += 1;
    if (item.dueDate && (!g.dueDate || item.dueDate < g.dueDate)) g.dueDate = item.dueDate;
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export const sumAmounts = (items = []) => round2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
