/**
 * CostCalculationEngine — Modulo Calcolo Costi
 *
 * Motore di calcolo puro (senza side-effect) che computa i costi dell'intervento.
 * Ogni risultato intermedio viene arrotondato a 2 decimali (half-up rounding).
 */

import { HOURLY_RATE, KM_RATE, VAT_RATE } from '@/config/constants';

// --- Interfaces ---

export interface CostInput {
  hours: number; // 0.25 - 24, incrementi 0.25
  kilometers: number; // 0 - 9999
  discountPercent: number; // 0 - 100
}

export interface CostBreakdown {
  hourlyTotal: number; // hours × HOURLY_RATE
  kilometerTotal: number; // km × KM_RATE
  subtotal: number; // hourlyTotal + kilometerTotal
  discountAmount: number; // subtotal × (discount / 100)
  taxableAmount: number; // subtotal - discountAmount
  vatAmount: number; // taxableAmount × VAT_RATE
  grandTotal: number; // taxableAmount + vatAmount
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
 *   taxableAmount = roundTo2(subtotal - discountAmount)
 *   vatAmount = roundTo2(taxableAmount × VAT_RATE)
 *   grandTotal = roundTo2(taxableAmount + vatAmount)
 */
export function calculate(input: CostInput): CostBreakdown {
  const hourlyTotal = roundTo2(input.hours * HOURLY_RATE);
  const kilometerTotal = roundTo2(input.kilometers * KM_RATE);
  const subtotal = roundTo2(hourlyTotal + kilometerTotal);
  const discountAmount = roundTo2(subtotal * (input.discountPercent / 100));
  const taxableAmount = roundTo2(subtotal - discountAmount);
  const vatAmount = roundTo2(taxableAmount * VAT_RATE);
  const grandTotal = roundTo2(taxableAmount + vatAmount);

  return {
    hourlyTotal,
    kilometerTotal,
    subtotal,
    discountAmount,
    taxableAmount,
    vatAmount,
    grandTotal,
  };
}
