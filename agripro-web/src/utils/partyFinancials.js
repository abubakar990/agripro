import { toNumber as num, round2, creditOutstanding, loanOutstanding } from './finance.js';

export function normalizePartyName(name) {
  return (name || '').trim().toLowerCase();
}

/**
 * Builds a chronological ledger timeline for a party with running balance.
 *
 * Convention:
 * Positive balance (+): Party owes farmer (Receivable / Asset).
 * Negative balance (-): Farmer owes party (Payable / Liability).
 */
export function buildPartyLedgerTimeline({ loans = [], creditEntries = [], expenses = [], revenue = [] }) {
  const transactions = [];

  // 1. Loans
  for (const loan of loans) {
    const isBorrowed = loan.type === 'Borrowed';
    const principal = num(loan.principal);
    
    // Initial loan transaction
    transactions.push({
      id: `loan-${loan.id}`,
      rawId: loan.id,
      date: loan.date,
      module: 'Loan',
      type: isBorrowed ? 'Loan Taken (Borrowed)' : 'Loan Given (Lent)',
      description: loan.purpose ? `Loan: ${loan.purpose}` : 'Loan Contract',
      note: loan.note || '',
      farm_id: loan.farm_id,
      amount: principal,
      debit: isBorrowed ? 0 : principal,
      credit: isBorrowed ? principal : 0,
      balanceChange: isBorrowed ? -principal : principal,
      status: loan.status || 'Active'
    });

    // Loan repayments
    const payments = Array.isArray(loan.payments) ? loan.payments : [];
    for (const p of payments) {
      const pAmount = num(p.amount);
      if (pAmount <= 0) continue;

      transactions.push({
        id: `loan-pay-${p.id}`,
        rawId: p.id,
        parentId: loan.id,
        date: p.date,
        module: 'Loan Repayment',
        type: isBorrowed ? 'Repayment Made' : 'Recovery Received',
        description: isBorrowed ? `Repayment for Loan #${loan.id}` : `Recovery for Loan #${loan.id}`,
        note: p.note || '',
        farm_id: loan.farm_id,
        amount: pAmount,
        debit: isBorrowed ? pAmount : 0,
        credit: isBorrowed ? 0 : pAmount,
        balanceChange: isBorrowed ? pAmount : -pAmount,
        status: 'Paid'
      });
    }
  }

  // 2. Credit Entries
  for (const credit of creditEntries) {
    const isPayable = credit.type === 'Payable';
    const totalAmount = num(credit.total_amount);
    const advance = num(credit.advance);

    // Initial credit bill
    transactions.push({
      id: `credit-${credit.id}`,
      rawId: credit.id,
      date: credit.date,
      module: 'Credit',
      type: isPayable ? 'Credit Purchase (Payable)' : 'Credit Sale (Receivable)',
      description: credit.item ? `Credit: ${credit.item}` : 'Credit Purchase/Sale',
      note: credit.note || '',
      farm_id: credit.farm_id,
      amount: totalAmount,
      debit: isPayable ? 0 : totalAmount,
      credit: isPayable ? totalAmount : 0,
      balanceChange: isPayable ? -totalAmount : totalAmount,
      status: credit.status || 'Active'
    });

    // Advance if any
    if (advance > 0) {
      transactions.push({
        id: `credit-adv-${credit.id}`,
        rawId: credit.id,
        date: credit.date,
        module: 'Credit Advance',
        type: isPayable ? 'Advance Paid' : 'Advance Received',
        description: `Advance for Credit #${credit.id}`,
        note: 'Upfront advance',
        farm_id: credit.farm_id,
        amount: advance,
        debit: isPayable ? advance : 0,
        credit: isPayable ? 0 : advance,
        balanceChange: isPayable ? advance : -advance,
        status: 'Settled'
      });
    }

    // Credit payments
    const payments = Array.isArray(credit.payments) ? credit.payments : [];
    for (const p of payments) {
      const pAmount = num(p.amount);
      if (pAmount <= 0) continue;

      transactions.push({
        id: `credit-pay-${p.id}`,
        rawId: p.id,
        parentId: credit.id,
        date: p.date,
        module: 'Credit Payment',
        type: isPayable ? 'Payment Made' : 'Payment Received',
        description: isPayable ? `Payment for Credit #${credit.id}` : `Receipt for Credit #${credit.id}`,
        note: p.note || '',
        farm_id: credit.farm_id,
        amount: pAmount,
        debit: isPayable ? pAmount : 0,
        credit: isPayable ? 0 : pAmount,
        balanceChange: isPayable ? pAmount : -pAmount,
        status: 'Paid'
      });
    }
  }

  // 3. Direct Expenses (Cash purchases from vendor)
  for (const exp of expenses) {
    const amount = num(exp.amount);
    transactions.push({
      id: `expense-${exp.id}`,
      rawId: exp.id,
      date: exp.date,
      module: 'Expense',
      type: 'Paid Expense',
      description: exp.category ? `Expense: ${exp.category}` : 'Expense Payment',
      note: exp.note || '',
      farm_id: exp.farm_id,
      amount: amount,
      debit: 0,
      credit: 0,
      balanceChange: 0,
      status: 'Paid'
    });
  }

  // 4. Direct Revenue (Cash sales to buyer)
  for (const rev of revenue) {
    const amount = num(rev.amount);
    transactions.push({
      id: `revenue-${rev.id}`,
      rawId: rev.id,
      date: rev.date,
      module: 'Revenue',
      type: 'Received Revenue',
      description: rev.crop ? `Crop Sale: ${rev.crop}` : 'Revenue Received',
      note: rev.note || '',
      farm_id: rev.farm_id,
      amount: amount,
      debit: 0,
      credit: 0,
      balanceChange: 0,
      status: 'Received'
    });
  }

  // Sort chronologically by date
  transactions.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Calculate cumulative running balance
  let running = 0;
  for (const tx of transactions) {
    running = round2(running + tx.balanceChange);
    tx.runningBalance = running;
  }

  return transactions;
}

export function buildPartyFinancialSummary({
  name,
  contactRecord = null,
  loans = [],
  creditEntries = [],
  expenses = [],
  revenue = []
}) {
  const norm = normalizePartyName(name);
  const matchingLoans = loans.filter(l => normalizePartyName(l.party) === norm);
  const matchingCredit = creditEntries.filter(c => normalizePartyName(c.party) === norm);
  const matchingExpenses = expenses.filter(e => normalizePartyName(e.party) === norm);
  const matchingRevenue = revenue.filter(r => normalizePartyName(r.party) === norm);

  let totalBorrowed = 0;
  let outstandingBorrowed = 0;
  let totalLent = 0;
  let outstandingLent = 0;

  for (const l of matchingLoans) {
    const principal = num(l.principal);
    const outstanding = loanOutstanding(l);
    if (l.type === 'Borrowed') {
      totalBorrowed = round2(totalBorrowed + principal);
      outstandingBorrowed = round2(outstandingBorrowed + outstanding);
    } else {
      totalLent = round2(totalLent + principal);
      outstandingLent = round2(outstandingLent + outstanding);
    }
  }

  let totalPayable = 0;
  let outstandingPayable = 0;
  let totalReceivable = 0;
  let outstandingReceivable = 0;

  for (const c of matchingCredit) {
    const total = num(c.total_amount);
    const outstanding = creditOutstanding(c);
    if (c.type === 'Payable') {
      totalPayable = round2(totalPayable + total);
      outstandingPayable = round2(outstandingPayable + outstanding);
    } else {
      totalReceivable = round2(totalReceivable + total);
      outstandingReceivable = round2(outstandingReceivable + outstanding);
    }
  }

  const totalExpenseAmount = matchingExpenses.reduce((s, e) => round2(s + num(e.amount)), 0);
  const totalRevenueAmount = matchingRevenue.reduce((s, r) => round2(s + num(r.amount)), 0);

  // We Owe (our liabilities):
  const weOwe = round2(outstandingBorrowed + outstandingPayable);
  // They Owe (our assets/receivables):
  const theyOwe = round2(outstandingLent + outstandingReceivable);
  // Net balance: positive means they owe us, negative means we owe them
  const netBalance = round2(theyOwe - weOwe);

  const timeline = buildPartyLedgerTimeline({
    loans: matchingLoans,
    creditEntries: matchingCredit,
    expenses: matchingExpenses,
    revenue: matchingRevenue
  });

  return {
    name: contactRecord?.name || name,
    normalizedName: norm,
    contact: contactRecord?.contact || '',
    address: contactRecord?.address || '',
    type: contactRecord?.type || (outstandingBorrowed > 0 ? 'Lender' : outstandingLent > 0 ? 'Borrower' : 'Party'),
    note: contactRecord?.note || '',
    vendorBuyerId: contactRecord?.id || null,
    
    // Aggregates
    totalBorrowed,
    outstandingBorrowed,
    totalLent,
    outstandingLent,
    totalPayable,
    outstandingPayable,
    totalReceivable,
    outstandingReceivable,
    totalExpenses: totalExpenseAmount,
    totalRevenue: totalRevenueAmount,

    // Net Summary
    weOwe,
    theyOwe,
    netBalance,

    // Status description
    status: weOwe > theyOwe ? 'We Owe' : theyOwe > weOwe ? 'Owes Us' : 'Settled',

    // Raw datasets & ledger timeline
    loans: matchingLoans,
    creditEntries: matchingCredit,
    expenses: matchingExpenses,
    revenue: matchingRevenue,
    timeline
  };
}
