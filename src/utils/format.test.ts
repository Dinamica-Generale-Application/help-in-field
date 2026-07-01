import { describe, it, expect } from 'vitest';
import { formatDate, formatCurrency, parseItalianNumber } from './format';

describe('formatDate', () => {
  it('formats ISO date string to DD/MM/YYYY', () => {
    expect(formatDate('2024-06-15')).toBe('15/06/2024');
    expect(formatDate('2024-01-01')).toBe('01/01/2024');
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  it('formats Date object to DD/MM/YYYY', () => {
    const d = new Date(2024, 5, 15); // June 15, 2024
    expect(formatDate(d)).toBe('15/06/2024');
  });
});

describe('formatCurrency', () => {
  it('formats numbers with Italian locale and € symbol', () => {
    expect(formatCurrency(1234.56)).toBe('€ 1.234,56');
    expect(formatCurrency(0)).toBe('€ 0,00');
    expect(formatCurrency(60)).toBe('€ 60,00');
  });

  it('always shows 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('€ 100,00');
    expect(formatCurrency(99.9)).toBe('€ 99,90');
  });
});

describe('parseItalianNumber', () => {
  it('parses numbers with dot as decimal separator', () => {
    expect(parseItalianNumber('1.5')).toBe(1.5);
    expect(parseItalianNumber('10.25')).toBe(10.25);
  });

  it('parses numbers with comma as decimal separator', () => {
    expect(parseItalianNumber('1,5')).toBe(1.5);
    expect(parseItalianNumber('10,25')).toBe(10.25);
  });

  it('parses integers', () => {
    expect(parseItalianNumber('42')).toBe(42);
    expect(parseItalianNumber('0')).toBe(0);
  });

  it('returns NaN for empty or invalid strings', () => {
    expect(parseItalianNumber('')).toBeNaN();
    expect(parseItalianNumber('  ')).toBeNaN();
    expect(parseItalianNumber('abc')).toBeNaN();
  });

  it('trims whitespace', () => {
    expect(parseItalianNumber(' 3,5 ')).toBe(3.5);
  });
});
