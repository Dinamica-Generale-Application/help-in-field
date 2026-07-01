/**
 * Formatting utilities — Italian locale (DD/MM/YYYY, € 1.234,56).
 */

/**
 * Formats a date string (ISO 8601 YYYY-MM-DD) or Date to DD/MM/YYYY.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a number as Italian currency: € 1.234,56
 * Uses manual formatting to avoid locale inconsistencies in different environments.
 */
export function formatCurrency(amount: number): string {
  // Round to 2 decimals
  const fixed = Math.abs(amount).toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0]!;
  const decPart = parts[1]!;

  // Add thousands separator (dot)
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const sign = amount < 0 ? '-' : '';
  return `€ ${sign}${withThousands},${decPart}`;
}

/**
 * Parses a number that may use Italian notation (comma as decimal separator).
 * Accepts both dot and comma as decimal separator.
 * Returns NaN if the string is not a valid number.
 */
export function parseItalianNumber(value: string): number {
  if (!value || value.trim() === '') return NaN;
  // Replace comma with dot for parsing
  const normalized = value.trim().replace(',', '.');
  const result = Number(normalized);
  return result;
}
