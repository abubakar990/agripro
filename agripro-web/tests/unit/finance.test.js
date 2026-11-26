import { paidAmount, creditOutstanding, loanOutstanding } from '../../src/utils/finance.js';

export default function run(t) {
  // ---- paidAmount ----
  t.equal(paidAmount(null), 0, 'paidAmount of null is 0');
  t.equal(paidAmount({}), 0, 'paidAmount of an empty entry is 0');

  t.equal(
    paidAmount({ payments: [{ amount: 100 }, { amount: 250 }] }),
    350,
    'payment rows are summed'
  );

  // PostgREST can hand numerics back as strings; concatenation here would produce "0100250".
  t.equal(
    paidAmount({ payments: [{ amount: '100' }, { amount: '250' }] }),
    350,
    'string payment amounts are coerced to numbers, not concatenated'
  );

  t.equal(paidAmount({ paid: 400 }), 400, 'falls back to the denormalized paid column');
  t.equal(paidAmount({ paid: '400' }), 400, 'string paid column is coerced');
  t.equal(paidAmount({ payments: [], paid: 400 }), 400, 'empty payments array falls back to paid');

  // A repayment is written BOTH as a payment row AND to the `paid` column. Counting both
  // halves the outstanding balance and can drive it negative.
  t.equal(
    paidAmount({ payments: [{ amount: 400 }], paid: 400 }),
    400,
    'REGRESSION: payment rows and the paid column are not double counted'
  );

  t.equal(paidAmount({ advance: 50 }), 50, 'an up-front advance counts as paid');
  t.equal(
    paidAmount({ advance: 50, payments: [{ amount: 100 }] }),
    150,
    'advance is added on top of payment rows'
  );
  t.equal(paidAmount({ advance: null, paid: 100 }), 100, 'null advance is treated as 0');
  t.equal(paidAmount({ payments: 'not-an-array', paid: 30 }), 30, 'malformed payments falls back safely');

  // ---- creditOutstanding ----
  t.equal(
    creditOutstanding({ total_amount: 1000, advance: 200, payments: [{ amount: 300 }] }),
    500,
    'credit outstanding = total - advance - payments'
  );
  t.equal(
    creditOutstanding({ total_amount: '1000', advance: '200' }),
    800,
    'credit outstanding coerces string columns'
  );
  t.equal(
    creditOutstanding({ total_amount: 1000, payments: [{ amount: 1000 }] }),
    0,
    'a fully paid credit entry is exactly zero, not a rounding artefact'
  );
  t.equal(creditOutstanding({}), 0, 'credit outstanding of an empty entry is 0');

  // ---- loanOutstanding ----
  t.equal(
    loanOutstanding({ principal: 5000, paid: 1500 }),
    3500,
    'loan outstanding uses the paid column when there are no payment rows'
  );
  t.equal(
    loanOutstanding({ principal: 5000, payments: [{ amount: 1500 }], paid: 1500 }),
    3500,
    'REGRESSION: loan outstanding does not double count the paid column against payment rows'
  );
  t.equal(
    loanOutstanding({ principal: 5000, payments: [{ amount: 1000 }, { amount: 500 }], paid: 1500 }),
    3500,
    'multiple loan payments reconcile with the denormalized paid column'
  );
  t.ok(
    loanOutstanding({ principal: 5000, payments: [{ amount: 2000 }], paid: 2000 }) >= 0,
    'a partially repaid loan never reports a negative balance'
  );

  // ---- the two modules must agree ----
  // Loans.jsx and Reports.jsx compute the same figure via different call sites; both now
  // route through finance.js, so they cannot drift.
  const loan = { principal: 10000, payments: [{ amount: 2500 }], paid: 2500 };
  t.equal(
    Number(loan.principal) - paidAmount(loan),
    loanOutstanding(loan),
    'the Reports formula and loanOutstanding() produce identical results'
  );

  const entry = { total_amount: 8000, advance: 1000, payments: [{ amount: 2000 }] };
  t.equal(
    Number(entry.total_amount) - paidAmount(entry),
    creditOutstanding(entry),
    'the Reports formula and creditOutstanding() produce identical results'
  );
}
