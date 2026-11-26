import {
  normalizePartyName,
  buildPartyFinancialSummary
} from '../../src/utils/partyFinancials.js';

export default function testPartyFinancials(t) {
  t.equal(normalizePartyName('  Ali Khan  '), 'ali khan', 'normalizePartyName handles whitespace and lowercase');
  t.equal(normalizePartyName('HABIB BANK'), 'habib bank', 'normalizePartyName handles uppercase');
  t.equal(normalizePartyName(null), '', 'normalizePartyName handles null');

  const loans = [
    { id: 1, party: 'Ali Khan', type: 'Borrowed', principal: '100000', payments: [{ id: 10, amount: '30000' }] }
  ];
  const summary = buildPartyFinancialSummary({ name: 'Ali Khan', loans });
  t.equal(summary.totalBorrowed, 100000, 'calculates totalBorrowed');
  t.equal(summary.outstandingBorrowed, 70000, 'calculates outstandingBorrowed');
  t.equal(summary.weOwe, 70000, 'calculates weOwe');
  t.equal(summary.theyOwe, 0, 'calculates theyOwe');
  t.equal(summary.netBalance, -70000, 'calculates netBalance');
  t.equal(summary.status, 'We Owe', 'sets status to We Owe');

  const mixedLoans = [
    { id: 1, party: 'Zahid Trader', date: '2026-01-01', type: 'Borrowed', principal: 50000, payments: [{ id: 11, date: '2026-01-15', amount: 20000 }] }
  ];
  const creditEntries = [
    { id: 2, party: 'Zahid Trader', date: '2026-01-10', type: 'Receivable', total_amount: 15000, advance: 5000, payments: [] }
  ];

  const mixedSummary = buildPartyFinancialSummary({
    name: 'Zahid Trader',
    loans: mixedLoans,
    creditEntries
  });

  t.equal(mixedSummary.weOwe, 30000, 'mixed weOwe (50k - 20k)');
  t.equal(mixedSummary.theyOwe, 10000, 'mixed theyOwe (15k - 5k)');
  t.equal(mixedSummary.netBalance, -20000, 'net balance reflects difference');
  t.equal(mixedSummary.status, 'We Owe', 'status is We Owe');

  const timeline = mixedSummary.timeline;
  t.equal(timeline.length, 4, 'timeline includes 4 events');
  t.equal(timeline[0].runningBalance, -50000, 'first running balance is -50000');
  t.equal(timeline[timeline.length - 1].runningBalance, -20000, 'final running balance is -20000');

  const settledLoans = [
    { id: 3, party: 'Clean Farm', date: '2026-02-01', type: 'Borrowed', principal: 10000, payments: [{ id: 12, amount: 10000 }] }
  ];
  const settledSummary = buildPartyFinancialSummary({ name: 'Clean Farm', loans: settledLoans });
  t.equal(settledSummary.weOwe, 0, 'settled weOwe is 0');
  t.equal(settledSummary.theyOwe, 0, 'settled theyOwe is 0');
  t.equal(settledSummary.netBalance, 0, 'settled net balance is 0');
  t.equal(settledSummary.status, 'Settled', 'settled status is Settled');
}
