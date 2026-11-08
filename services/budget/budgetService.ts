import { BudgetPlan, BudgetSummary } from '../../types';
import { safeNumber } from '../../utils/helpers';

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
