/**
 * Turns a natural-language travel budget request into structured inputs for
 * calculateTripBudget. Only extracts what the user said; never fills prices.
 */

export type TransportType = 'van' | 'bus' | 'tricycle' | 'habal_habal' | 'jeepney' | 'boat' | 'car';

export interface BudgetRequest {
  destination?: string;
  origin?: string;
  travelers?: number;
  days?: number;
  nights?: number;
  rooms?: number;
  budgetCap?: number;
  foodPerPersonPerDay?: number;
  transport?: TransportType;
  accommodation?: 'budget' | 'premium' | 'none';
  missing: ('destination' | 'travelers' | 'days')[];
}

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)';
const toNum = (s: string) => WORDS[s] ?? Number(s);
const money = (s: string) => Number(s.replace(/,/g, ''));

const TRANSPORT: [RegExp, TransportType][] = [
  [/\bvans?\b/, 'van'], [/\bbus(es)?\b/, 'bus'], [/\btricycles?\b/, 'tricycle'],
  [/\b(habal|motorcycle)/, 'habal_habal'], [/\bjeep/, 'jeepney'], [/\b(boat|bangka)/, 'boat'], [/\b(car|private vehicle)\b/, 'car'],
];

const GENERIC_WORDS = new Set(['beach', 'mount', 'range', 'falls', 'island', 'islands', 'city', 'market', 'public', 'river', 'park', 'cape', 'point']);

export function matchDestination(text: string, names: string[]): string | undefined {
  const t = text.toLowerCase();
  const full = names.find(n => t.includes(n.toLowerCase()));
  if (full) return full;
  return names.find(n =>
    n.toLowerCase().split(/\s+/).some(w => w.length >= 5 && !GENERIC_WORDS.has(w) && new RegExp(`\\b${w}\\b`).test(t))
  );
}

export function parseBudgetRequest(text: string, destinationNames: string[]): BudgetRequest {
  let t = text.toLowerCase().normalize('NFKC');
  const r: BudgetRequest = { missing: [] };

  r.destination = matchDestination(t, destinationNames);

  const food = t.match(/\bfood\b[^₱\d]{0,15}(?:₱|php)?\s?([\d,]+(?:\.\d+)?)/);
  if (food) {
    r.foodPerPersonPerDay = money(food[1]);
    t = t.replace(food[0], ' ');
  }
  const cap = t.match(/(?:₱|\bphp)\s?([\d,]+(?:\.\d+)?)/) ?? t.match(/([\d,]+(?:\.\d+)?)\s*(?:pesos?|php)\b/);
  if (cap) r.budgetCap = money(cap[1]);

  const travelers = t.match(new RegExp(`\\b${NUM}\\s*(people|persons?|pax|travell?ers?|adults?|friends|guests|of us)\\b`));
  if (travelers) r.travelers = toNum(travelers[1]);
  else if (/\b(solo|alone|myself|just me)\b/.test(t)) r.travelers = 1;
  else if (/\b(couple|partner)\b/.test(t)) r.travelers = 2;

  const days = t.match(new RegExp(`\\b${NUM}\\s*-?\\s*days?\\b`));
  const nights = t.match(new RegExp(`\\b${NUM}\\s*-?\\s*nights?\\b`));
  if (days) r.days = toNum(days[1]);
  if (nights) r.nights = toNum(nights[1]);
  if (!days && /\bday trip\b/.test(t)) { r.days = 1; r.nights = 0; r.accommodation = 'none'; }
  if (/\bovernight\b/.test(t) && r.nights === undefined) r.nights = 1;
  if (r.days === undefined && r.nights !== undefined) r.days = r.nights + 1;
  if (r.nights === undefined && r.days !== undefined) r.nights = r.days - 1;

  const rooms = t.match(new RegExp(`\\b${NUM}\\s*rooms?\\b`));
  if (rooms) r.rooms = toNum(rooms[1]);

  const origin = t.match(/\bfrom ([a-z][a-z .]*?)(?= to\b| by\b|,|\.|\?|$)/);
  if (origin) r.origin = origin[1].trim().replace(/\b\w/g, c => c.toUpperCase());

  r.transport = TRANSPORT.find(([re]) => re.test(t))?.[1];

  if (!r.accommodation) {
    if (/\b(no (hotel|accommodation)|without (hotel|accommodation))\b/.test(t)) r.accommodation = 'none';
    else if (/\b(cheap|affordable|budget (hotel|room|stay|accommodation|inn))/.test(t)) r.accommodation = 'budget';
    else if (/\b(luxury|premium|high[- ]end)\b/.test(t)) r.accommodation = 'premium';
  }

  if (!r.destination) r.missing.push('destination');
  if (r.travelers === undefined) r.missing.push('travelers');
  if (r.days === undefined) r.missing.push('days');
  return r;
}
