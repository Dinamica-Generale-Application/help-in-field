import { useMemo } from 'react';
import { calculate, type CostBreakdown } from '../utils/cost-calculation';

/**
 * Hook per il ricalcolo live dei costi intervento.
 * Ricalcola ogni volta che cambiano ore, km o sconto.
 */
export function useCostCalculation(
  hours: number,
  kilometers: number,
  discountPercent: number,
): CostBreakdown | null {
  return useMemo(() => {
    if (!hours || hours <= 0) return null;
    return calculate({
      hours,
      kilometers: kilometers || 0,
      discountPercent: discountPercent || 0,
    });
  }, [hours, kilometers, discountPercent]);
}
