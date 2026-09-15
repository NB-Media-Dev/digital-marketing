import { pct, ratio, cpl, change, conversionRate, completionRate } from '../src/utils/calculations';

describe('business calculations (zero-safe)', () => {
  it('never divides by zero', () => {
    expect(pct(5, 0)).toBe(0);
    expect(ratio(100, 0)).toBe(0);
    expect(cpl(1000, 0)).toBe(0);
    expect(change(0, 50)).toBe(0);
    expect(conversionRate(3, 0)).toBe(0);
  });

  it('computes correct percentages and ratios', () => {
    expect(pct(42, 1250)).toBe(3.4);
    expect(cpl(25000, 1250)).toBe(20);
    expect(change(100, 128)).toBe(28);
    expect(completionRate(6, 8)).toBe(75);
  });

  it('never returns NaN/Infinity', () => {
    const values = [pct(1, 0), ratio(1, 0), cpl(1, 0), change(0, 1)];
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});
