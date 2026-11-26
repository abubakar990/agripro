// Shared money helpers. Single source of truth for "how much has been paid" and
// "how much is still outstanding" on credit entries and loans, so the Dashboard,
// Reports, CreditLedger and Loans modules can never drift apart again.
//
// The *_payments child tables are the source of truth for repayments. Neither
// credit_entries nor loans has a `paid` column in the live database any more, but the
// fallback below is kept deliberately: older deployments (and any restored backup) do
// carry a denormalized `paid`, and a repayment recorded in both places represents the
// SAME money. So count payment rows OR `paid`, never both — summing both understates
// what is outstanding and can even drive it negative.

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Every money column in the schema is DECIMAL(15,2), so a balance is only ever meaningful
// to the paisa. Summing them as IEEE doubles leaves residues of ~1e-12 on entries that are
// exactly settled (measured: ~21% of fully-paid ledgers). Those residues are invisible in
// the formatted amount but not to the comparisons the cards make: `remaining > 0` renders a
// phantom "Remaining: Rs 0" and can flag a settled entry as overdue, while `remaining === 0`
// fails to recognise a settled one. Snapping to two decimals removes the whole class.
const round2 = (n) => {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r; // normalise -0, which is not Object.is-equal to 0
};

/**
 * Total amount considered paid toward an entry.
 * Prefers explicit payment rows; falls back to the denormalized `paid` column.
 * Any up-front `advance` is included.
 */
export function paidAmount(entry) {
  if (!entry) return 0;
  const payments = Array.isArray(entry.payments) ? entry.payments : [];
  const fromPayments = payments.reduce((sum, p) => sum + num(p.amount), 0);
  const base = payments.length > 0 ? fromPayments : num(entry.paid);
  return round2(base + num(entry.advance));
}

/** Outstanding balance on a credit entry (billed against `total_amount`). */
export function creditOutstanding(entry) {
  return round2(num(entry?.total_amount) - paidAmount(entry));
}

/** Outstanding balance on a loan (billed against `principal`). */
export function loanOutstanding(loan) {
  return round2(num(loan?.principal) - paidAmount(loan));
}

export { num as toNumber, round2 };
