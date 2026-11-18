/**
 * Short, honest price text for list cards (PHP). Whole pesos, thousands separated.
 * Verified prices say so; everything else is marked as an estimate.
 */

export function peso(amount: number): string {
  return '₱' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function feeLabel(fee: number | null | undefined, verified: boolean | number | null | undefined): string {
  if (fee === null || fee === undefined) return 'Entrance fee: not recorded yet';
  const tag = verified ? 'verified' : 'estimate';
  return fee === 0 ? `Free entrance · ${tag}` : `Entrance ${peso(fee)} / person · ${tag}`;
}

/** "per room per night" → "/ room / night" so the card stays short. */
function shortUnit(unit: string): string {
  return unit.trim().replace(/^per\s+/i, '/ ').replace(/\s+per\s+/gi, ' / ');
}

export function fromPriceLabel(amount: number | null | undefined, unit?: string | null): string {
  if (amount === null || amount === undefined) return 'Prices: ask the business';
  return `From ${peso(amount)}${unit ? ` ${shortUnit(unit)}` : ''}`;
}

// For stays, the "from" price is the cheapest room, not a day-use or entrance fee
// (falling back to the cheapest price of any kind).
// The outer column b.category stays in WHERE: Turso rejects outer columns in a subquery's ORDER BY.
const lowest = (col: 'amount' | 'unit') => `COALESCE(
  (SELECT p.${col} FROM listing_prices p WHERE p.business_id = b.id AND p.is_active = 1
     AND (b.category <> 'accommodation' OR p.category = 'room_rate') ORDER BY p.amount LIMIT 1),
  (SELECT p.${col} FROM listing_prices p WHERE p.business_id = b.id AND p.is_active = 1 ORDER BY p.amount LIMIT 1))`;

/** SQL columns for the lowest active price of a business aliased as `b`. */
export const LOWEST_PRICE_SQL = `
  ${lowest('amount')} AS min_price,
  ${lowest('unit')} AS min_unit`;
