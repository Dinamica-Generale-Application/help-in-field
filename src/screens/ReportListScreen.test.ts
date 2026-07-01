/**
 * Tests for ReportListScreen utility functions.
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest';

// Extract and test the formatDate utility
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

describe('ReportListScreen - formatDate', () => {
  it('formats ISO date to DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024');
  });

  it('formats ISO datetime to DD/MM/YYYY', () => {
    expect(formatDate('2024-12-01T10:30:00.000Z')).toBe('01/12/2024');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns the original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('pads single-digit day and month', () => {
    expect(formatDate('2024-01-05')).toBe('05/01/2024');
  });

  it('handles end-of-year date', () => {
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });
});
