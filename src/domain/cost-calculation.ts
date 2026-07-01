/**
 * CostCalculationEngine - Modulo Calcolo Costi
 *
 * Motore di calcolo puro (senza side-effect) che computa i costi dell'intervento.
 * Ogni risultato intermedio viene arrotondato a 2 decimali (half-up rounding).
 */

// --- Costanti ---
export const HOURLY_RATE = 60; // €/h
export const KM_RATE = 0.90; // €/km
export const VAT_RATE = 0.22; // 22%

// --- Interfaces ---
export interface CostInput {
  hours: number; // 0.25 - 24.00, incrementi 0.25
  kilometers: number; // 0 - 9999999
  discountPercent: number; // 0 - 100
}

export interface CostBreakdown {
  hourlyTotal: number; // hours × 60€
  kilometerTotal: number; // km × 0.90€
  subtotal: number; // hourlyTotal + kilometerTotal
  discountAmount: number; // subtotal × (discount/100)
  discountedSubtotal: number; // subtotal - discountAmount
  vatAmount: number; // discountedSubtotal × 0.22
  grandTotal: number; // discountedSubtotal + vatAmount
}

export interface CostCalculationEngine {
  calculate(input: CostInput): CostBreakdown;
}

// --- Utility ---

/**
 * Arrotonda un numero a 2 decimali usando half-up rounding.
 */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Implementazione ---

/**
 * Calcola il breakdown dei costi per un intervento di assistenza tecnica.
 *
 * Formula:
 *   hourlyTotal = roundTo2(hours × HOURLY_RATE)
 *   kilometerTotal = roundTo2(kilometers × KM_RATE)
 *   subtotal = roundTo2(hourlyTotal + kilometerTotal)
 *   discountAmount = roundTo2(subtotal × (discountPercent / 100))
 *   discountedSubtotal = roundTo2(subtotal - discountAmount)
 *   vatAmount = roundTo2(discountedSubtotal × VAT_RATE)
 *   grandTotal = roundTo2(discountedSubtotal + vatAmount)
 */
export function calculate(input: CostInput): CostBreakdown {
  const hourlyTotal = roundTo2(input.hours * HOURLY_RATE);
  const kilometerTotal = roundTo2(input.kilometers * KM_RATE);
  const subtotal = roundTo2(hourlyTotal + kilometerTotal);
  const discountAmount = roundTo2(subtotal * (input.discountPercent / 100));
  const discountedSubtotal = roundTo2(subtotal - discountAmount);
  const vatAmount = roundTo2(discountedSubtotal * VAT_RATE);
  const grandTotal = roundTo2(discountedSubtotal + vatAmount);

  return {
    hourlyTotal,
    kilometerTotal,
    subtotal,
    discountAmount,
    discountedSubtotal,
    vatAmount,
    grandTotal,
  };
}

/**
 * Istanza del CostCalculationEngine conforme all'interfaccia.
 */
export const costCalculationEngine: CostCalculationEngine = {
  calculate,
};
