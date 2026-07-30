import { describe, it, expect } from 'vitest';
import { calculate } from './cost-calculation';

describe('calculate', () => {
  it('calculates basic hours + km + travel cost', () => {
    // km=100, travelHours=100/55=1.82, travelCost=1.82*60=109.2
    const result = calculate({ hours: 2, kilometers: 100, otherExpenses: 0 });
    expect(result.hourlyTotal).toBe(120);
    expect(result.kilometerTotal).toBe(90);
    expect(result.travelHours).toBe(1.82);
    expect(result.travelCost).toBe(109.2);
    expect(result.otherExpenses).toBe(0);
    expect(result.grandTotal).toBe(319.2);
  });

  it('includes other expenses in total', () => {
    // km=50, travelHours=50/55=0.91, travelCost=0.91*60=54.6
    const result = calculate({ hours: 1, kilometers: 50, otherExpenses: 15.50 });
    expect(result.hourlyTotal).toBe(60);
    expect(result.kilometerTotal).toBe(45);
    expect(result.travelHours).toBe(0.91);
    expect(result.travelCost).toBe(54.6);
    expect(result.otherExpenses).toBe(15.50);
    expect(result.grandTotal).toBe(175.1);
  });

  it('handles zero hours', () => {
    // km=100, travelHours=1.82, travelCost=109.2
    const result = calculate({ hours: 0, kilometers: 100, otherExpenses: 10 });
    expect(result.hourlyTotal).toBe(0);
    expect(result.kilometerTotal).toBe(90);
    expect(result.travelCost).toBe(109.2);
    expect(result.grandTotal).toBe(209.2);
  });

  it('handles zero km', () => {
    const result = calculate({ hours: 0.25, kilometers: 0, otherExpenses: 0 });
    expect(result.hourlyTotal).toBe(15);
    expect(result.kilometerTotal).toBe(0);
    expect(result.travelHours).toBe(0);
    expect(result.travelCost).toBe(0);
    expect(result.grandTotal).toBe(15);
  });

  it('rounds to 2 decimal places', () => {
    // km=1, travelHours=1/55=0.02, travelCost=0.02*60=1.2
    const result = calculate({ hours: 1, kilometers: 1, otherExpenses: 0.1 });
    expect(result.kilometerTotal).toBe(0.9);
    expect(result.travelHours).toBe(0.02);
    expect(result.travelCost).toBe(1.2);
    expect(result.grandTotal).toBe(62.2);
  });
});
