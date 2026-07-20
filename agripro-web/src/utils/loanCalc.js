/**
 * Loan interest calculation utilities for AgriPro.
 *
 * Previously `interest_rate` and `tenure_months` were stored but never used in
 * any calculation — "Outstanding" was just principal minus payments, as if every
 * loan were interest-free. This computes an actual total payable using flat-rate
 * (simple) interest over the full tenure, which is the standard method used by
 * informal lenders, commission agents (aarhtis), and most short-tenure
 * agricultural credit in Pakistan.
 *
 * Note: formal bank loans (e.g. ZTBL, commercial bank agri loans) typically use
 * reducing-balance interest instead, where interest is charged only on the
 * outstanding principal each period, so true interest owed would be lower than
 * this flat-rate estimate once repayments begin. If/when per-installment
 * amortization is needed, this is the function to extend.
 */
export const calculateLoanInterest = (principal, annualRatePercent, tenureMonths) => {
  const p = parseFloat(principal) || 0;
  const r = parseFloat(annualRatePercent) || 0;
  const months = parseInt(tenureMonths) || 0;

  if (p <= 0 || r <= 0 || months <= 0) {
    return { totalInterest: 0, totalPayable: Math.round(p * 100) / 100 };
  }

  const totalInterest = p * (r / 100) * (months / 12);
  const totalPayable = p + totalInterest;

  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100
  };
};
