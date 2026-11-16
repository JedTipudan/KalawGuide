import { calculateTripBudget, unitToPricingModel } from './budgetService';
import { TripCostItem } from '../../types';

const item = (p: Partial<TripCostItem> & Pick<TripCostItem, 'amount' | 'model'>): TripCostItem => ({
  category: 'additional',
  label: 'x',
  verified: true,
  ...p,
});

describe('calculateTripBudget', () => {
  it('one traveler, one day, per-person entrance fee', () => {
    const r = calculateTripBudget({
      travelers: 1, days: 1, contingencyRate: 0,
      items: [item({ category: 'entrance_fees', amount: 50, model: 'per_person' })],
    });
    expect(r.groupTotal).toBe(50);
    expect(r.perPerson).toBe(50);
    expect(r.dailyPerPerson).toBe(50);
  });

  it('4 travelers, 3 days, 2 rooms: every pricing model and category', () => {
    const r = calculateTripBudget({
      travelers: 4, days: 3, nights: 2, rooms: 2,
      items: [
        item({ category: 'transportation', label: 'Van', amount: 3000, model: 'per_vehicle', capacity: 12 }),
        item({ category: 'accommodation', label: 'Room', amount: 1500, model: 'per_room' }),
        item({ category: 'food', label: 'Food', amount: 300, model: 'per_day', perTraveler: true, verified: false }),
        item({ category: 'entrance_fees', label: 'Entrance', amount: 50, model: 'per_person' }),
        item({ category: 'activities', label: 'Boat tour', amount: 1200, model: 'per_trip' }),
        item({ category: 'additional', label: 'Misc', amount: 500, model: 'one_time' }),
      ],
    });
    // 3000 + 1500*2*2 + 300*3*4 + 50*4 + 1200 + 500 = 14,500; +10% = 15,950
    expect(r.subtotals).toEqual({
      transportation: 3000, accommodation: 6000, food: 3600,
      entrance_fees: 200, activities: 1200, additional: 500,
    });
    expect(r.contingency).toBe(1450);
    expect(r.groupTotal).toBe(15950);
    expect(r.perPerson).toBe(3987.5);
    expect(r.dailyPerPerson).toBe(1329.17);
    expect(r.hasEstimates).toBe(true);
  });

  it('never multiplies a vehicle fare by travelers', () => {
    const r = calculateTripBudget({
      travelers: 10, days: 1, contingencyRate: 0,
      items: [item({ amount: 2000, model: 'per_vehicle', capacity: 4 })],
    });
    expect(r.lines[0].quantity).toBe(3); // ceil(10/4) vehicles
    expect(r.groupTotal).toBe(6000);
  });

  it('per-vehicle fare without capacity = one vehicle for the group', () => {
    const r = calculateTripBudget({
      travelers: 6, days: 1, contingencyRate: 0,
      items: [item({ amount: 1500, model: 'per_vehicle' })],
    });
    expect(r.groupTotal).toBe(1500);
    expect(r.perPerson).toBe(250);
  });

  it('per-night and per-day group items; nights default to days - 1', () => {
    const r = calculateTripBudget({
      travelers: 2, days: 3, contingencyRate: 0,
      items: [
        item({ amount: 800, model: 'per_night' }),
        item({ amount: 1000, model: 'per_day' }),
      ],
    });
    expect(r.nights).toBe(2);
    expect(r.groupTotal).toBe(1600 + 3000);
  });

  it('missing prices are reported, not guessed', () => {
    const r = calculateTripBudget({
      travelers: 2, days: 1, contingencyRate: 0,
      items: [
        item({ amount: 100, model: 'per_person' }),
        item({ label: 'Hotel', amount: null, model: 'per_room' }),
      ],
    });
    expect(r.groupTotal).toBe(200);
    expect(r.missing.map(m => m.label)).toEqual(['Hotel']);
    expect(r.hasEstimates).toBe(true);
  });

  it('all verified, nothing missing → no estimates flag', () => {
    const r = calculateTripBudget({
      travelers: 1, days: 1,
      items: [item({ amount: 100, model: 'one_time' })],
    });
    expect(r.hasEstimates).toBe(false);
    expect(r.groupTotal).toBe(110); // 10% default contingency
  });
});

describe('unitToPricingModel', () => {
  it.each([
    ['per person', 'per_person'],
    ['/pax', 'per_person'],
    ['per head', 'per_person'],
    ['per van', 'per_vehicle'],
    ['per boat', 'per_vehicle'],
    ['per room per night', 'per_room'],
    ['per night', 'per_night'],
    ['overnight', 'per_night'],
    ['per day', 'per_day'],
    ['day use', 'per_day'],
    ['per trip', 'per_trip'],
    ['per group', 'per_trip'],
    ['one-time', 'one_time'],
  ])('%s → %s', (unit, model) => {
    expect(unitToPricingModel(unit)).toBe(model);
  });

  it('unknown unit → null (caller must state the assumption)', () => {
    expect(unitToPricingModel('bundle')).toBeNull();
  });
});
