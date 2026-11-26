import {
  filterByFarm,
  filterByDate,
  applyFilters,
  resolveDateWindow,
} from '../../src/utils/dataFilters.js';

// Fixed "now" so the relative ranges are deterministic.
const NOW = new Date('2026-06-15T12:00:00Z');
const daysAgo = (n) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export default function run(t) {
  // ---- farm filter ----
  const rows = [
    { id: 1, farm_id: 1, amount: 10 },
    { id: 2, farm_id: 2, amount: 20 },
    { id: 3, farm_id: 1, amount: 30 },
  ];

  t.equal(filterByFarm(rows, 'all').length, 3, "farmFilter 'all' keeps every row");
  t.equal(filterByFarm(rows, 1).length, 2, 'numeric farm id filters correctly');
  // The filter buttons hand back ids that can arrive as strings.
  t.equal(filterByFarm(rows, '1').length, 2, 'string farm id is coerced and filters correctly');
  t.equal(filterByFarm(rows, 99).length, 0, 'unknown farm id yields no rows');
  t.deepEqual(filterByFarm(null, 1), [], 'non-array input yields empty array');

  // The farms table keys on `id`, not `farm_id` — Reports and the dashboard rely on this.
  const farms = [{ id: 1, name: 'North' }, { id: 2, name: 'South' }];
  t.equal(filterByFarm(farms, 2, 'id').length, 1, "key='id' filters the farms table itself");
  t.equal(
    filterByFarm(farms, 2).length,
    0,
    'default key on the farms table matches nothing (why Reports must pass id)'
  );

  // ---- date window resolution ----
  t.equal(resolveDateWindow('all', {}, NOW), null, "'all' means no date window");
  t.equal(
    resolveDateWindow('custom', { start: '2026-01-01' }, NOW),
    null,
    'half-filled custom range does not filter (would blank the screen mid-input)'
  );
  t.ok(
    resolveDateWindow('custom', { start: '2026-01-01', end: '2026-01-31' }, NOW) !== null,
    'complete custom range produces a window'
  );
  t.equal(
    resolveDateWindow('nonsense', {}, NOW),
    null,
    'unknown range falls back to no filter rather than hiding everything'
  );

  const custom = resolveDateWindow('custom', { start: '2026-01-01', end: '2026-01-31' }, NOW);
  t.equal(
    custom.end.getHours(),
    23,
    'custom end date is pushed to end-of-day so the last day is included'
  );

  // ---- date filter ----
  const dated = [
    { id: 'today', date: daysAgo(0) },
    { id: '10d', date: daysAgo(10) },
    { id: '60d', date: daysAgo(60) },
    { id: '400d', date: daysAgo(400) },
  ];

  t.equal(filterByDate(dated, '7d', {}, NOW).length, 1, '7d range keeps only the recent row');
  t.equal(filterByDate(dated, '30d', {}, NOW).length, 2, '30d range keeps rows inside 30 days');
  t.equal(filterByDate(dated, '90d', {}, NOW).length, 3, '90d range keeps rows inside 90 days');
  t.equal(filterByDate(dated, '1y', {}, NOW).length, 3, '1y range excludes the 400-day-old row');
  t.equal(filterByDate(dated, 'all', {}, NOW).length, 4, "'all' keeps every row");

  // A row with no usable date must never be silently dropped.
  const undatedRow = [{ id: 'asset', farm_id: 1, item: 'Tractor' }];
  t.equal(
    filterByDate(undatedRow, '7d', {}, NOW).length,
    1,
    'rows with no date field are kept rather than hidden'
  );
  t.equal(
    filterByDate([{ id: 'bad', date: 'not-a-date' }], '7d', {}, NOW).length,
    1,
    'rows with an unparseable date are kept rather than hidden'
  );

  // Custom range is inclusive of both endpoints.
  const spanning = [
    { id: 'before', date: '2025-12-31' },
    { id: 'start', date: '2026-01-01' },
    { id: 'end', date: '2026-01-31' },
    { id: 'after', date: '2026-02-01' },
  ];
  t.deepEqual(
    filterByDate(spanning, 'custom', { start: '2026-01-01', end: '2026-01-31' }, NOW).map(r => r.id),
    ['start', 'end'],
    'custom range is inclusive of both endpoints and excludes rows outside it'
  );

  // ---- the regression this file exists for ----
  // Assets have no `date` column, so date-filtering them fell through to `created_at`
  // and hid everything bought more than 30 days ago under the DEFAULT filter.
  const inventory = [
    { id: 1, farm_id: 1, item: 'Urea', created_at: daysAgo(200) },
    { id: 2, farm_id: 1, item: 'Seed', created_at: daysAgo(2) },
    { id: 3, farm_id: 2, item: 'Diesel', created_at: daysAgo(400) },
  ];
  t.equal(
    applyFilters(inventory, { farmFilter: 'all', dateRange: '30d' }, NOW).length,
    1,
    'REGRESSION: date-filtering undated assets hides all but the newest (why assets use farm-only)'
  );
  t.equal(
    filterByFarm(inventory, 'all').length,
    3,
    'farm-only filter keeps every asset regardless of age'
  );
  t.equal(
    filterByFarm(inventory, 1).length,
    2,
    'farm-only filter still scopes assets to the selected farm'
  );

  // An unpaid invoice from six months ago is still money owed today.
  const credit = [
    { id: 1, farm_id: 1, type: 'Credit Sale', date: daysAgo(180), total_amount: 500 },
    { id: 2, farm_id: 1, type: 'Credit Sale', date: daysAgo(3), total_amount: 100 },
  ];
  t.equal(
    applyFilters(credit, { farmFilter: 'all', dateRange: '30d' }, NOW).length,
    1,
    'REGRESSION: date-filtering credit by origination date hides older receivables'
  );
  t.equal(
    filterByFarm(credit, 'all').length,
    2,
    'farm-only filter keeps the older receivable visible'
  );

  // ---- combined ----
  const mixed = [
    { id: 1, farm_id: 1, date: daysAgo(2) },
    { id: 2, farm_id: 2, date: daysAgo(2) },
    { id: 3, farm_id: 1, date: daysAgo(200) },
  ];
  t.deepEqual(
    applyFilters(mixed, { farmFilter: 1, dateRange: '30d' }, NOW).map(r => r.id),
    [1],
    'applyFilters composes the farm and date filters'
  );
}
