import { buildBudgetPreset } from './budgetPresets';
import type { PriceInfo } from '../../features/assistant/knowledge';

const p = (businessCategory: string, title: string, amount: number, unit: string, category = 'other'): PriceInfo => ({
  businessId: title, businessName: `${title} Co`, businessCategory, title, amount, unit, category, verified: false,
});

const PRICES = [
  p('transport', 'Van Davao → Mati', 300, 'per person one way', 'per_person'),
  p('transport', 'Bus Davao → Mati', 230, 'per person one way', 'per_person'),
  p('transport', 'Habal-habal ride', 80, 'per person one way', 'per_person'),
  p('accommodation', 'Fan room', 1200, 'per room per night', 'room_rate'),
  p('accommodation', 'Villa', 9500, 'per room per night', 'room_rate'),
  p('accommodation', 'Cabin', 2500, 'per room per night', 'room_rate'),
  p('restaurant', 'Budget meal', 90, 'per person', 'per_person'),
  p('restaurant', 'Grilled fish', 220, 'per person', 'per_person'),
  p('tour_operator', 'Island hopping', 450, 'per person', 'activity_fee'),
  p('tour_operator', 'Private boat', 3000, 'per boat', 'activity_fee'),
];

describe('buildBudgetPreset', () => {
  it('cheapest uses the lowest price in every category', () => {
    const r = buildBudgetPreset(PRICES, 'cheapest', 2, 3);
    expect(r.transportation).toBe(230 * 2 * 2 + 80 * 2 * 2);
    expect(r.accommodation).toBe(1200 * 1 * 2);
    expect(r.food).toBe(90 * 3 * 3 * 2);
    expect(r.activities).toBe(450 * 2); // per-boat price is not a per-person activity
    expect(r.other % 50).toBe(0);
  });

  it('comfort uses the highest and costs more than cheapest', () => {
    const cheap = buildBudgetPreset(PRICES, 'cheapest', 2, 3);
    const comfort = buildBudgetPreset(PRICES, 'comfort', 2, 3);
    expect(comfort.accommodation).toBe(9500 * 2);
    const total = (x: typeof cheap) => x.transportation + x.accommodation + x.food + x.activities + x.other;
    expect(total(comfort)).toBeGreaterThan(total(cheap));
  });

  it('a day trip has no accommodation, and missing prices are explained', () => {
    const r = buildBudgetPreset([], 'mid', 1, 1);
    expect(r.accommodation).toBe(0);
    expect(r.transportation).toBe(0);
    expect(r.notes.join(' ')).toMatch(/Day trip/);
    expect(r.notes.join(' ')).toMatch(/No published fares/);
  });
});
