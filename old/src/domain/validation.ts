/**
 * Modulo Validazione
 *
 * Validatore puro (senza side-effect) che verifica la correttezza
 * dei dati inseriti prima del salvataggio di un rapporto.
 *
 * Validates: Requirements 2.6, 3.3, 4.7, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { ReportFormData } from '../types/report';

// --- Interfaces ---

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// --- Costanti ---

const REQUIRED_FIELDS: Array<{ field: keyof ReportFormData; label: string }> = [
  { field: 'companyName', label: 'Ragione Sociale' },
  { field: 'interventionDate', label: 'Data intervento' },
  { field: 'performedBy', label: 'Intervento eseguito da' },
  { field: 'description', label: 'Descrizione' },
  { field: 'hoursWorked', label: 'Ore lavorate' },
];

const VAT_NUMBER_REGEX = /^\d{11}$/;

const HOURS_MIN = 0.25;
const HOURS_MAX = 24.00;
const KILOMETERS_MIN = 0;
const KILOMETERS_MAX = 9999999;
const DISCOUNT_MIN = 0;
const DISCOUNT_MAX = 100;

// --- Funzioni di validazione singole ---

/**
 * Valida una Partita IVA italiana: esattamente 11 cifre numeriche.
 */
export function validateVatNumber(vatNumber: string): boolean {
  return VAT_NUMBER_REGEX.test(vatNumber);
}

/**
 * Valida le ore lavorate: deve essere un numero nel range [0.25, 24.00].
 */
export function validateHours(hours: number): boolean {
  return typeof hours === 'number' && !isNaN(hours) && hours >= HOURS_MIN && hours <= HOURS_MAX;
}

/**
 * Valida i chilometri: deve essere un numero nel range [0, 9999999].
 */
export function validateKilometers(km: number): boolean {
  return typeof km === 'number' && !isNaN(km) && km >= KILOMETERS_MIN && km <= KILOMETERS_MAX;
}

/**
 * Valida la percentuale di sconto: deve essere un numero nel range [0, 100].
 */
export function validateDiscount(discount: number): boolean {
  return typeof discount === 'number' && !isNaN(discount) && discount >= DISCOUNT_MIN && discount <= DISCOUNT_MAX;
}

// --- Validazione singolo campo ---

/**
 * Valida un singolo campo del rapporto.
 * Restituisce un ValidationError se il campo non è valido, null altrimenti.
 */
export function validateField(field: string, value: unknown): ValidationError | null {
  switch (field) {
    case 'companyName':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { field, message: 'Ragione Sociale è obbligatoria', type: 'required' };
      }
      return null;

    case 'interventionDate':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { field, message: 'Data intervento è obbligatoria', type: 'required' };
      }
      return null;

    case 'performedBy':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { field, message: 'Intervento eseguito da è obbligatorio', type: 'required' };
      }
      return null;

    case 'description':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { field, message: 'Descrizione è obbligatoria', type: 'required' };
      }
      return null;

    case 'hoursWorked':
      if (value === undefined || value === null || value === '') {
        return { field, message: 'Ore lavorate è obbligatorio', type: 'required' };
      }
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: 'Ore lavorate deve essere un valore numerico', type: 'format' };
      }
      if (!validateHours(value)) {
        return { field, message: `Ore lavorate deve essere compreso tra ${HOURS_MIN} e ${HOURS_MAX}`, type: 'range' };
      }
      return null;

    case 'vatNumber':
      // P.IVA rimossa — nessuna validazione
      return null;

    case 'kilometers':
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value !== 'number' || isNaN(value)) {
          return { field, message: 'Chilometri deve essere un valore numerico', type: 'format' };
        }
        if (!validateKilometers(value)) {
          return { field, message: `Chilometri deve essere compreso tra ${KILOMETERS_MIN} e ${KILOMETERS_MAX}`, type: 'range' };
        }
      }
      return null;

    case 'discountPercent':
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value !== 'number' || isNaN(value)) {
          return { field, message: 'Sconto deve essere un valore numerico', type: 'format' };
        }
        if (!validateDiscount(value)) {
          return { field, message: `Sconto deve essere compreso tra ${DISCOUNT_MIN}% e ${DISCOUNT_MAX}%`, type: 'range' };
        }
      }
      return null;

    default:
      return null;
  }
}

// --- Validazione report completo ---

/**
 * Valida un intero rapporto.
 * Controlla tutti i campi obbligatori e i vincoli di formato/range.
 * Restituisce un ValidationResult con isValid e la lista degli errori.
 */
export function validateReport(report: ReportFormData): ValidationResult {
  const errors: ValidationError[] = [];

  // Valida campi obbligatori
  for (const { field, label } of REQUIRED_FIELDS) {
    const value = report[field];

    if (field === 'hoursWorked') {
      // hoursWorked ha validazione speciale (numerico + range)
      const error = validateField(field, value);
      if (error) {
        errors.push(error);
      }
    } else {
      // Campi stringa obbligatori
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field,
          message: `${label} è obbligatori${label.endsWith('a') ? 'a' : 'o'}`,
          type: 'required',
        });
      }
    }
  }

  // P.IVA rimossa — nessuna validazione

  // Valida chilometri (opzionale ma se presente deve essere valido)
  if (report.kilometers !== undefined && report.kilometers !== null) {
    const kmError = validateField('kilometers', report.kilometers);
    if (kmError) {
      errors.push(kmError);
    }
  }

  // Valida sconto
  if (report.discountPercent !== undefined && report.discountPercent !== null) {
    const discountError = validateField('discountPercent', report.discountPercent);
    if (discountError) {
      errors.push(discountError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
