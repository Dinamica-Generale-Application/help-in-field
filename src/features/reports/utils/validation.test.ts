import { describe, it, expect } from 'vitest';
import {
  validateReport,
  validateField,
  validateHours,
  validateKilometers,
  validateDiscount,
} from './validation';
import type { ReportFormData } from '../types';

function makeValidReport(overrides: Partial<ReportFormData> = {}): ReportFormData {
  return {
    status: 'completed',
    companyName: 'Acme S.r.l.',
    address: 'Via Roma 1',
    phone: '0123456789',
    interventionDate: '2024-06-15',
    operator: 'OP1',
    interventionLocation: 'Milano',
    requestedBy: 'Ufficio tecnico',
    onBehalfOf: 'Azienda X',
    interventionReason: 'malfunction',
    description: 'Riparazione pompa idraulica',
    devices: [],
    hoursWorked: 4,
    kilometers: 120,
    discountPercent: 10,
    payment: 'paid',
    notes: 'Nessuna nota',
    attachments: [],
    ...overrides,
  };
}

describe('validateHours', () => {
  it('accepts values in range [0.25, 24]', () => {
    expect(validateHours(0.25)).toBe(true);
    expect(validateHours(12)).toBe(true);
    expect(validateHours(24)).toBe(true);
  });

  it('rejects values below 0.25', () => {
    expect(validateHours(0)).toBe(false);
    expect(validateHours(0.24)).toBe(false);
    expect(validateHours(-1)).toBe(false);
  });

  it('rejects values above 24', () => {
    expect(validateHours(24.01)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateHours(NaN)).toBe(false);
  });
});

describe('validateKilometers', () => {
  it('accepts values in range [0, 9999]', () => {
    expect(validateKilometers(0)).toBe(true);
    expect(validateKilometers(100)).toBe(true);
    expect(validateKilometers(9999)).toBe(true);
  });

  it('rejects negative values', () => {
    expect(validateKilometers(-1)).toBe(false);
  });

  it('rejects values above 9999', () => {
    expect(validateKilometers(10000)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateKilometers(NaN)).toBe(false);
  });
});

describe('validateDiscount', () => {
  it('accepts values in range [0, 100]', () => {
    expect(validateDiscount(0)).toBe(true);
    expect(validateDiscount(50)).toBe(true);
    expect(validateDiscount(100)).toBe(true);
  });

  it('rejects negative values', () => {
    expect(validateDiscount(-1)).toBe(false);
  });

  it('rejects values above 100', () => {
    expect(validateDiscount(101)).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateDiscount(NaN)).toBe(false);
  });
});

describe('validateField', () => {
  it('returns required error for empty companyName', () => {
    const err = validateField('companyName', '');
    expect(err).not.toBeNull();
    expect(err!.type).toBe('required');
  });

  it('returns null for valid companyName', () => {
    expect(validateField('companyName', 'Acme')).toBeNull();
  });

  it('returns required error for empty operator', () => {
    expect(validateField('operator', '')?.type).toBe('required');
    expect(validateField('operator', null)?.type).toBe('required');
  });

  it('returns required for missing hoursWorked', () => {
    expect(validateField('hoursWorked', undefined)?.type).toBe('required');
    expect(validateField('hoursWorked', '')?.type).toBe('required');
  });

  it('returns format for non-numeric hoursWorked', () => {
    expect(validateField('hoursWorked', 'abc')?.type).toBe('format');
  });

  it('returns range for out-of-range hoursWorked', () => {
    expect(validateField('hoursWorked', 0)?.type).toBe('range');
    expect(validateField('hoursWorked', 25)?.type).toBe('range');
  });

  it('returns null for valid hoursWorked', () => {
    expect(validateField('hoursWorked', 4)).toBeNull();
  });

  it('returns null for unknown fields', () => {
    expect(validateField('unknownField', 'anything')).toBeNull();
  });
});

describe('validateReport', () => {
  it('returns isValid true for a complete valid report', () => {
    const result = validateReport(makeValidReport());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing companyName', () => {
    const result = validateReport(makeValidReport({ companyName: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'companyName')).toBe(true);
  });

  it('detects missing operator', () => {
    const result = validateReport(makeValidReport({ operator: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'operator')).toBe(true);
  });

  it('detects missing description', () => {
    const result = validateReport(makeValidReport({ description: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'description')).toBe(true);
  });

  it('detects out-of-range kilometers', () => {
    const result = validateReport(makeValidReport({ kilometers: -5 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'kilometers')).toBe(true);
  });

  it('detects out-of-range discount', () => {
    const result = validateReport(makeValidReport({ discountPercent: 150 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'discountPercent')).toBe(true);
  });

  it('detects multiple errors', () => {
    const result = validateReport(makeValidReport({
      companyName: '',
      description: '',
      hoursWorked: undefined as unknown as number,
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts report without optional fields', () => {
    const result = validateReport(makeValidReport({
      kilometers: undefined,
      address: undefined,
      phone: undefined,
      notes: undefined,
    }));
    expect(result.isValid).toBe(true);
  });
});
