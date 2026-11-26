// Single source of truth for the two global filters (farm chips + date range) that
// FarmFilterBar drives. Previously this logic was copy-pasted into useFilteredData,
// useDateFilter and useFilteredDashboardData, and the copies had drifted — which is how
// the Dashboard and Reports ended up disagreeing about the same numbers.
//
// The important distinction is *period* data vs *point-in-time* data:
//
//   period       -> revenue, expenses, attendance, irrigation, spray, machine usage.
//                   Rows describe something that happened on a date, so narrowing the
//                   date range legitimately narrows the list. Use applyFilters().
//
//   point-in-time -> inventory, machinery, livestock, workers, and the outstanding
//                   balances on credit entries and loans. These describe what you own or
//                   owe *right now*. They must only ever be farm-filtered: a tractor you
//                   bought two years ago is still your tractor, and an unpaid invoice from
//                   six months ago is still money owed. Use filterByFarm().
//
// Several of these tables have no `date` column at all, so date-filtering them fell back
// to `created_at` and silently hid every asset older than the (default) 30-day range.

/** Date fields to try, in order of preference, when date-filtering a row. */
const DATE_FIELDS = ['date', 'created_at', 'sowing_date', 'dob'];

const rowDate = (item) => {
  for (const field of DATE_FIELDS) {
    if (item[field]) return new Date(item[field]);
  }
  return null;
};

/**
 * Restrict rows to the selected farm. `farmFilter` is 'all' or a farm id
 * (which may arrive as a string from the filter buttons, hence the Number()).
 *
 * `key` is the column holding the farm id — 'farm_id' for child rows, or 'id' when
 * filtering the farms table itself.
 */
export const filterByFarm = (data, farmFilter, key = 'farm_id') => {
  if (!Array.isArray(data)) return [];
  if (farmFilter === 'all' || farmFilter === undefined || farmFilter === null) return data;
  const farmId = Number(farmFilter);
  if (!Number.isFinite(farmId)) return data;
  return data.filter((item) => item[key] === farmId);
};

/**
 * Resolve the selected range to a concrete [start, end] window.
 * Returns null when no date filtering should happen — either 'all' was selected, or
 * 'custom' is selected but the user has not finished picking both endpoints yet
 * (filtering on a half-filled custom range would blank the screen mid-input).
 */
export const resolveDateWindow = (dateRange, customRange = {}, now = new Date()) => {
  if (dateRange === 'all' || !dateRange) return null;

  if (dateRange === 'custom') {
    if (!customRange.start || !customRange.end) return null;
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(now);
  if (dateRange === '7d') start.setDate(now.getDate() - 7);
  else if (dateRange === '30d') start.setDate(now.getDate() - 30);
  else if (dateRange === '90d') start.setDate(now.getDate() - 90);
  else if (dateRange === '1y') start.setFullYear(now.getFullYear() - 1);
  else return null; // unknown range -> don't filter rather than hide everything

  return { start, end: null };
};

/** Restrict rows to the selected date range. Rows with no usable date are kept. */
export const filterByDate = (data, dateRange, customRange = {}, now = new Date()) => {
  if (!Array.isArray(data)) return [];
  const window = resolveDateWindow(dateRange, customRange, now);
  if (!window) return data;

  return data.filter((item) => {
    const itemDate = rowDate(item);
    if (!itemDate || Number.isNaN(itemDate.getTime())) return true;
    if (itemDate < window.start) return false;
    return !(window.end && itemDate > window.end);
  });
};

/** Farm + date filter, for period data. */
export const applyFilters = (data, { farmFilter, dateRange, customRange } = {}, now = new Date()) =>
  filterByDate(filterByFarm(data, farmFilter), dateRange, customRange, now);
