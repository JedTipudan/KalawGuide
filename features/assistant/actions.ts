import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';
import type { ActionTarget, ExpenseCategory, TripBudgetResult, User } from '../../types';
import { matchDestination } from './budgetParser';

/**
 * Things Kalaw Assistance can DO for the signed-in tourist, not just explain:
 * save a budget plan, add an expense, add a favorite, create a trip.
 *
 * Detection and the saved data are deterministic (no AI guessing), so it works the same
 * online and offline. On the phone app the change is saved on the device and synced to the
 * online database when there is internet (database/remote/syncedDatabase.ts).
 */

export type AssistantAction = 'save_budget' | 'add_expense' | 'add_favorite' | 'create_trip';

const DO = '(create|make|save|build|set ?up|generate|gawa\\w*|gumawa|i-?save|pagawa)';

const DETECT: [AssistantAction, RegExp][] = [
  ['add_favorite', /\b(add|save|put|i-?add|idagdag)\b[^.?!]{0,60}\bfavou?rites?\b|\bfavou?rite (this|it)\b/],
  ['add_expense', /\b(add|log|record|save|track|i-?add|ilista|isulat)\b[^.?!]{0,40}\b(expenses?|gastos|spending|spent)\b|\b(i|we) (just )?(spent|paid|bought)\b[^.?!]*\d|\bgumastos\b/],
  ['save_budget', new RegExp(`\\b${DO}\\b[^.?!]{0,40}\\bbudget\\b|\\bsave (this|that|the) (budget|estimate)\\b`)],
  ['create_trip', new RegExp(`\\b(${DO.slice(1, -1)}|add|start)\\b[^.?!]{0,40}\\b(trips?|itinerar(y|ies))\\b`)],
];

export function detectAction(text: string): AssistantAction | null {
  const t = text.toLowerCase().normalize('NFKC');
  return DETECT.find(([, re]) => re.test(t))?.[0] ?? null;
}

export type { ActionTarget };

export function canAct(user: User | null): string | null {
  if (!user) return 'Sign in as a tourist first, then I can save it to your account for you.';
  if (user.role !== 'tourist') return 'Saving budgets, expenses, favorites and trips is for tourist accounts.';
  return null;
}

// ─── Budget ──────────────────────────────────────────────────────────────────

/**
 * Saves the assistant's itemized estimate as a budget plan. Values are stored so the Budget results
 * screen (calculateBudget: accommodation × days, food × days × travelers) shows the same total.
 */
export async function saveBudgetPlan(user: User, dest: { id: string; name: string }, r: TripBudgetResult): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const ts = now();
  const days = Math.max(1, r.days);
  const s = r.subtotals;
  await db.runAsync(
    `INSERT INTO budget_plans (id, user_id, title, destination_id, destination_name, travelers, duration_days,
       transportation, accommodation, food, activities, miscellaneous, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, `Trip to ${dest.name}`, dest.id, dest.name, r.travelers, days,
     s.transportation, s.accommodation / days, s.food / (days * r.travelers),
     s.entrance_fees + s.activities, s.additional + r.contingency, ts, ts]
  );
  return id;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORY: [ExpenseCategory, RegExp][] = [
  ['food', /\b(food|lunch|dinner|breakfast|meal|snacks?|coffee|drinks?|kain|merienda|restaurant)\b/],
  ['transportation', /\b(fare|tricycle|van|bus|jeep\w*|habal\w*|ride|gas|fuel|transport\w*|taxi|boat)\b/],
  ['accommodation', /\b(hotel|room|resort|stay|inn|lodg\w*|cottage)\b/],
  ['activities', /\b(tour|entrance|fee|island hopping|surf\w*|snorkel\w*|activit\w*|ticket)\b/],
  ['shopping', /\b(souvenir|shop\w*|pasalubong|bought|buy|gift)\b/],
];

export interface ParsedExpense { amount: number | null; category: ExpenseCategory; name: string }

export function parseExpense(text: string): ParsedExpense {
  const t = text.toLowerCase();
  const m = t.match(/(?:₱|\bphp|\bp)\s?([\d,]+(?:\.\d+)?)/) ?? t.match(/\b([\d,]+(?:\.\d+)?)\s*(?:pesos?|php)?\b/);
  const amount = m ? Number(m[1].replace(/,/g, '')) : null;
  const category = EXPENSE_CATEGORY.find(([, re]) => re.test(t))?.[0] ?? 'other';
  const what = t.match(/\b(?:for|on|sa)\s+(?:the |a |an |my |our )?([a-z][a-z ]{1,30}?)(?=\s*(?:₱|\bphp\b|\d|today|yesterday|$|[.,!?]))/);
  const word = EXPENSE_CATEGORY.find(([c]) => c === category)?.[1].exec(t)?.[0];
  const name = (what?.[1] ?? word ?? 'Expense').trim();
  return { amount: amount && amount > 0 ? amount : null, category, name: name.charAt(0).toUpperCase() + name.slice(1) };
}

export async function addExpense(user: User, e: ParsedExpense & { amount: number }): Promise<void> {
  const db = await getDatabase();
  const ts = now();
  await db.runAsync(
    `INSERT INTO expenses (id, user_id, name, amount, category, date, description, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only')`,
    [generateId(), user.id, e.name, e.amount, e.category, ts.split('T')[0], 'Added by Kalaw Assistance', ts, ts]
  );
}

// ─── Favorite ────────────────────────────────────────────────────────────────

export async function addFavorite(user: User, type: 'destination' | 'business', entityId: string): Promise<'added' | 'already'> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM favorites WHERE user_id = ? AND entity_type = ? AND entity_id = ?', [user.id, type, entityId]);
  if (existing) return 'already';
  await db.runAsync(
    'INSERT INTO favorites (id, user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)',
    [generateId(), user.id, type, entityId, now()]);
  return 'added';
}

/** A destination or approved business named in the text. */
export function findPlace(
  text: string,
  destinations: { id: string; name: string }[],
  businesses: { id: string; name: string }[],
): { type: 'destination' | 'business'; id: string; name: string } | null {
  const biz = matchDestination(text, businesses.map(b => b.name));
  const dest = matchDestination(text, destinations.map(d => d.name));
  // Prefer the longer (more specific) match, e.g. "Dahican Surf Resort" over "Dahican Beach".
  if (biz && (!dest || biz.length >= dest.length)) {
    const b = businesses.find(x => x.name === biz)!;
    return { type: 'business', id: b.id, name: b.name };
  }
  if (dest) {
    const d = destinations.find(x => x.name === dest)!;
    return { type: 'destination', id: d.id, name: d.name };
  }
  return null;
}

// ─── Trip ────────────────────────────────────────────────────────────────────

export async function createTrip(
  user: User, dest: { id: string; name: string; description: string; fee: number | null }, days: number,
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  const ts = now();
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, days) - 1);
  const day = (d: Date) => d.toISOString().split('T')[0];
  await db.runAsync(
    `INSERT INTO itineraries (id, user_id, title, start_date, end_date, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'local_only')`,
    [id, user.id, `Trip to ${dest.name}`, day(start), day(end), ts, ts]);
  await db.runAsync(
    `INSERT INTO itinerary_items (id, itinerary_id, day_number, time, title, description, destination_id, estimated_cost, sort_order, created_at, updated_at)
     VALUES (?, ?, 1, '09:00', ?, ?, ?, ?, 0, ?, ?)`,
    [generateId(), id, `Visit ${dest.name}`, dest.description, dest.id, dest.fee ?? 0, ts, ts]);
  return id;
}
