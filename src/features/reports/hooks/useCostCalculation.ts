import { useMemo } from 'react';
import { calculate, type CostBreakdown } from '../utils/cost-calculation';

/**
 * Hook per il ricalcolo live dei costi intervento.
 */
export function useCostCalculation(
  hours: number,
  kilometers: number,
  otherExpenses: number,
): CostBreakdown | null {
  return useMemo(() => {
    if (!hours || hours <= 0) return null;
    return calculate({
      hours,
      kilometers: kilometers || 0,
      otherExpenses: otherExpenses || 0,
    });
  }, [hours, kilometers, otherExpenses]);
}
