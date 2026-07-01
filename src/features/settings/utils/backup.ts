/**
 * Backup utilities — export and import all app data as JSON.
 */

import type { Report } from '@/features/reports/types';
import type { SettingsState } from '../stores/settingsStore';

const BACKUP_VERSION = '2.0';

export interface BackupData {
  version: string;
  reports: Report[];
  settings: Omit<SettingsState, 'updateSettings' | 'resetSettings' | 'clearAllData'>;
}

export interface ImportResult {
  reports: Report[];
  settings: Partial<SettingsState>;
  newReportsCount: number;
  skippedCount: number;
}

/**
 * Generate a JSON backup of all app data and trigger a download.
 */
export function exportBackup(reports: Report[], settings: SettingsState): void {
  const data: BackupData = {
    version: BACKUP_VERSION,
    reports,
    settings: {
      operatorCode: settings.operatorCode,
      homeCoordinates: settings.homeCoordinates,
      homeAddress: settings.homeAddress,
      openRouteServiceApiKey: settings.openRouteServiceApiKey,
      roadFactor: settings.roadFactor,
      averageSpeedKmh: settings.averageSpeedKmh,
    },
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `backup_assistenza_${today}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate that the parsed JSON has the expected backup structure.
 */
function isValidBackupStructure(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Must have version string
  if (typeof obj.version !== 'string') return false;

  // Must have reports array
  if (!Array.isArray(obj.reports)) return false;

  // Each report must have at least id and companyName
  for (const report of obj.reports) {
    if (typeof report !== 'object' || report === null) return false;
    const r = report as Record<string, unknown>;
    if (typeof r.id !== 'string') return false;
    if (typeof r.companyName !== 'string') return false;
  }

  // Settings is optional but if present must be an object
  if (obj.settings !== undefined && (typeof obj.settings !== 'object' || obj.settings === null)) {
    return false;
  }

  return true;
}

/**
 * Parse and validate a backup file. Returns import result with new/skipped counts.
 * Throws an error if the file is invalid.
 */
export async function importBackup(
  file: File,
  existingReportIds: string[],
): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Il file selezionato non è un backup valido.');
  }

  if (!isValidBackupStructure(parsed)) {
    throw new Error('Il file selezionato non è un backup valido.');
  }

  const existingIds = new Set(existingReportIds);
  const newReports: Report[] = [];
  let skippedCount = 0;

  for (const report of parsed.reports) {
    if (existingIds.has(report.id)) {
      skippedCount++;
    } else {
      newReports.push(report);
    }
  }

  const settings: Partial<SettingsState> = {};
  if (parsed.settings) {
    const s = parsed.settings;
    if (s.operatorCode !== undefined) settings.operatorCode = s.operatorCode;
    if (s.homeCoordinates !== undefined) settings.homeCoordinates = s.homeCoordinates;
    if (s.homeAddress !== undefined) settings.homeAddress = s.homeAddress;
    if (s.openRouteServiceApiKey !== undefined) settings.openRouteServiceApiKey = s.openRouteServiceApiKey;
    if (s.roadFactor !== undefined) settings.roadFactor = s.roadFactor;
    if (s.averageSpeedKmh !== undefined) settings.averageSpeedKmh = s.averageSpeedKmh;
  }

  return {
    reports: newReports,
    settings,
    newReportsCount: newReports.length,
    skippedCount,
  };
}
