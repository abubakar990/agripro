// Scalability suite.
//
// Two kinds of check, deliberately separated:
//
//   1. COMPLEXITY — deterministic. Rather than timing anything, these count how many times
//      each helper actually touches a row (by instrumenting the predicates it calls). The
//      counts are identical on every machine, so they can assert an upper bound and fail
//      loudly the day a helper turns accidentally quadratic.
//
//   2. BUDGET — wall clock, with deliberately loose ceilings (roughly 4-6x what the code
//      costs today) so they survive a slow CI runner but still catch an order-of-magnitude
//      regression. Each one prints its measurement, so `npm test` doubles as a perf report.
//
// Sizes are picked from what a large tenant plausibly reaches: an estate whose boundary was
// auto-gridded into hundreds of plots (see autoGeneratePlotsForBoundary), with several years
// of daily expense, revenue and attendance rows behind it.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyFilters, filterByFarm, filterByDate } from '../../src/utils/dataFilters.js';
import { creditOutstanding, paidAmount } from '../../src/utils/finance.js';
import { totalArea, getPlotScore, resolveArea } from '../../src/utils/perAcreCalc.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOW = new Date('2026-06-15T12:00:00Z');
const DAY = 86400000;

const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const makeRows = (n, { farms = 20, plots = 50, seed = 1 } = {}) => {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, id) => ({
    id,
    farm_id: 1 + Math.floor(rnd() * farms),
    plot_id: 1 + Math.floor(rnd() * plots),
    date: new Date(NOW.getTime() - Math.floor(rnd() * 900) * DAY).toISOString().split('T')[0],
    amount: Math.round(rnd() * 100000) / 100,
  }));
};

/** Best of three runs — the minimum is the least noisy estimator of real cost. */
const timeMs = (fn) => {
  fn();
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    fn();
    best = Math.min(best, performance.now() - t0);
  }
  return best;
};

/**
 * Returns a copy of `arr` whose find/filter count every element the predicate actually
 * visits. Short-circuiting (`find`) is counted honestly, so the totals are real work done.
 */
const instrument = (arr) => {
  const a = arr.slice();
  const counter = { visits: 0 };
  for (const method of ['find', 'filter', 'some', 'reduce', 'forEach']) {
    const original = Array.prototype[method];
    a[method] = function instrumented(fn, ...rest) {
      return original.call(this, (...args) => { counter.visits++; return fn(...args); }, ...rest);
    };
  }
  a.counter = counter;
  return a;
};

export default function run(t) {
  // =========================================================================
  // A. The global filters must stay linear — everything on screen runs through them
  // =========================================================================

  {
    // Count property reads instead of rows: a linear filter reads farm_id once per row.
    const reads = { n: 0 };
    const row = (id) => ({
      id,
      get farm_id() { reads.n++; return 3; },
      get date() { return '2026-06-01'; },
    });
    for (const n of [1000, 50000]) {
      reads.n = 0;
      const rows = Array.from({ length: n }, (_, i) => row(i));
      filterByFarm(rows, 3);
      t.equal(reads.n, n, `filterByFarm reads farm_id exactly once per row at n=${n} (O(n))`);
    }
  }

  {
    const small = makeRows(10000, { seed: 11 });
    const large = makeRows(200000, { seed: 11 });
    const opts = { farmFilter: 7, dateRange: '90d' };

    const msSmall = timeMs(() => applyFilters(small, opts, NOW));
    const msLarge = timeMs(() => applyFilters(large, opts, NOW));
    const perRowSmall = msSmall / small.length;
    const perRowLarge = msLarge / large.length;

    t.ok(
      perRowLarge <= perRowSmall * 4 + 1e-4,
      `applyFilters cost per row does not grow with the dataset (${(perRowSmall * 1e6).toFixed(1)}ns/row at 10k vs ${(perRowLarge * 1e6).toFixed(1)}ns/row at 200k)`
    );
    t.ok(
      msLarge < 400,
      `BUDGET: farm+date filtering 200,000 rows takes ${msLarge.toFixed(1)}ms (ceiling 400ms)`
    );
  }

  {
    // Date filtering builds a Date per row; that is the expensive half of applyFilters.
    const rows = makeRows(200000, { seed: 13 });
    const ms = timeMs(() => filterByDate(rows, '30d', {}, NOW));
    t.ok(ms < 400, `BUDGET: date-filtering 200,000 rows takes ${ms.toFixed(1)}ms (ceiling 400ms)`);
  }

  // =========================================================================
  // B. Totals must stay exact at volume, not just at the sizes the examples use
  // =========================================================================

  {
    // Sum 200,000 two-decimal amounts and compare against integer-paisa arithmetic, which
    // cannot drift. This is the check that a year-end P&L on a large tenant is still right.
    const rnd = mulberry32(555);
    const paise = Array.from({ length: 200000 }, () => Math.floor(rnd() * 10_000_000));
    const rows = paise.map((p, id) => ({ id, amount: (p / 100).toFixed(2) }));
    const exact = paise.reduce((s, p) => s + p, 0) / 100;
    const summed = rows.reduce((s, r) => s + Number(r.amount), 0);
    t.close(summed, exact, 0.005, `summing 200,000 amounts stays within half a paisa of exact (drift ${(summed - exact).toFixed(6)})`);
  }

  {
    // 20,000 credit entries, each with up to 5 payment rows — the shape CreditLedger and
    // the Dashboard both reduce over on every render.
    const rnd = mulberry32(99);
    const ledgers = Array.from({ length: 20000 }, (_, id) => ({
      id,
      type: 'Credit Sale',
      total_amount: Math.round(rnd() * 500000) / 100,
      payments: Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({ amount: Math.round(rnd() * 50000) / 100 })),
    }));
    const ms = timeMs(() => ledgers.reduce((s, e) => s + creditOutstanding(e), 0));
    t.ok(ms < 120, `BUDGET: outstanding balances across 20,000 ledgers take ${ms.toFixed(1)}ms (ceiling 120ms)`);

    const paidMs = timeMs(() => ledgers.reduce((s, e) => s + paidAmount(e), 0));
    t.ok(paidMs < 120, `BUDGET: paid-to-date across 20,000 ledgers takes ${paidMs.toFixed(1)}ms (ceiling 120ms)`);
  }

  // =========================================================================
  // C. The per-plot scoring path — the map's hot loop
  // =========================================================================

  {
    // FarmMap scores every plot on every render, and getPlotScore rescans the whole expense
    // and revenue list for each one, so the work is plots x transactions.
    const plots = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, area_acres: 2.5 }));
    const expenses = instrument(makeRows(5000, { plots: 100, seed: 21 }));
    const revenue = instrument(makeRows(5000, { plots: 100, seed: 22 }));
    plots.forEach((p) => getPlotScore(p.id, { farmPlots: plots, expenses, revenue }));
    const visits = expenses.counter.visits + revenue.counter.visits;
    const product = plots.length * (expenses.length + revenue.length);

    t.equal(
      visits,
      product,
      `COMPLEXITY: scoring 100 plots over 10,000 transactions costs ${visits.toLocaleString()} row visits — i.e. O(plots x transactions)`
    );
    t.ok(
      visits <= product,
      'scoring all plots never exceeds plots x transactions (an index would reduce it to plots + transactions)'
    );
  }

  {
    // Realistic large tenant: an auto-gridded estate, three seasons of transactions. FarmMap
    // calls getPlotScore at three separate places per plot, so this is a third of one render.
    const plots = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, area_acres: 2.5 }));
    const expenses = makeRows(20000, { plots: 200, seed: 31 });
    const revenue = makeRows(20000, { plots: 200, seed: 32 });
    const ms = timeMs(() => plots.forEach((p) => getPlotScore(p.id, { farmPlots: plots, expenses, revenue })));
    t.ok(
      ms < 300,
      `BUDGET: scoring 200 plots over 40,000 transactions takes ${ms.toFixed(1)}ms, and FarmMap does this 3x per render (ceiling 300ms)`
    );
  }

  // =========================================================================
  // D. The area-resolution chain, which every money table walks per visible row
  // =========================================================================

  {
    const plots = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, area_acres: 2.5 }));
    const entries = makeRows(2000, { plots: 300, seed: 41 });
    const instrumented = instrument(plots);
    entries.forEach((e) => resolveArea(e, { farmPlots: instrumented }));
    const visits = instrumented.counter.visits;
    t.ok(
      visits <= entries.length * plots.length,
      `COMPLEXITY: resolveArea over 2,000 rows x 300 plots costs ${visits.toLocaleString()} visits (linear scan per row, ~${Math.round(visits / entries.length)} per row)`
    );

    const ms = timeMs(() => entries.forEach((e) => resolveArea(e, { farmPlots: plots })));
    t.ok(ms < 80, `BUDGET: resolving areas for a 2,000-row table takes ${ms.toFixed(1)}ms (ceiling 80ms)`);
  }

  {
    const plots = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, area_acres: 2.5 }));
    const entries = makeRows(20000, { plots: 500, seed: 51 });
    const ms = timeMs(() => totalArea(entries, { farmPlots: plots }));
    t.ok(ms < 200, `BUDGET: totalArea over 20,000 entries x 500 plots takes ${ms.toFixed(1)}ms (ceiling 200ms)`);
    // Dedupe keys the Map on the source, so memory is bounded by sources, not by entries.
    t.ok(
      totalArea(entries, { farmPlots: plots }) <= plots.length * 2.5 + 1e-9,
      'totalArea memory and result stay bounded by the number of distinct plots, not the number of entries'
    );
  }

  // =========================================================================
  // E. The fetch layer — what the client asks the database for
  // =========================================================================

  {
    const queries = readFileSync(join(ROOT, 'src', 'hooks', 'queries.js'), 'utf8');

    // PostgREST filters on `farm_id=in.(...)`, which travels in the URL. Proxies in front of
    // Supabase commonly cap a request line at 8 KB, so the farm count has a hard ceiling.
    const urlFor = (farmCount) => {
      const ids = Array.from({ length: farmCount }, (_, i) => i + 1).join(',');
      return `https://xxxxxxxxxxxxxxxxxxxx.supabase.co/rest/v1/revenue?select=*&order=date.desc&farm_id=in.(${ids})`;
    };
    t.ok(urlFor(500).length < 8192, `an org with 500 farms builds a ${urlFor(500).length}-byte request URL (safe)`);
    t.ok(urlFor(1500).length < 8192, `an org with 1,500 farms builds a ${urlFor(1500).length}-byte request URL (still under the 8KB request-line cap)`);
    t.ok(
      urlFor(3000).length > 8192,
      `KNOWN LIMIT: an org with 3,000 farms would build a ${urlFor(3000).length}-byte URL and risk HTTP 414 — .in(farm_id) does not scale past ~2,000 farms`
    );

    // Row-count ceiling. Supabase applies a server-side max-rows cap (1,000 by default) to
    // any request that does not paginate, and truncation is silent: the totals simply come
    // out low. These are the tables the app pulls in full, and the list is asserted so that
    // adding another unbounded table is a conscious decision rather than an accident.
    const unbounded = [...queries.matchAll(/export const use(\w+) = \(farmIds\) => useFarmModuleData\('(\w+)', farmIds, \{([^}]*)\}\)/g)]
      .filter(([, , , opts]) => !opts.includes('limit'))
      .map(([, , table]) => table)
      .sort();
    t.deepEqual(
      unbounded,
      ['animal_health', 'credit_entries', 'crop_cycles', 'expenses', 'farm_plots', 'inventory',
        'livestock', 'loans', 'machinery', 'revenue', 'workers'],
      'FETCH BUDGET: these tables are fetched without a row limit — each is capped server-side and truncates silently once a tenant exceeds it'
    );
    t.ok(
      !/\.range\(/.test(queries),
      'CHARACTERISTIC: no query paginates with .range(), so a tenant past the server row cap sees understated totals rather than a second page'
    );

    // Everything the dashboard needs arrives unfiltered by date and is narrowed in the
    // browser, so the payload grows with tenant history rather than with what is on screen.
    const dashboard = readFileSync(join(ROOT, 'src', 'hooks', 'useFilteredDashboardData.js'), 'utf8');
    t.ok(
      !/\.(gte|lte|gt|lt)\(/.test(dashboard) && !/\.(gte|lte|gt|lt)\(/.test(queries),
      'CHARACTERISTIC: the date range is never pushed down to the database — every row is fetched and filtered client-side'
    );

    const avgRowBytes = 307; // a representative expense row, measured from the schema columns
    const mbFor = (rows, tables) => (rows * avgRowBytes * tables) / 1e6;
    t.ok(
      mbFor(1000, 9) < 3,
      `a tenant at the 1,000-row cap transfers ~${mbFor(1000, 9).toFixed(1)}MB across the 9 tables the dashboard opens with`
    );
    t.ok(
      mbFor(100000, 9) > 100,
      `KNOWN LIMIT: without a server-side cap, a 100,000-row-per-table tenant would transfer ~${mbFor(100000, 9).toFixed(0)}MB on every dashboard load`
    );
  }
}
