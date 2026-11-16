import { parseBudgetRequest } from './budgetParser';

const DESTS = ['Dahican Beach', 'Pujada Bay', 'Mount Hamiguitan Range'];

describe('parseBudgetRequest', () => {
  it('How much should I prepare for Dahican Beach?', () => {
    const r = parseBudgetRequest('How much should I prepare for Dahican Beach?', DESTS);
    expect(r.destination).toBe('Dahican Beach');
    expect(r.travelers).toBeUndefined();
    expect(r.missing).toEqual(['travelers', 'days']);
  });

  it('Plan a 3-day trip for 4 people.', () => {
    const r = parseBudgetRequest('Plan a 3-day trip for 4 people.', DESTS);
    expect(r).toMatchObject({ days: 3, nights: 2, travelers: 4 });
    expect(r.missing).toEqual(['destination']);
  });

  it('Where can I travel with ₱2,000?', () => {
    expect(parseBudgetRequest('Where can I travel with ₱2,000?', DESTS).budgetCap).toBe(2000);
  });

  it('reads cap written as PHP / pesos', () => {
    expect(parseBudgetRequest('I have PHP 5,500.50 only', DESTS).budgetCap).toBe(5500.5);
    expect(parseBudgetRequest('my budget is 3000 pesos', DESTS).budgetCap).toBe(3000);
  });

  it('full request: origin, transport, rooms, nights, food, accommodation preference', () => {
    const r = parseBudgetRequest(
      'Budget for 2 nights at pujada bay for five friends from Davao City by van, 2 rooms, cheap hotel, food ₱250 per day',
      DESTS,
    );
    expect(r).toMatchObject({
      destination: 'Pujada Bay', travelers: 5, nights: 2, days: 3, rooms: 2,
      origin: 'Davao City', transport: 'van', accommodation: 'budget', foodPerPersonPerDay: 250,
    });
    expect(r.budgetCap).toBeUndefined(); // the ₱250 is food, not a cap
    expect(r.missing).toEqual([]);
  });

  it('solo / couple / day trip shortcuts', () => {
    expect(parseBudgetRequest('solo trip to Dahican', DESTS).travelers).toBe(1);
    expect(parseBudgetRequest('for a couple', DESTS).travelers).toBe(2);
    expect(parseBudgetRequest('day trip to Dahican Beach', DESTS)).toMatchObject({ days: 1, nights: 0, accommodation: 'none' });
  });

  it('matches destination by distinctive first word', () => {
    expect(parseBudgetRequest('how much for hamiguitan', DESTS).destination).toBe('Mount Hamiguitan Range');
    expect(parseBudgetRequest('how much for dahican', DESTS).destination).toBe('Dahican Beach');
  });
});
