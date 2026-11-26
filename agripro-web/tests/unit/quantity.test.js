import { lineTotal, summarizeByItem, itemSuggestions } from '../../src/utils/quantity.js';

export default function run(t) {
  t.equal(lineTotal('10', '4500'), 45000, '10 bags @ 4,500 = 45,000');
  t.equal(lineTotal(2.5, 3900.4), 9751, 'fractional quantity is rounded to 2 decimals');
  t.equal(lineTotal('', '4500'), null, 'missing quantity leaves amount untouched');
  t.equal(lineTotal('5', ''), null, 'missing rate leaves amount untouched');
  t.equal(lineTotal('-1', '10'), null, 'negative quantity is rejected');

  const rows = [
    { item_name: 'Urea', quantity: 10, unit: 'bag', amount: 45000 },
    { item_name: ' urea ', quantity: '15', unit: 'Bag', amount: '69000' },
    { item_name: 'Urea', quantity: 50, unit: 'kg', amount: 5000 },
    { item_name: 'DAP', quantity: 4, unit: 'bag', amount: 56000 },
    { item_name: '', quantity: 3, unit: 'bag', amount: 999 },
    { item_name: 'Labour', quantity: null, amount: 2000 },
  ];
  const s = summarizeByItem(rows);
  const ureaBag = s.find(g => g.key === 'urea|bag');
  t.equal(s.length, 3, 'groups by item + unit, skipping rows without item or quantity');
  t.equal(ureaBag.quantity, 25, 'Urea bags total 25 (case/space-insensitive)');
  t.equal(ureaBag.amount, 114000, 'Urea bag amount totals 114,000');
  t.equal(ureaBag.avgRate, 4560, 'average rate is amount / quantity');
  t.equal(ureaBag.count, 2, 'counts the entries in the group');
  t.ok(s.some(g => g.key === 'urea|kg'), 'Urea in kg is kept apart from Urea in bags');
  t.equal(s[0].key, 'urea|bag', 'sorted by amount, largest first');

  t.equal(itemSuggestions(rows).join(','), 'DAP,Labour,Urea', 'suggestions are distinct (case-insensitive), trimmed, sorted');
}
