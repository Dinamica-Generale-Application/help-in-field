import { describe, it, expect } from 'vitest';
import {
  validateReport,
  validateField,
  validateVatNumber,
  validateHours,
  validateKilometers,
  validateDiscount,
} from './validation';
import type { ReportFormData } from '../types/report';

// Helper: rapporto completo e valido
function makeValidReport(overrides: Partial<ReportFormData> = {}): ReportFormData {
  return {
    status: 'completed',
    companyName: 'Acme S.r.l.',
    address: 'Via Roma 1',
    phone: '0123456789',
    vatNumber: '12345678901',
    interventionDate: '2024-06-15',
    performedBy: 'Mario Rossi',
    interventionLocation: 'Milano',
    requestedBy: 'Luigi Bianchi',
    onBehalfOf: 'Azienda X',
    interventionReason: 'malfunction',
    description: 'Riparazione pompa idraulica',
    model: 'PH-200',
    serialNumber: '1ZZA1234',
    productionYear: '2020',
    warranty: 'out_warranty',
    payment: 'paid',
    hoursWorked: 4,
    kilometers: 120,
    discountPercent: 10,
    notes: 'Nessuna nota',
    ...overrides,
  };
}

// --- validateVatNumber ---

describe('validateVatNumber', () => {
  it('accetta esattamente 11 cifre numeriche', () => {
    expect(validateVatNumber('12345678901')).toBe(true);
    expect(validateVatNumber('00000000000')).toBe(true);
    expect(validateVatNumber('99999999999')).toBe(true);
  });

  it('rifiuta stringhe con meno di 11 cifre', () => {
    expect(validateVatNumber('1234567890')).toBe(false);
    expect(validateVatNumber('')).toBe(false);
  });

  it('rifiuta stringhe con più di 11 cifre', () => {
    expect(validateVatNumber('123456789012')).toBe(false);
  });

  it('rifiuta stringhe con caratteri non numerici', () => {
    expect(validateVatNumber('1234567890a')).toBe(false);
    expect(validateVatNumber('IT12345678901')).toBe(false);
    expect(validateVatNumber('123-456-7890')).toBe(false);
  });
});

// --- validateHours ---

describe('validateHours', () => {
  it('accetta valori nel range [0.25, 24.00]', () => {
    expect(validateHours(0.25)).toBe(true);
    expect(validateHours(1)).toBe(true);
    expect(validateHours(12.5)).toBe(true);
    expect(validateHours(24)).toBe(true);
  });

  it('rifiuta valori sotto 0.25', () => {
    expect(validateHours(0)).toBe(false);
    expect(validateHours(0.24)).toBe(false);
    expect(validateHours(-1)).toBe(false);
  });

  it('rifiuta valori sopra 24', () => {
    expect(validateHours(24.01)).toBe(false);
    expect(validateHours(100)).toBe(false);
  });

  it('rifiuta NaN', () => {
    expect(validateHours(NaN)).toBe(false);
  });
});

// --- validateKilometers ---

describe('validateKilometers', () => {
  it('accetta valori nel range [0, 9999999]', () => {
    expect(validateKilometers(0)).toBe(true);
    expect(validateKilometers(100)).toBe(true);
    expect(validateKilometers(9999999)).toBe(true);
  });

  it('rifiuta valori negativi', () => {
    expect(validateKilometers(-1)).toBe(false);
    expect(validateKilometers(-0.01)).toBe(false);
  });

  it('rifiuta valori sopra 9999999', () => {
    expect(validateKilometers(10000000)).toBe(false);
  });

  it('rifiuta NaN', () => {
    expect(validateKilometers(NaN)).toBe(false);
  });
});

// --- validateDiscount ---

describe('validateDiscount', () => {
  it('accetta valori nel range [0, 100]', () => {
    expect(validateDiscount(0)).toBe(true);
    expect(validateDiscount(50)).toBe(true);
    expect(validateDiscount(100)).toBe(true);
  });

  it('rifiuta valori negativi', () => {
    expect(validateDiscount(-1)).toBe(false);
    expect(validateDiscount(-0.01)).toBe(false);
  });

  it('rifiuta valori sopra 100', () => {
    expect(validateDiscount(100.01)).toBe(false);
    expect(validateDiscount(200)).toBe(false);
  });

  it('rifiuta NaN', () => {
    expect(validateDiscount(NaN)).toBe(false);
  });
});

// --- validateField ---

describe('validateField', () => {
  describe('campi obbligatori (string)', () => {
    it('ritorna errore required per companyName vuota', () => {
      const err = validateField('companyName', '');
      expect(err).not.toBeNull();
      expect(err!.type).toBe('required');
      expect(err!.field).toBe('companyName');
    });

    it('ritorna errore required per companyName null/undefined', () => {
      expect(validateField('companyName', null)?.type).toBe('required');
      expect(validateField('companyName', undefined)?.type).toBe('required');
    });

    it('ritorna null per companyName valida', () => {
      expect(validateField('companyName', 'Acme')).toBeNull();
    });

    it('ritorna errore per stringa con soli spazi', () => {
      expect(validateField('companyName', '   ')?.type).toBe('required');
    });
  });

  describe('hoursWorked', () => {
    it('ritorna required se mancante', () => {
      expect(validateField('hoursWorked', undefined)?.type).toBe('required');
      expect(validateField('hoursWorked', null)?.type).toBe('required');
      expect(validateField('hoursWorked', '')?.type).toBe('required');
    });

    it('ritorna format se non numerico', () => {
      expect(validateField('hoursWorked', 'abc')?.type).toBe('format');
      expect(validateField('hoursWorked', true)?.type).toBe('format');
    });

    it('ritorna range se fuori range', () => {
      expect(validateField('hoursWorked', 0)?.type).toBe('range');
      expect(validateField('hoursWorked', 25)?.type).toBe('range');
    });

    it('ritorna null se valido', () => {
      expect(validateField('hoursWorked', 4)).toBeNull();
    });
  });

  describe('vatNumber', () => {
    it('ritorna null se vuoto (campo opzionale)', () => {
      expect(validateField('vatNumber', '')).toBeNull();
      expect(validateField('vatNumber', undefined)).toBeNull();
      expect(validateField('vatNumber', null)).toBeNull();
    });

    it('ritorna null per qualsiasi valore (campo rimosso)', () => {
      expect(validateField('vatNumber', '123')).toBeNull();
      expect(validateField('vatNumber', '1234567890a')).toBeNull();
    });

    it('ritorna null se valido', () => {
      expect(validateField('vatNumber', '12345678901')).toBeNull();
    });
  });

  describe('kilometers', () => {
    it('ritorna null se vuoto (campo opzionale)', () => {
      expect(validateField('kilometers', undefined)).toBeNull();
      expect(validateField('kilometers', null)).toBeNull();
      expect(validateField('kilometers', '')).toBeNull();
    });

    it('ritorna format se non numerico', () => {
      expect(validateField('kilometers', 'abc')?.type).toBe('format');
    });

    it('ritorna range se fuori range', () => {
      expect(validateField('kilometers', -1)?.type).toBe('range');
      expect(validateField('kilometers', 10000000)?.type).toBe('range');
    });

    it('ritorna null se valido', () => {
      expect(validateField('kilometers', 100)).toBeNull();
    });
  });

  describe('discountPercent', () => {
    it('ritorna null se vuoto (campo opzionale)', () => {
      expect(validateField('discountPercent', undefined)).toBeNull();
      expect(validateField('discountPercent', null)).toBeNull();
      expect(validateField('discountPercent', '')).toBeNull();
    });

    it('ritorna format se non numerico', () => {
      expect(validateField('discountPercent', 'abc')?.type).toBe('format');
    });

    it('ritorna range se fuori range', () => {
      expect(validateField('discountPercent', -1)?.type).toBe('range');
      expect(validateField('discountPercent', 101)?.type).toBe('range');
    });

    it('ritorna null se valido', () => {
      expect(validateField('discountPercent', 10)).toBeNull();
    });
  });

  describe('campo sconosciuto', () => {
    it('ritorna null per campi non gestiti', () => {
      expect(validateField('unknownField', 'anything')).toBeNull();
    });
  });
});

// --- validateReport ---

describe('validateReport', () => {
  it('ritorna isValid true per un rapporto completo valido', () => {
    const result = validateReport(makeValidReport());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rileva companyName mancante', () => {
    const result = validateReport(makeValidReport({ companyName: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'companyName' && e.type === 'required')).toBe(true);
  });

  it('rileva interventionDate mancante', () => {
    const result = validateReport(makeValidReport({ interventionDate: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'interventionDate' && e.type === 'required')).toBe(true);
  });

  it('rileva performedBy mancante', () => {
    const result = validateReport(makeValidReport({ performedBy: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'performedBy' && e.type === 'required')).toBe(true);
  });

  it('rileva description mancante', () => {
    const result = validateReport(makeValidReport({ description: '' }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'description' && e.type === 'required')).toBe(true);
  });

  it('rileva hoursWorked mancante', () => {
    const result = validateReport(makeValidReport({ hoursWorked: undefined }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'hoursWorked' && e.type === 'required')).toBe(true);
  });

  it('rileva hoursWorked fuori range', () => {
    const result = validateReport(makeValidReport({ hoursWorked: 25 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'hoursWorked' && e.type === 'range')).toBe(true);
  });

  it('ignora P.IVA (campo rimosso)', () => {
    const result = validateReport(makeValidReport({ vatNumber: '123' }));
    expect(result.isValid).toBe(true);
    expect(result.errors.some(e => e.field === 'vatNumber')).toBe(false);
  });

  it('rileva chilometri fuori range', () => {
    const result = validateReport(makeValidReport({ kilometers: -5 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'kilometers' && e.type === 'range')).toBe(true);
  });

  it('rileva sconto fuori range', () => {
    const result = validateReport(makeValidReport({ discountPercent: 150 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'discountPercent' && e.type === 'range')).toBe(true);
  });

  it('rileva errori multipli', () => {
    const result = validateReport(makeValidReport({
      companyName: '',
      description: '',
      hoursWorked: undefined,
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accetta rapporto senza campi opzionali', () => {
    const result = validateReport(makeValidReport({
      vatNumber: undefined,
      kilometers: undefined,
      address: undefined,
      phone: undefined,
      notes: undefined,
    }));
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
