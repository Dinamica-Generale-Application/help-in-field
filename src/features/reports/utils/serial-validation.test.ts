import { describe, it, expect } from 'vitest';
import { validateSerialNumber, validateModel } from './serial-validation';

describe('validateSerialNumber', () => {
  it('accepts empty value (optional field)', () => {
    expect(validateSerialNumber('')).toEqual({ isValid: true });
    expect(validateSerialNumber('  ')).toEqual({ isValid: true });
  });

  it('accepts valid serial format: NZZNNNAА', () => {
    expect(validateSerialNumber('1ZZ533DE')).toEqual({ isValid: true });
    expect(validateSerialNumber('0ZZ000AA')).toEqual({ isValid: true });
    expect(validateSerialNumber('9ZZ999ZZ')).toEqual({ isValid: true });
  });

  it('rejects invalid serial formats', () => {
    const result1 = validateSerialNumber('ABC12345');
    expect(result1.isValid).toBe(false);
    expect(result1.message).toBeDefined();

    // Missing ZZ
    expect(validateSerialNumber('1AA533DE').isValid).toBe(false);
    // Lowercase letters
    expect(validateSerialNumber('1ZZ533de').isValid).toBe(false);
    // Too short
    expect(validateSerialNumber('1ZZ53').isValid).toBe(false);
    // Too long
    expect(validateSerialNumber('1ZZ533DEX').isValid).toBe(false);
  });
});

describe('validateModel', () => {
  it('accepts empty value (optional field)', () => {
    expect(validateModel('')).toEqual({ isValid: true });
    expect(validateModel('  ')).toEqual({ isValid: true });
  });

  it('accepts valid model format: NNN-NNNN', () => {
    expect(validateModel('969-0406')).toEqual({ isValid: true });
    expect(validateModel('000-0000')).toEqual({ isValid: true });
    expect(validateModel('123-4567')).toEqual({ isValid: true });
  });

  it('rejects invalid model formats', () => {
    const result1 = validateModel('ABC-1234');
    expect(result1.isValid).toBe(false);
    expect(result1.message).toBeDefined();

    // Missing dash
    expect(validateModel('1234567').isValid).toBe(false);
    // Wrong digit count
    expect(validateModel('12-3456').isValid).toBe(false);
    expect(validateModel('1234-567').isValid).toBe(false);
    // Letters mixed in
    expect(validateModel('12A-4567').isValid).toBe(false);
  });
});
