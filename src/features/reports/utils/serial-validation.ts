/**
 * Serial number and model validation.
 *
 * WARNING only — non-blocking validation.
 * Pattern serial: NZZNNNAА (N=cifra, Z=lettera Z fissa, A=lettera maiuscola)
 * Pattern model: NNN-NNNN (3 cifre + trattino + 4 cifre)
 */

/** Serial number regex: 1 digit + ZZ + 3 digits + 2 uppercase letters */
const SERIAL_REGEX = /^[0-9]ZZ[0-9]{3}[A-Z]{2}$/;

/** Model regex: 3 digits + dash + 4 digits */
const MODEL_REGEX = /^[0-9]{3}-[0-9]{4}$/;

export interface SerialValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates a serial number against the expected format.
 * Returns valid=true if the value is empty (field is optional) or matches the pattern.
 */
export function validateSerialNumber(value: string): SerialValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true };
  }
  if (SERIAL_REGEX.test(value.trim())) {
    return { isValid: true };
  }
  return {
    isValid: false,
    message: 'Formato atteso: 1ZZ533DE',
  };
}

/**
 * Validates a model against the expected format.
 * Returns valid=true if the value is empty (field is optional) or matches the pattern.
 */
export function validateModel(value: string): SerialValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true };
  }
  if (MODEL_REGEX.test(value.trim())) {
    return { isValid: true };
  }
  return {
    isValid: false,
    message: 'Formato atteso: 969-0406',
  };
}
