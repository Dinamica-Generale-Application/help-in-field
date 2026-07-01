/**
 * Shared types used across the application.
 */

/** GPS coordinates */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** localStorage keys */
export const STORAGE_KEYS = {
  REPORTS: 'hif_reports',
  SETTINGS: 'hif_settings',
  VERSION: 'hif_version',
} as const;
