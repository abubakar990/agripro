import { toNumber as num, round2 } from './finance.js';

// Units commonly used on Pakistani farms. Free text is still allowed in the form.
export const UNITS = [
  'bag', 'kg', 'maund', 'ton', 'litre', 'ml', 'gram',
  'acre', 'hour', 'day', 'trolley', 'piece', 'bottle', 'packet',
];

const normalizeName = (s) => (s || '').trim().replace(/\s+/g, ' ');

/**
 * Amount = quantity × unit price, or null when either side is missing/invalid,
 * so the caller can leave a manually entered amount alone.
 */
export const lineTotal = (quantity, unitPrice) => {
  const q = parseFloat(quantity);
  const p = parseFloat(unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return null;
  return round2(q * p);
};

/**
 * Groups entries by item + unit (case-insensitive) and totals quantity and amount.
 * "Urea / bag" and "Urea / kg" stay separate because they can't be added together.
 * Entries without an item name or quantity are ignored.
 */
export const summarizeByItem = (entries = []) => {
  const map = new Map();
  for (const e of entries) {
    const item = normalizeName(e.item_name);
    const qty = num(e.quantity);
    if (!item || !(qty > 0)) continue;
    const unit = normalizeName(e.unit).toLowerCase();
    const key = `${item.toLowerCase()}|${unit}`;
    if (!map.has(key)) map.set(key, { key, item, unit, quantity: 0, amount: 0, count: 0 });
    const g = map.get(key);
    g.quantity = round2(g.quantity + qty);
    g.amount = round2(g.amount + num(e.amount));
    g.count += 1;
  }
  return [...map.values()]
    .map(g => ({ ...g, avgRate: g.quantity > 0 ? round2(g.amount / g.quantity) : 0 }))
    .sort((a, b) => b.amount - a.amount);
};

/** Distinct item names already used, for the item-name autocomplete. */
export const itemSuggestions = (entries = []) => {
  const seen = new Map();
  for (const e of entries) {
    const name = normalizeName(e.item_name);
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};

export const formatQty = (q) =>
  num(q).toLocaleString('en-PK', { maximumFractionDigits: 3 });
