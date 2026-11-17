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

// For stays, the "from" price is the cheapest room, not a day-use or entrance fee.
const LOWEST = `FROM listing_prices p WHERE p.business_id = b.id AND p.is_active = 1
  ORDER BY CASE WHEN b.category = 'accommodation' AND p.category <> 'room_rate' THEN 1 ELSE 0 END, p.amount LIMIT 1`;

/** SQL columns for the lowest active price of a business aliased as `b`. */
export const LOWEST_PRICE_SQL = `
  (SELECT p.amount ${LOWEST}) AS min_price,
  (SELECT p.unit ${LOWEST}) AS min_unit`;
