/**
 * CostCalculationEngine — Modulo Calcolo Costi
 *
 * Motore di calcolo puro (senza side-effect) che computa i costi dell'intervento.
 * Ogni risultato intermedio viene arrotondato a 2 decimali (half-up rounding).
 *
 * Formula semplificata (senza IVA, senza sconto):
 *   grandTotal = ore × 60€ + km × 0.90€ + spese vitto
 */

import { HOURLY_RATE, KM_RATE } from '@/config/constants';

// --- Interfaces ---

export interface CostInput {
  hours: number; // 0.25 - 24, incrementi 0.25
  kilometers: number; // 0 - 9999
  otherExpenses: number; // 0+, spese vitto/altro
}

export interface CostBreakdown {
  hourlyTotal: number; // hours × HOURLY_RATE
  kilometerTotal: number; // km × KM_RATE
  travelHours: number; // km / 55 (stima ore viaggio)
  travelCost: number; // travelHours × HOURLY_RATE
  otherExpenses: number; // spese altro
  grandTotal: number; // hourlyTotal + kilometerTotal + travelCost + otherExpenses
}

/** Velocità media stimata per calcolo ore viaggio (km/h) */
const AVERAGE_SPEED = 55;

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
 */
export function calculate(input: CostInput): CostBreakdown {
  const hourlyTotal = roundTo2(input.hours * HOURLY_RATE);
  const kilometerTotal = roundTo2(input.kilometers * KM_RATE);
  const travelHours = roundTo2(input.kilometers / AVERAGE_SPEED);
  const travelCost = roundTo2(travelHours * HOURLY_RATE);
  const otherExpenses = roundTo2(input.otherExpenses);
  const grandTotal = roundTo2(hourlyTotal + kilometerTotal + travelCost + otherExpenses);

  return {
    hourlyTotal,
    kilometerTotal,
    travelHours,
    travelCost,
    otherExpenses,
    grandTotal,
  };
}
