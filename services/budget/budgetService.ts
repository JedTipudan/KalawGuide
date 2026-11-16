import {
  BudgetPlan, BudgetSummary, PricingModel, TripBudgetInput, TripBudgetLine,
  TripBudgetResult, TripCostCategory, TripCostItem,
} from '../../types';
import { safeNumber } from '../../utils/helpers';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Itemized trip budget used by KalawAssistance. Respects each price's pricing
 * model so e.g. a vehicle fare is charged per vehicle, never per traveler.
 * Items with an unknown amount are returned in `missing`, never guessed.
 */
export function calculateTripBudget(input: TripBudgetInput): TripBudgetResult {
  const travelers = Math.max(1, Math.floor(safeNumber(input.travelers, 1)));
  const days = Math.max(1, Math.floor(safeNumber(input.days, 1)));
  const nights = Math.max(0, Math.floor(safeNumber(input.nights, days - 1)));
  const rooms = Math.max(1, Math.floor(safeNumber(input.rooms, 1)));
  const rate = Math.max(0, safeNumber(input.contingencyRate, 0.1));

  const quantityFor = (it: TripCostItem): number => {
    const t = it.perTraveler ? travelers : 1;
    switch (it.model) {
      case 'per_person': return travelers;
      case 'per_vehicle': return it.capacity && it.capacity > 0 ? Math.ceil(travelers / it.capacity) : 1;
      case 'per_room': return rooms * Math.max(1, nights); // room rate is per room per night
      case 'per_night': return nights * t;
      case 'per_day': return days * t;
      case 'per_trip': return t;
      case 'one_time': return 1;
    }
  };

  const subtotals: Record<TripCostCategory, number> = {
    transportation: 0, accommodation: 0, food: 0, entrance_fees: 0, activities: 0, additional: 0,
  };
  const lines: TripBudgetLine[] = [];
  const missing: TripCostItem[] = [];

  for (const it of input.items) {
    if (it.amount === null || !isFinite(it.amount) || it.amount < 0) { missing.push(it); continue; }
    const quantity = quantityFor(it);
    const subtotal = round2(it.amount * quantity);
    lines.push({ ...it, quantity, subtotal });
    subtotals[it.category] = round2(subtotals[it.category] + subtotal);
  }

  const base = lines.reduce((s, l) => s + l.subtotal, 0);
  const contingency = round2(base * rate);
  const groupTotal = round2(base + contingency);
  const perPerson = round2(groupTotal / travelers);

  return {
    travelers, days, nights, rooms, lines, missing, subtotals, contingency, groupTotal, perPerson,
    dailyPerPerson: round2(perPerson / days),
    hasEstimates: missing.length > 0 || lines.some(l => !l.verified),
  };
}

/** Maps free-text listing_prices.unit to a pricing model; null when unrecognised. */
export function unitToPricingModel(unit: string): PricingModel | null {
  const u = unit.toLowerCase();
  if (/room/.test(u)) return 'per_room';
  if (/vehicle|van|boat|car|tricycle|jeep|habal|motor|bus\b|bangka/.test(u)) return 'per_vehicle';
  if (/person|pax|head|individual|guest|adult|child/.test(u)) return 'per_person';
  if (/night|overnight/.test(u)) return 'per_night';
  if (/day/.test(u)) return 'per_day';
  if (/trip|group|package|tour/.test(u)) return 'per_trip';
  if (/one[- ]?time|once|entry|flat/.test(u)) return 'one_time';
  return null;
}

/**
 * Calculates budget totals from a BudgetPlan.
 * Used by both the Budget Planner screen and KalawAssistance.
 * Never invents prices — only calculates from user-entered values.
 */
export function calculateBudget(plan: Partial<BudgetPlan>): BudgetSummary {
  const travelers = Math.max(1, safeNumber(plan.travelers, 1));
  const days = Math.max(1, safeNumber(plan.durationDays, 1));

  const transportation = safeNumber(plan.transportation);
  // Accommodation: cost per night × number of nights
  const accommodation = safeNumber(plan.accommodation) * days;
  // Food: daily budget × days × travelers
  const food = safeNumber(plan.food) * days * travelers;
  const activities = safeNumber(plan.activities);
  const miscellaneous = safeNumber(plan.miscellaneous);

  const total = transportation + accommodation + food + activities + miscellaneous;
  const perPerson = travelers > 0 ? total / travelers : 0;

  return {
    transportation,
    accommodation,
    food,
    activities,
    miscellaneous,
    total,
    perPerson,
  };
}

/**
 * Calculates expense totals grouped by category.
 */
export function calculateExpenseTotals(
  expenses: Array<{ category: string; amount: number }>
): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    const cat = expense.category;
    acc[cat] = (acc[cat] ?? 0) + safeNumber(expense.amount);
    return acc;
  }, {});
}

/**
 * Calculates total actual spending.
 */
export function calculateTotalExpenses(
  expenses: Array<{ amount: number }>
): number {
  return expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0);
}

/**
 * Calculates remaining budget vs actual spending.
 */
export function calculateRemainingBudget(
  budgetTotal: number,
  actualTotal: number
): number {
  return budgetTotal - actualTotal;
}
