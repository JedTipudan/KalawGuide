import type { PriceInfo } from '../../features/assistant/knowledge';
import { unitToPricingModel } from './budgetService';
import { formatCurrency } from '../../utils/helpers';

/**
 * Fills the budget planner from prices published in KalawGuide, so a traveler can start from
 * "cheapest", "mid-range" or "comfort" instead of a blank form. Pure function: the screen loads
 * the prices and passes them in. Categories with no published price come back as 0 with a note.
 */

export type BudgetLevel = 'cheapest' | 'mid' | 'comfort';

export interface BudgetPreset {
  transportation: number;
  accommodation: number;
  food: number;
  activities: number;
  other: number;
  notes: string[];
}

function pick<T>(list: T[], level: BudgetLevel): T | undefined {
  if (list.length === 0) return undefined;
  if (level === 'cheapest') return list[0];
  if (level === 'comfort') return list[list.length - 1];
  return list[Math.floor((list.length - 1) / 2)];
}

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

export function buildBudgetPreset(prices: PriceInfo[], level: BudgetLevel, travelers: number, days: number): BudgetPreset {
  const t = Math.max(1, Math.floor(travelers) || 1);
  const d = Math.max(1, Math.floor(days) || 1);
  const nights = d - 1;
  const rooms = Math.ceil(t / 2);
  const sorted = [...prices].sort((a, b) => a.amount - b.amount);
  const perPerson = (p: PriceInfo) => unitToPricingModel(p.unit) === 'per_person';
  const notes: string[] = [];

  const toMati = pick(sorted.filter(p => p.businessCategory === 'transport' && perPerson(p) && /davao/i.test(p.title)), level);
  const local = sorted.find(p => p.businessCategory === 'transport' && perPerson(p) && !/davao/i.test(p.title));
  let transportation = 0;
  if (toMati) {
    transportation += toMati.amount * 2 * t;
    notes.push(`🚌 ${toMati.title}: ${formatCurrency(toMati.amount)} × 2 ways × ${t}`);
  }
  if (local) {
    transportation += local.amount * 2 * t;
    notes.push(`🛵 ${local.title}: ${formatCurrency(local.amount)} × 2 ways × ${t}`);
  }
  if (!toMati && !local) notes.push('🚌 No published fares yet — enter your own transport amount.');

  const room = pick(sorted.filter(p => p.businessCategory === 'accommodation' && unitToPricingModel(p.unit) === 'per_room'), level);
  let accommodation = 0;
  if (nights === 0) notes.push('🏨 Day trip — no accommodation.');
  else if (room) {
    accommodation = room.amount * rooms * nights;
    notes.push(`🏨 ${room.businessName} · ${room.title}: ${formatCurrency(room.amount)} × ${rooms} room${rooms > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''}`);
  } else notes.push('🏨 No published room rates yet — enter your own amount.');

  const meal = pick(sorted.filter(p => p.businessCategory === 'restaurant' && perPerson(p)), level);
  let food = 0;
  if (meal) {
    food = meal.amount * 3 * d * t;
    notes.push(`🍽 ${meal.title} (${meal.businessName}): ${formatCurrency(meal.amount)} × 3 meals × ${d} day${d > 1 ? 's' : ''} × ${t}`);
  } else notes.push('🍽 No published meal prices yet — enter your own amount.');

  const activity = pick(sorted.filter(p => p.category === 'activity_fee' && perPerson(p)), level);
  let activities = 0;
  if (activity) {
    activities = activity.amount * t;
    notes.push(`🏄 ${activity.title} (${activity.businessName}): ${formatCurrency(activity.amount)} × ${t}`);
  }

  const other = roundUp((transportation + accommodation + food + activities) * 0.1, 50);
  notes.push('➕ Other: 10% buffer for snacks, tips and surprises.');
  if (prices.some(p => !p.verified)) notes.push('Includes sample or estimated prices — confirm with each business.');

  return { transportation, accommodation, food, activities, other, notes };
}
