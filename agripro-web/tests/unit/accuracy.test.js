// Accuracy suite.
//
// The existing suites (finance, dataFilters, math) pin down specific regressions with
// hand-picked examples. This one attacks the same code from the other direction: it checks
// the *invariants* that have to hold for every input, fuzzes them over tens of thousands of
// randomised ledgers, and — for the geodesic area maths — checks our numbers against an
// independent oracle (Turf, which the map already depends on) rather than against a value
// we computed with the same formula we are testing.
//
// Everything here is deterministic: the PRNG is seeded, and every time-dependent assertion
// is given an explicit `now`.

import * as turf from '@turf/turf';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { paidAmount, creditOutstanding, loanOutstanding, toNumber } from '../../src/utils/finance.js';
import {
  filterByFarm, filterByDate, applyFilters, resolveDateWindow,
} from '../../src/utils/dataFilters.js';
import { calculateAcresFromLatLngs } from '../../src/utils/geoUtils.js';
import { resolveArea, perAcre, totalArea, getPlotScore } from '../../src/utils/perAcreCalc.js';
import { formatPKR, formatDate } from '../../src/utils/format.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const M2_PER_ACRE = 4046.8564224;
const NOW = new Date('2026-06-15T12:00:00Z');
const DAY = 86400000;

/** Seeded PRNG, so a fuzz failure is reproducible rather than a one-off. */
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
/** Random amount with exactly two decimals, i.e. what DECIMAL(15,2) can actually hold. */
const paisa = (rnd, max = 1_000_000) => Math.round(rnd() * max * 100) / 100;

export default function run(t) {
  // =========================================================================
  // A. Money is only ever meaningful to the paisa
  // =========================================================================

  t.equal(
    creditOutstanding({ total_amount: 0.3, payments: [{ amount: 0.1 }, { amount: 0.2 }] }),
    0,
    'an entry paid off in exact paisa settles at exactly 0, not an IEEE residue'
  );

  // The residue is invisible once formatted, which is precisely why it used to survive
  // into the UI: the card printed "Rs 0" while still taking the unsettled branch.
  t.equal(formatPKR(1.8189894035458565e-12), 'Rs 0', 'a float residue formats as "Rs 0" and hides itself');

  {
    const rnd = mulberry32(20260915);
    let nonZero = 0, wrongSide = 0, worst = 0;
    for (let i = 0; i < 20000; i++) {
      const total = paisa(rnd);
      const first = Math.round(total * rnd() * 100) / 100;
      const rest = Math.round((total - first) * 100) / 100;
      const entry = { total_amount: total, payments: [{ amount: first }, { amount: rest }] };
      const out = creditOutstanding(entry);
      if (out !== 0) { nonZero++; worst = Math.max(worst, Math.abs(out)); }
      // These two are the exact predicates CreditLedger.jsx and Loans.jsx branch on.
      if (out > 0 || !(out === 0)) wrongSide++;
    }
    t.equal(nonZero, 0, `20,000 exactly-settled credit entries all report 0 (worst residue ${worst})`);
    t.equal(wrongSide, 0, 'REGRESSION: no settled entry trips `remaining > 0` or fails `remaining === 0`');
  }

  {
    const rnd = mulberry32(777);
    let bad = 0;
    for (let i = 0; i < 20000; i++) {
      const principal = paisa(rnd);
      const half = Math.round(principal * 0.5 * 100) / 100;
      const out = loanOutstanding({
        principal,
        payments: [{ amount: half }, { amount: Math.round((principal - half) * 100) / 100 }],
      });
      if (out !== 0) bad++;
    }
    t.equal(bad, 0, '20,000 fully repaid loans all report exactly 0');
  }

  // Death by a thousand instalments: the residue accumulates with the payment count.
  t.equal(
    creditOutstanding({ total_amount: 10, payments: Array.from({ length: 1000 }, () => ({ amount: 0.01 })) }),
    0,
    '1,000 instalments of Rs 0.01 against Rs 10 settle to exactly 0'
  );

  // DECIMAL(15,2) tops out at 13 integer digits; doubles hold that exactly.
  t.equal(
    creditOutstanding({ total_amount: '9999999999999.99', payments: [{ amount: '0.01' }] }),
    9999999999999.98,
    'the largest value the column can hold survives the subtraction'
  );

  t.ok(!Object.is(creditOutstanding({ total_amount: 0.3, payments: [{ amount: 0.3 }] }), -0),
    'a settled balance is +0, never -0 (which would fail a strict === 0 check under Object.is)');

  // =========================================================================
  // B. Ledger invariants over randomised data
  // =========================================================================

  {
    const rnd = mulberry32(31415);
    let identityBroken = 0, negativeFromOverpay = 0, monotonicBroken = 0;
    for (let i = 0; i < 20000; i++) {
      const total = paisa(rnd);
      const payments = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({ amount: paisa(rnd, total) }));
      const entry = { total_amount: total, advance: rnd() < 0.3 ? paisa(rnd, total / 4) : null, payments };

      // paid + outstanding must reconstruct the invoice total, to the paisa.
      if (Math.abs(paidAmount(entry) + creditOutstanding(entry) - total) > 0.005) identityBroken++;

      // Adding another payment can never increase what is still owed.
      const before = creditOutstanding(entry);
      const after = creditOutstanding({ ...entry, payments: [...payments, { amount: paisa(rnd, 100) }] });
      if (after > before + 1e-9) monotonicBroken++;

      // Overpayment is the only way to a negative balance, and it must be reported as such
      // rather than clamped — a negative balance is how the user sees they refunded too much.
      if (creditOutstanding(entry) < 0 && paidAmount(entry) <= total) negativeFromOverpay++;
    }
    t.equal(identityBroken, 0, 'INVARIANT: paid + outstanding == total, over 20,000 random ledgers');
    t.equal(monotonicBroken, 0, 'INVARIANT: recording a payment never increases the outstanding balance');
    t.equal(negativeFromOverpay, 0, 'INVARIANT: a balance only goes negative when the entry is genuinely overpaid');
  }

  // =========================================================================
  // C. PostgREST hands numerics back as strings — every path must agree
  // =========================================================================

  {
    const rnd = mulberry32(2718);
    let mismatched = 0;
    for (let i = 0; i < 5000; i++) {
      const total = paisa(rnd);
      const payments = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => ({ amount: paisa(rnd, total) }));
      const asNumbers = { total_amount: total, principal: total, advance: paisa(rnd, 50), payments };
      const asStrings = {
        total_amount: total.toFixed(2),
        principal: total.toFixed(2),
        advance: asNumbers.advance.toFixed(2),
        payments: payments.map((p) => ({ amount: p.amount.toFixed(2) })),
      };
      if (paidAmount(asNumbers) !== paidAmount(asStrings)) mismatched++;
      if (creditOutstanding(asNumbers) !== creditOutstanding(asStrings)) mismatched++;
      if (loanOutstanding(asNumbers) !== loanOutstanding(asStrings)) mismatched++;
    }
    t.equal(mismatched, 0, 'string and numeric column forms produce identical money, over 5,000 ledgers');
  }

  t.equal(toNumber('1e3'), 1000, 'exponent notation parses');
  t.equal(toNumber('  250.50  '), 250.5, 'whitespace-padded numerics parse');
  t.equal(toNumber(Infinity), 0, 'a non-finite value is treated as 0, never propagated into a total');
  t.equal(toNumber('12,500'), 12, 'CHARACTERISTIC: parseFloat stops at the thousands separator (never feed it formatted text)');
  t.equal(formatPKR(NaN), 'Rs 0', 'CHARACTERISTIC: formatPKR renders NaN as "Rs 0" — it masks upstream arithmetic faults');
  t.equal(formatDate('not-a-date'), '—', 'an unparseable date renders as a dash rather than "Invalid Date"');

  // =========================================================================
  // D. Filtering must partition the data, not lose or duplicate it
  // =========================================================================

  {
    const rnd = mulberry32(161803);
    const farmIds = [1, 2, 3, 4, 5];
    const rows = Array.from({ length: 5000 }, (_, id) => {
      const d = new Date(NOW.getTime() - Math.floor(rnd() * 500) * DAY);
      return {
        id,
        farm_id: farmIds[Math.floor(rnd() * farmIds.length)],
        date: d.toISOString().split('T')[0],
        amount: paisa(rnd),
      };
    });
    const sum = (rs) => Math.round(rs.reduce((s, r) => s + r.amount, 0) * 100) / 100;

    const perFarm = farmIds.reduce((s, id) => s + filterByFarm(rows, id).length, 0);
    t.equal(perFarm, rows.length, 'INVARIANT: the per-farm views partition the dataset exactly once');
    t.equal(
      Math.round(farmIds.reduce((s, id) => s + sum(filterByFarm(rows, id)), 0) * 100) / 100,
      sum(rows),
      'INVARIANT: the per-farm totals add up to the all-farms total (no double counting)'
    );

    // Same partition property must hold with the date filter layered on, which is what
    // makes "All Farms" on the Dashboard trustworthy.
    const opts = { dateRange: '90d' };
    const windowed = filterByDate(rows, '90d', {}, NOW);
    t.equal(
      farmIds.reduce((s, id) => s + applyFilters(rows, { ...opts, farmFilter: id }, NOW).length, 0),
      windowed.length,
      'INVARIANT: farm + date views still partition the windowed dataset exactly'
    );

    // Order matters for the "recent transactions" list, and filtering must not disturb it.
    const filtered = applyFilters(rows, { farmFilter: 2, dateRange: '30d' }, NOW);
    t.ok(filtered.every((r, i) => i === 0 || filtered[i - 1].id < r.id), 'filtering preserves row order');
    t.ok(filtered.every((r) => rows.includes(r)), 'filtering returns the original row objects, never copies');
    t.equal(
      applyFilters(filtered, { farmFilter: 2, dateRange: '30d' }, NOW).length,
      filtered.length,
      'INVARIANT: applying the same filter twice is a no-op (idempotent)'
    );
    t.equal(
      filterByDate(filterByFarm(rows, 3), '30d', {}, NOW).length,
      filterByFarm(filterByDate(rows, '30d', {}, NOW), 3).length,
      'INVARIANT: the farm and date filters commute'
    );

    t.ok(filterByFarm(rows, 'all') === rows,
      'CHARACTERISTIC: "all" returns the caller\'s array by reference — callers must not sort it in place');
  }

  // =========================================================================
  // E. Date windows
  // =========================================================================

  for (const [range, days] of [['7d', 7], ['30d', 30], ['90d', 90], ['1y', 365]]) {
    const { start } = resolveDateWindow(range, {}, NOW);
    const spanDays = (NOW - start) / DAY;
    // Tolerance absorbs DST and leap years so this holds in every timezone CI might run in.
    t.ok(Math.abs(spanDays - days) <= 1.1, `${range} resolves to a window ~${days} days wide (got ${spanDays.toFixed(2)})`);
  }

  // The window inherits the current time of day, so the row dated exactly N days ago falls
  // just outside it. Worth knowing when a total is compared against a hand-tallied figure.
  t.equal(
    filterByDate([{ id: 1, date: '2026-05-16' }], '30d', {}, NOW).length,
    0,
    'CHARACTERISTIC: "last 30 days" starts 30x24h ago, so the row dated exactly 30 days back is excluded'
  );
  t.equal(
    filterByDate([{ id: 1, date: '2026-05-17' }], '30d', {}, NOW).length,
    1,
    'the row one day inside the 30-day window is kept'
  );

  // Calendar arithmetic that trips setDate/setFullYear.
  t.equal(
    resolveDateWindow('30d', {}, new Date('2026-03-31T12:00:00Z')).start.toISOString().split('T')[0],
    '2026-03-01',
    '30d back from 31 March rolls through the short month correctly'
  );
  t.equal(
    resolveDateWindow('1y', {}, new Date('2028-02-29T12:00:00Z')).start.toISOString().split('T')[0],
    '2027-03-01',
    'CHARACTERISTIC: 1y back from 29 Feb lands on 1 March (JS rolls the invalid 29 Feb 2027 forward)'
  );

  t.deepEqual(
    filterByDate([{ id: 1, date: '2026-03-01' }], 'custom', { start: '2026-06-01', end: '2026-01-01' }, NOW),
    [],
    'a reversed custom range (start after end) matches nothing rather than silently swapping'
  );
  t.equal(
    filterByDate([{ id: 1, date: '2026-01-31T18:30:00Z' }], 'custom', { start: '2026-01-01', end: '2026-01-31' }, NOW).length,
    1,
    'a timestamped row on the final day of a custom range is inside it (end-of-day boundary)'
  );

  // The 'date' column wins over 'created_at' — an expense back-dated to last season must
  // filter on when it happened, not on when it was typed in.
  t.equal(
    filterByDate(
      [{ id: 1, date: '2026-06-14', created_at: '2020-01-01T00:00:00Z' }],
      '7d', {}, NOW
    ).length,
    1,
    'a back-dated row filters on `date`, not on `created_at`'
  );

  // =========================================================================
  // F. Geodesic area, checked against Turf rather than against itself
  // =========================================================================

  const squareRing = (lat, lng, sideM) => {
    const dLat = (sideM / 2) / 111320;
    const dLng = (sideM / 2) / (111320 * Math.cos((lat * Math.PI) / 180));
    return [
      { lat: lat - dLat, lng: lng - dLng },
      { lat: lat - dLat, lng: lng + dLng },
      { lat: lat + dLat, lng: lng + dLng },
      { lat: lat + dLat, lng: lng - dLng },
    ];
  };
  const turfAcres = (ring) => {
    const coords = ring.map((p) => [p.lng, p.lat]);
    coords.push(coords[0]);
    return turf.area(turf.polygon([coords])) / M2_PER_ACRE;
  };
  // Our result is rounded to 0.01 acre, so allow that plus 0.2% of model error.
  const agrees = (ring) => {
    const ref = turfAcres(ring);
    return Math.abs(calculateAcresFromLatLngs(ring) - ref) <= 0.005 + 0.002 * ref;
  };

  for (const [lat, side, label] of [
    [31.4187, 63.6, 'a 1-acre plot in Faisalabad'],
    [31.4187, 201, 'a 10-acre block'],
    [31.4187, 636, 'a 100-acre farm'],
    [31.4187, 2011, 'a 1,000-acre estate'],
    [0, 201, 'the same block on the equator'],
    [60, 201, 'the same block at 60°N (heavy meridian convergence)'],
    [-31.4187, 201, 'the same block in the southern hemisphere'],
  ]) {
    t.ok(agrees(squareRing(lat, 73.0791, side)), `area matches Turf for ${label}`);
  }

  {
    // Irregular, star-shaped (hence simple) polygons around a Punjab field.
    const rnd = mulberry32(999);
    let disagreements = 0, worstRel = 0;
    for (let i = 0; i < 300; i++) {
      const n = 5 + Math.floor(rnd() * 10);
      const radius = 40 + rnd() * 400; // metres
      const ring = Array.from({ length: n }, (_, k) => {
        const angle = (2 * Math.PI * k) / n;
        const r = radius * (0.6 + 0.4 * rnd());
        return {
          lat: 31.4187 + (r * Math.sin(angle)) / 111320,
          lng: 73.0791 + (r * Math.cos(angle)) / (111320 * Math.cos((31.4187 * Math.PI) / 180)),
        };
      });
      const ref = turfAcres(ring);
      const diff = Math.abs(calculateAcresFromLatLngs(ring) - ref);
      worstRel = Math.max(worstRel, diff / ref);
      if (diff > 0.005 + 0.002 * ref) disagreements++;
    }
    t.equal(disagreements, 0, `300 irregular field shapes all match Turf (worst relative error ${(worstRel * 100).toFixed(3)}%)`);
  }

  {
    const ring = squareRing(31.4187, 73.0791, 201);
    const acres = calculateAcresFromLatLngs(ring);
    t.equal(calculateAcresFromLatLngs([...ring].reverse()), acres, 'INVARIANT: winding direction does not change the area');
    t.equal(calculateAcresFromLatLngs([...ring.slice(2), ...ring.slice(0, 2)]), acres, 'INVARIANT: the starting vertex does not change the area');
    t.equal(calculateAcresFromLatLngs([...ring, ring[0]]), acres, 'a ring that repeats its first point as a closing point measures the same');
    t.equal(calculateAcresFromLatLngs(squareRing(31.4187, 83.0791, 201)), acres, 'INVARIANT: moving the same plot 10° east does not change its area');
    // Doubling every side must quadruple the area.
    t.close(calculateAcresFromLatLngs(squareRing(31.4187, 73.0791, 402)) / acres, 4, 0.02, 'INVARIANT: doubling the sides quadruples the area');
  }

  t.equal(calculateAcresFromLatLngs([{ lat: 31.4, lng: 73.1 }, { lat: 31.4, lng: 73.2 }]), 0, 'a two-point sliver has no area');
  t.equal(calculateAcresFromLatLngs(null), 0, 'a null ring has no area');
  t.ok(
    calculateAcresFromLatLngs([
      { lat: 0, lng: 179.999 }, { lat: 0, lng: -179.999 },
      { lat: 0.002, lng: -179.999 }, { lat: 0.002, lng: 179.999 },
    ]) > 1e6,
    'KNOWN LIMIT: a ring crossing the ±180° antimeridian is not supported (AgriPro operates near 73°E)'
  );

  // =========================================================================
  // G. Area resolution and per-acre figures
  // =========================================================================

  const ctx = {
    farmPlots: [{ id: 1, area_acres: '2.5' }, { id: 2, area_acres: '7.25' }],
    cropCycles: [{ id: 7, area_acres: '4' }],
    farms: [{ id: 3, area_acres: '10' }],
  };

  t.equal(resolveArea({ plot_id: '1' }, ctx), null,
    'CHARACTERISTIC: ids are matched strictly, so a string plot_id resolves nothing (forms must parseInt before saving)');
  t.equal(resolveArea({ area_acres: '-5', plot_id: 1 }, ctx), 2.5, 'a negative area on the entry is ignored and the chain continues');
  t.equal(resolveArea({ area_acres: 'abc', plot_id: 1 }, ctx), 2.5, 'an unparseable area on the entry falls through to the plot');
  t.equal(resolveArea({}, ctx), null, 'an entry with no links at all resolves to null');

  {
    const rnd = mulberry32(4242);
    let broken = 0;
    for (let i = 0; i < 5000; i++) {
      const amount = paisa(rnd, 500000);
      const area = Math.round((0.1 + rnd() * 50) * 100) / 100;
      const per = perAcre(amount, area);
      // perAcre rounds to 2dp, so rebuilding the amount is accurate to half a paisa per acre
      // (the 1e-9 absorbs float noise exactly on that bound).
      if (Math.abs(per * area - amount) > 0.005 * area + 1e-9) broken++;
    }
    t.equal(broken, 0, 'INVARIANT: perAcre(amount, area) x area reconstructs the amount to within half a paisa/acre, over 5,000 cases');
  }

  t.equal(perAcre(-5000, 2.5), -2000, 'a loss is reported as a negative per-acre figure, not swallowed');
  t.equal(perAcre(0, 2.5), null, 'CHARACTERISTIC: a zero amount yields null (dash) rather than "Rs 0" per acre');
  t.equal(perAcre(5000, -2.5), null, 'a negative area cannot produce a per-acre figure');

  {
    // Mixed sources: two entries on one plot, one on a second plot, one on a crop cycle,
    // one on a farm. Each distinct source is counted once: 2.5 + 7.25 + 4 + 10.
    const entries = [
      { id: 1, plot_id: 1 }, { id: 2, plot_id: 1 }, { id: 3, plot_id: 2 },
      { id: 4, crop_cycle_id: 7 }, { id: 5, farm_id: 3 },
    ];
    t.equal(totalArea(entries, ctx), 23.75, 'every distinct area source is counted exactly once across mixed links');
    t.equal(totalArea([{ id: 1, plot_id: 999 }], ctx), null, 'entries linked only to unknown plots contribute no area');

    const rnd = mulberry32(8080);
    let exceeded = 0;
    const plots = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, area_acres: Math.round((0.5 + rnd() * 20) * 100) / 100 }));
    const ceiling = plots.reduce((s, p) => s + Number(p.area_acres), 0);
    for (let i = 0; i < 500; i++) {
      const rows = Array.from({ length: 200 }, (_, id) => ({ id, plot_id: 1 + Math.floor(rnd() * 40) }));
      if (totalArea(rows, { farmPlots: plots }) > ceiling + 1e-9) exceeded++;
    }
    t.equal(exceeded, 0, 'INVARIANT: total area never exceeds the sum of the distinct plots, however many entries reference them');
  }

  // Score is symmetric around 50 and monotonic in profit.
  {
    const plot = { id: 1, area_acres: '2.5' };
    const score = (profit) => getPlotScore(1, {
      farmPlots: [plot],
      revenue: [{ amount: Math.max(profit, 0) + 1000, plot_id: 1 }],
      expenses: [{ amount: Math.max(-profit, 0) + 1000, plot_id: 1 }],
    });
    t.equal(score(0), 50, 'breaking even scores 50');
    let monotonic = true;
    let last = -1;
    for (const p of [-100000, -20000, -5000, 0, 5000, 20000, 100000]) {
      const s = score(p);
      if (s < last) monotonic = false;
      last = s;
    }
    t.ok(monotonic, 'INVARIANT: the plot score never falls as profit rises');
  }

  // =========================================================================
  // H. Drift guards — the modules that show money must share one implementation
  // =========================================================================

  {
    const read = (p) => readFileSync(join(SRC, p), 'utf8');
    const moneyModules = [
      'components/modules/Dashboard.jsx',
      'components/modules/Reports.jsx',
      'components/modules/CreditLedger.jsx',
      'components/modules/Loans.jsx',
    ];
    let notShared = 0, reimplemented = 0;
    for (const p of moneyModules) {
      const src = read(p);
      if (!/from ['"](\.\.\/)+utils\/finance['"]/.test(src)) notShared++;
      // A local re-derivation of "total minus paid" is exactly how these pages drifted before.
      if (/-\s*getPaidAmount\(|payments\s*\.reduce|\.payments\s*\|\|\s*\[\]/.test(src)) reimplemented++;
    }
    t.equal(notShared, 0, 'every module that displays a balance imports utils/finance');
    t.equal(reimplemented, 0, 'DRIFT GUARD: no module re-derives "total minus paid" locally');

    // The three filtering entry points must all come from utils/dataFilters, or the
    // Dashboard and Reports can disagree about what the date chip means again.
    for (const p of ['hooks/useFilteredData.js', 'hooks/useFilteredDashboardData.js', 'hooks/useDateFilter.js']) {
      t.ok(
        /from ['"](\.\.\/)+utils\/dataFilters['"]/.test(read(p)),
        `${p} filters through utils/dataFilters rather than its own copy`
      );
    }
  }
}
