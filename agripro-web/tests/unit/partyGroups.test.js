import { groupByParty, sumAmounts } from '../../src/utils/partyGroups.js';

export default function run(t) {
  const payables = [
    { party: 'Naya Sawera Sardargarh', type: 'Credit Purchase', amount: 21350 },
    { party: 'Ch Javaid', type: 'Credit Purchase', amount: 37500 },
    { party: 'Ahmad Abbas', type: 'Loan (Borrowed)', amount: 5000, dueDate: '2026-08-01' },
    { party: 'ahmad  abbas ', type: 'Loan (Borrowed)', amount: 5000, dueDate: '2026-07-01' },
    { party: 'Dr Zain', type: 'Loan (Borrowed)', amount: 300000 },
    { party: 'Dr Zain', type: 'Loan (Borrowed)', amount: 200000 },
    { party: 'Dr Zain', type: 'Credit Purchase', amount: 1000 },
  ];
  const g = groupByParty(payables);
  const zainLoan = g.find(x => x.id === 'dr zain|Loan (Borrowed)');
  const ahmad = g.find(x => x.id === 'ahmad abbas|Loan (Borrowed)');
  t.equal(g.length, 5, 'one row per party + type');
  t.equal(zainLoan.amount, 500000, 'Dr Zain loans combine to 500,000');
  t.equal(zainLoan.count, 2, 'entry count kept');
  t.ok(g.some(x => x.id === 'dr zain|Credit Purchase'), 'same party with a different type stays separate');
  t.equal(ahmad.amount, 10000, 'name matching ignores case and extra spaces');
  t.equal(ahmad.dueDate, '2026-07-01', 'earliest due date is kept');
  t.equal(g[0].party, 'Dr Zain', 'largest amount first');
  t.equal(sumAmounts(g), 569850, 'total payable unchanged by grouping');
}
