import { feeLabel, fromPriceLabel, peso } from './priceLabel';

describe('price labels', () => {
  it('formats whole pesos with separators', () => {
    expect(peso(1200)).toBe('₱1,200');
    expect(peso(9500)).toBe('₱9,500');
    expect(peso(50)).toBe('₱50');
  });

  it('labels entrance fees honestly', () => {
    expect(feeLabel(100, 0)).toBe('Entrance ₱100 / person · estimate');
    expect(feeLabel(50, 1)).toBe('Entrance ₱50 / person · verified');
    expect(feeLabel(0, 0)).toBe('Free entrance · estimate');
    expect(feeLabel(null, 0)).toBe('Entrance fee: not recorded yet');
  });

  it('shortens business "from" prices', () => {
    expect(fromPriceLabel(1200, 'per room per night')).toBe('From ₱1,200 / room / night');
    expect(fromPriceLabel(250, 'per person')).toBe('From ₱250 / person');
    expect(fromPriceLabel(null, null)).toBe('Prices: ask the business');
  });
});
