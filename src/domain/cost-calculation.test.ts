import { describe, it, expect } from 'vitest';
import {
  calculate,
  costCalculationEngine,
  HOURLY_RATE,
  KM_RATE,
  VAT_RATE,
  CostInput,
} from './cost-calculation';

describe('CostCalculationEngine', () => {
  describe('constants', () => {
    it('HOURLY_RATE should be 60', () => {
      expect(HOURLY_RATE).toBe(60);
    });

    it('KM_RATE should be 0.90', () => {
      expect(KM_RATE).toBe(0.90);
    });

    it('VAT_RATE should be 0.22', () => {
      expect(VAT_RATE).toBe(0.22);
    });
  });

  describe('calculate()', () => {
    it('should compute basic case with no discount', () => {
      const input: CostInput = { hours: 1, kilometers: 100, discountPercent: 0 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(60); // 1 × 60
      expect(result.kilometerTotal).toBe(90); // 100 × 0.90
      expect(result.subtotal).toBe(150); // 60 + 90
      expect(result.discountAmount).toBe(0); // 150 × 0
      expect(result.discountedSubtotal).toBe(150); // 150 - 0
      expect(result.vatAmount).toBe(33); // 150 × 0.22
      expect(result.grandTotal).toBe(183); // 150 + 33
    });

    it('should apply a 10% discount correctly', () => {
      const input: CostInput = { hours: 2, kilometers: 50, discountPercent: 10 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(120); // 2 × 60
      expect(result.kilometerTotal).toBe(45); // 50 × 0.90
      expect(result.subtotal).toBe(165); // 120 + 45
      expect(result.discountAmount).toBe(16.5); // 165 × 0.10
      expect(result.discountedSubtotal).toBe(148.5); // 165 - 16.5
      expect(result.vatAmount).toBe(32.67); // 148.5 × 0.22
      expect(result.grandTotal).toBe(181.17); // 148.5 + 32.67
    });

    it('should handle minimum hours (0.25)', () => {
      const input: CostInput = { hours: 0.25, kilometers: 0, discountPercent: 0 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(15); // 0.25 × 60
      expect(result.kilometerTotal).toBe(0);
      expect(result.subtotal).toBe(15);
      expect(result.discountAmount).toBe(0);
      expect(result.discountedSubtotal).toBe(15);
      expect(result.vatAmount).toBe(3.3); // 15 × 0.22
      expect(result.grandTotal).toBe(18.3); // 15 + 3.3
    });

    it('should handle maximum discount (100%)', () => {
      const input: CostInput = { hours: 8, kilometers: 200, discountPercent: 100 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(480); // 8 × 60
      expect(result.kilometerTotal).toBe(180); // 200 × 0.90
      expect(result.subtotal).toBe(660);
      expect(result.discountAmount).toBe(660); // 660 × 1.0
      expect(result.discountedSubtotal).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });

    it('should round intermediate results to 2 decimals (half-up)', () => {
      // 3 × 0.90 = 2.70 (exact), 0.75 × 60 = 45 (exact)
      // Use a case that triggers rounding: 7 km × 0.90 = 6.30, discount 33%
      const input: CostInput = { hours: 0.75, kilometers: 7, discountPercent: 33 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(45); // 0.75 × 60
      expect(result.kilometerTotal).toBe(6.3); // 7 × 0.90
      expect(result.subtotal).toBe(51.3); // 45 + 6.3
      expect(result.discountAmount).toBe(16.93); // 51.3 × 0.33 = 16.929 → 16.93
      expect(result.discountedSubtotal).toBe(34.37); // 51.3 - 16.93
      expect(result.vatAmount).toBe(7.56); // 34.37 × 0.22 = 7.5614 → 7.56
      expect(result.grandTotal).toBe(41.93); // 34.37 + 7.56
    });

    it('should handle large kilometer values', () => {
      const input: CostInput = { hours: 1, kilometers: 9999999, discountPercent: 0 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(60);
      expect(result.kilometerTotal).toBe(8999999.1); // 9999999 × 0.90
      expect(result.subtotal).toBe(9000059.1);
      expect(result.discountAmount).toBe(0);
      expect(result.discountedSubtotal).toBe(9000059.1);
      expect(result.vatAmount).toBe(1980013); // 9000059.1 × 0.22 = 1980013.002 → 1980013.00
      expect(result.grandTotal).toBe(10980072.1);
    });

    it('should handle 0 kilometers', () => {
      const input: CostInput = { hours: 4, kilometers: 0, discountPercent: 15 };
      const result = calculate(input);

      expect(result.hourlyTotal).toBe(240);
      expect(result.kilometerTotal).toBe(0);
      expect(result.subtotal).toBe(240);
      expect(result.discountAmount).toBe(36); // 240 × 0.15
      expect(result.discountedSubtotal).toBe(204); // 240 - 36
      expect(result.vatAmount).toBe(44.88); // 204 × 0.22
      expect(result.grandTotal).toBe(248.88); // 204 + 44.88
    });

    it('should return all values with at most 2 decimal places', () => {
      const input: CostInput = { hours: 1.75, kilometers: 333, discountPercent: 17 };
      const result = calculate(input);

      const checkDecimals = (val: number) => {
        const str = val.toString();
        const parts = str.split('.');
        if (parts.length === 2) {
          expect(parts[1].length).toBeLessThanOrEqual(2);
        }
      };

      checkDecimals(result.hourlyTotal);
      checkDecimals(result.kilometerTotal);
      checkDecimals(result.subtotal);
      checkDecimals(result.discountAmount);
      checkDecimals(result.discountedSubtotal);
      checkDecimals(result.vatAmount);
      checkDecimals(result.grandTotal);
    });
  });

  describe('costCalculationEngine interface', () => {
    it('should expose calculate method', () => {
      expect(typeof costCalculationEngine.calculate).toBe('function');
    });

    it('should produce same results as standalone calculate function', () => {
      const input: CostInput = { hours: 3.5, kilometers: 120, discountPercent: 5 };
      const standalone = calculate(input);
      const engine = costCalculationEngine.calculate(input);

      expect(engine).toEqual(standalone);
    });
  });
});
