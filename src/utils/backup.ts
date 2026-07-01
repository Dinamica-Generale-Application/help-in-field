/**
 * Backup/Restore module — esportazione e importazione dati per cambio dispositivo.
 *
 * Cross-platform:
 * - Native: usa expo-sharing + expo-file-system + expo-document-picker
 * - Web: usa Blob download + file input
 *
 * Esporta tutti i rapporti, dispositivi e metadati allegati come file JSON condivisibile.
 * Permette il ripristino su un nuovo dispositivo importando il file di backup.
 */

import { Platform } from 'react-native';
import { getDatabase } from '../data/database';

interface BackupData {
  version: 1;
  exportDate: string;
  reports: Record<string, unknown>[];
  devices: Record<string, unknown>[];
  attachments: Record<string, unknown>[];
}

/**
 * Export all data as JSON and share/download.
 */
export async function exportBackup(): Promise<void> {
  const { sqliteDb } = getDatabase();

  const reports = await sqliteDb.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM reports ORDER BY created_at DESC'
  );
  const devices = await sqliteDb.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM devices'
  );
  const attachments = await sqliteDb.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM attachments'
  );

  const backup: BackupData = {
    version: 1,
    exportDate: new Date().toISOString(),
    reports,
    devices,
    attachments,
  };

  const json = JSON.stringify(backup, null, 2);
  const fileName = `backup_assistenza_${new Date().toISOString().split('T')[0]}.json`;

  if (Platform.OS === 'web') {
    // Web: download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Native: write to cache and share
    const FileSystem = (await import('expo-file-system')).default;
    const Sharing = await import('expo-sharing');
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, json);
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Esporta backup rapporti',
    });
  }
}

/**
 * Import a backup JSON file and restore all data.
 * Returns the number of reports imported.
 */
export async function importBackup(): Promise<number> {
  let json: string;

  if (Platform.OS === 'web') {
    // Web: use file input
    json = await pickFileWeb();
  } else {
    // Native: use document picker
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = (await import('expo-file-system')).default;

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return 0;
    }

    const fileUri = result.assets[0].uri;
    json = await FileSystem.readAsStringAsync(fileUri);
  }

  const backup: BackupData = JSON.parse(json);

  if (!backup.version || !backup.reports) {
    throw new Error('File di backup non valido.');
  }

  const { sqliteDb } = getDatabase();

  // Import reports (skip duplicates by ID)
  let importedCount = 0;
  for (const report of backup.reports) {
    const existing = await sqliteDb.getFirstAsync(
      'SELECT id FROM reports WHERE id = ?',
      [report.id as string]
    );
    if (!existing) {
      const columns = [
        'id', 'status', 'company_name', 'address', 'phone', 'vat_number',
        'intervention_date', 'performed_by', 'intervention_location',
        'intervention_lat', 'intervention_lon', 'requested_by', 'on_behalf_of',
        'intervention_reason', 'description', 'model', 'serial_number',
        'production_year', 'warranty', 'payment', 'hours_worked', 'kilometers',
        'discount_percent', 'hourly_total', 'kilometer_total', 'subtotal',
        'discount_amount', 'discounted_subtotal', 'vat_amount', 'grand_total',
        'notes', 'created_at', 'updated_at',
      ];
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((col) => (report[col] as string | number | null) ?? null);

      await sqliteDb.runAsync(
        `INSERT INTO reports (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      importedCount++;
    }
  }

  // Import devices
  for (const device of backup.devices) {
    const existing = await sqliteDb.getFirstAsync(
      'SELECT id FROM devices WHERE id = ?',
      [device.id as string]
    );
    if (!existing) {
      await sqliteDb.runAsync(
        'INSERT INTO devices (id, report_id, model, serial_number, production_year, warranty) VALUES (?, ?, ?, ?, ?, ?)',
        [
          device.id as string,
          device.report_id as string,
          (device.model as string) ?? null,
          (device.serial_number as string) ?? null,
          (device.production_year as string) ?? null,
          (device.warranty as string) ?? null,
        ]
      );
    }
  }

  // Import attachments metadata
  for (const attachment of backup.attachments) {
    const existing = await sqliteDb.getFirstAsync(
      'SELECT id FROM attachments WHERE id = ?',
      [attachment.id as string]
    );
    if (!existing) {
      await sqliteDb.runAsync(
        'INSERT INTO attachments (id, report_id, type, file_path, file_name, mime_type, file_size, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          attachment.id as string,
          attachment.report_id as string,
          attachment.type as string,
          attachment.file_path as string,
          attachment.file_name as string,
          attachment.mime_type as string,
          attachment.file_size as number,
          (attachment.description as string) ?? null,
          attachment.created_at as string,
        ]
      );
    }
  }

  return importedCount;
}

// --- Web file picker helper ---

function pickFileWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('Nessun file selezionato.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Errore durante la lettura del file.'));
      };
      reader.readAsText(file);
    };

    input.oncancel = () => {
      reject(new Error('Selezione annullata.'));
    };

    input.click();
  });
}
