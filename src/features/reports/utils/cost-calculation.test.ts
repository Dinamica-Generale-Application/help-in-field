import { describe, it, expect } from 'vitest';
import { calculate } from './cost-calculation';

describe('calculate', () => {
  it('calculates basic hours + km', () => {
    const result = calculate({ hours: 2, kilometers: 100, otherExpenses: 0 });
    expect(result.hourlyTotal).toBe(120);
    expect(result.kilometerTotal).toBe(90);
    expect(result.otherExpenses).toBe(0);
    expect(result.grandTotal).toBe(210);
  });

  it('includes other expenses in total', () => {
    const result = calculate({ hours: 1, kilometers: 50, otherExpenses: 15.50 });
    expect(result.hourlyTotal).toBe(60);
    expect(result.kilometerTotal).toBe(45);
    expect(result.otherExpenses).toBe(15.50);
    expect(result.grandTotal).toBe(120.50);
  });

  it('handles zero hours', () => {
    const result = calculate({ hours: 0, kilometers: 100, otherExpenses: 10 });
    expect(result.hourlyTotal).toBe(0);
    expect(result.kilometerTotal).toBe(90);
    expect(result.grandTotal).toBe(100);
  });

  it('handles zero km', () => {
    const result = calculate({ hours: 0.25, kilometers: 0, otherExpenses: 0 });
    expect(result.hourlyTotal).toBe(15);
    expect(result.kilometerTotal).toBe(0);
    expect(result.grandTotal).toBe(15);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculate({ hours: 1, kilometers: 1, otherExpenses: 0.1 });
    expect(result.kilometerTotal).toBe(0.9);
    expect(result.grandTotal).toBe(61);
  });
});
