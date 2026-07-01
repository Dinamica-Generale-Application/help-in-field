import { describe, it, expect } from 'vitest';
import { calculate, type CostInput } from './cost-calculation';

describe('cost-calculation', () => {
  it('computes basic case with no discount', () => {
    const input: CostInput = { hours: 1, kilometers: 100, discountPercent: 0 };
    const result = calculate(input);

    expect(result.hourlyTotal).toBe(60);
    expect(result.kilometerTotal).toBe(90);
    expect(result.subtotal).toBe(150);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableAmount).toBe(150);
    expect(result.vatAmount).toBe(33);
    expect(result.grandTotal).toBe(183);
  });

  it('applies a 10% discount correctly', () => {
    const input: CostInput = { hours: 2, kilometers: 50, discountPercent: 10 };
    const result = calculate(input);

    expect(result.hourlyTotal).toBe(120);
    expect(result.kilometerTotal).toBe(45);
    expect(result.subtotal).toBe(165);
    expect(result.discountAmount).toBe(16.5);
    expect(result.taxableAmount).toBe(148.5);
    expect(result.vatAmount).toBe(32.67);
    expect(result.grandTotal).toBe(181.17);
  });

  it('handles minimum hours (0.25)', () => {
    const input: CostInput = { hours: 0.25, kilometers: 0, discountPercent: 0 };
    const result = calculate(input);

    expect(result.hourlyTotal).toBe(15);
    expect(result.kilometerTotal).toBe(0);
    expect(result.subtotal).toBe(15);
    expect(result.taxableAmount).toBe(15);
    expect(result.vatAmount).toBe(3.3);
    expect(result.grandTotal).toBe(18.3);
  });

  it('handles maximum discount (100%)', () => {
    const input: CostInput = { hours: 8, kilometers: 200, discountPercent: 100 };
    const result = calculate(input);

    expect(result.subtotal).toBe(660);
    expect(result.discountAmount).toBe(660);
    expect(result.taxableAmount).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it('rounds intermediate results to 2 decimals (half-up)', () => {
    const input: CostInput = { hours: 0.75, kilometers: 7, discountPercent: 33 };
    const result = calculate(input);

    expect(result.hourlyTotal).toBe(45);
    expect(result.kilometerTotal).toBe(6.3);
    expect(result.subtotal).toBe(51.3);
    expect(result.discountAmount).toBe(16.93);
    expect(result.taxableAmount).toBe(34.37);
    expect(result.vatAmount).toBe(7.56);
    expect(result.grandTotal).toBe(41.93);
  });

  it('handles 0 kilometers', () => {
    const input: CostInput = { hours: 4, kilometers: 0, discountPercent: 15 };
    const result = calculate(input);

    expect(result.hourlyTotal).toBe(240);
    expect(result.kilometerTotal).toBe(0);
    expect(result.subtotal).toBe(240);
    expect(result.discountAmount).toBe(36);
    expect(result.taxableAmount).toBe(204);
    expect(result.vatAmount).toBe(44.88);
    expect(result.grandTotal).toBe(248.88);
  });

  it('returns all values with at most 2 decimal places', () => {
    const input: CostInput = { hours: 1.75, kilometers: 333, discountPercent: 17 };
    const result = calculate(input);

    const checkDecimals = (val: number) => {
      const parts = val.toString().split('.');
      if (parts.length === 2) {
        expect(parts[1]!.length).toBeLessThanOrEqual(2);
      }
    };

    checkDecimals(result.hourlyTotal);
    checkDecimals(result.kilometerTotal);
    checkDecimals(result.subtotal);
    checkDecimals(result.discountAmount);
    checkDecimals(result.taxableAmount);
    checkDecimals(result.vatAmount);
    checkDecimals(result.grandTotal);
  });
});
