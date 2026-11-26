import { cashBalance, loansReceivable } from '../../src/utils/finance.js';

export default function run(t) {
  // Sardargarh khata, 7 May 2026: Rs 500,000 amanat in, Rs 240,040 spent, Rs 30,000 lent to Rashid Ali.
  const loans = [
    { type: 'Borrowed', principal: 300000, payments: [] },
    { type: 'Borrowed', principal: '200000.00', payments: [] },
    { type: 'Lent', principal: 30000, payments: [] },
  ];
  const expenses = [147000, 66750, 20650, 200, 4340, 100, 1000].map(amount => ({ amount }));
  t.equal(cashBalance({ revenue: [], expenses, loans }), 229960, 'amanat − expenses − money lent = 229,960');
  t.equal(loansReceivable(loans), 30000, 'money lent outstanding = 30,000');

  const withPayments = [
    { type: 'Borrowed', principal: 100000, payments: [{ amount: 40000 }] },
    { type: 'Lent', principal: 50000, payments: [{ amount: 20000 }, { amount: '5000' }] },
  ];
  // +100,000 taken −40,000 repaid −50,000 given +25,000 recovered = 35,000
  t.equal(cashBalance({ loans: withPayments }), 35000, 'repayments reduce cash, recoveries add cash');
  t.equal(loansReceivable(withPayments), 25000, 'receivable is lent principal minus recoveries');
  t.equal(cashBalance({ revenue: [{ amount: '1000.50' }], expenses: [{ amount: 0.5 }] }), 1000, 'revenue minus expenses, string amounts handled');
  t.equal(cashBalance(), 0, 'no data = 0');
}
