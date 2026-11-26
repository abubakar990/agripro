import { cashBalance, loansReceivable, creditPayable, creditReceivable } from '../../src/utils/finance.js';

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

  // Accrual: credit purchase is booked as an expense AND a payable; cash only drops when paid.
  const creditEntries = [
    { type: 'Credit Purchase', total_amount: 37500, payments: [] },                    // Ch Javaid
    { type: 'Credit Purchase', total_amount: '21350.00', payments: [] },               // Naya Sawera
    { type: 'Credit Sale', total_amount: 10000, payments: [{ amount: 4000 }] },
  ];
  t.equal(creditPayable(creditEntries), 58850, 'payable = unpaid credit purchases');
  t.equal(creditReceivable(creditEntries), 6000, 'receivable = unpaid credit sales');
  t.equal(
    cashBalance({ expenses: [{ amount: 37500 }], creditEntries: [{ type: 'Credit Purchase', total_amount: 37500, payments: [] }] }),
    0,
    'an unpaid credit purchase does not reduce cash'
  );
  t.equal(
    cashBalance({ expenses: [{ amount: 37500 }], creditEntries: [{ type: 'Credit Purchase', total_amount: 37500, payments: [{ amount: 10000 }] }] }),
    -10000,
    'paying the dealer reduces cash by the amount paid'
  );

  // Sardargarh 7–13 May: revenue 5,000; expenses 342,497; amanat 510,000; lent 30,000; credit owed 58,850.
  t.equal(
    cashBalance({
      revenue: [{ amount: 5000 }],
      expenses: [{ amount: 342497 }],
      loans: [...loans, { type: 'Borrowed', principal: 5000 }, { type: 'Borrowed', principal: 5000 }],
      creditEntries: creditEntries.slice(0, 2),
    }),
    201353,
    'Sardargarh cash in hand after 13 May = 201,353'
  );

  // Capital purchase on credit (solar 2,144,900; 200,000 paid by cheque from money held by Ahmad Abbas):
  // the asset purchase lowers cash only by what was paid, and that payment came out of the held balance.
  t.equal(
    cashBalance({
      expenses: [{ amount: 2144900, is_capital: true }],
      creditEntries: [{ type: 'Credit Purchase', total_amount: 2144900, payments: [{ amount: 200000 }] }],
      loans: [{ type: 'Lent', principal: 370000, payments: [{ amount: 200000 }] }],
    }),
    -370000 + 200000 - 200000 + 0,
    'solar on credit: cash in hand unchanged except the original money handed to Ahmad Abbas'
  );
}
