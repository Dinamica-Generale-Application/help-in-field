/**
 * ClientRepository - Data access layer for client records.
 *
 * Provides CRUD operations, search, CSV import for the clients table.
 * Used for autocomplete in the report form.
 */

import { generateId } from '../utils/generate-id';
import { getDatabase } from './database';

// --- Interfaces ---

export interface Client {
  id: string;
  companyName: string;
  address?: string;
  phone?: string;
}

// --- Repository Implementation ---

/**
 * Get all clients ordered by company name.
 */
export async function getAll(): Promise<Client[]> {
  const { sqliteDb } = getDatabase();
  const rows = await sqliteDb.getAllAsync<{
    id: string;
    company_name: string;
    address: string | null;
    phone: string | null;
  }>('SELECT id, company_name, address, phone FROM clients ORDER BY company_name');

  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
  }));
}

/**
 * Search clients by company name (case-insensitive LIKE %query%).
 */
export async function search(query: string): Promise<Client[]> {
  const { sqliteDb } = getDatabase();
  const pattern = `%${query}%`;
  const rows = await sqliteDb.getAllAsync<{
    id: string;
    company_name: string;
    address: string | null;
    phone: string | null;
  }>(
    'SELECT id, company_name, address, phone FROM clients WHERE company_name LIKE ? ORDER BY company_name LIMIT 20',
    [pattern]
  );

  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
  }));
}

/**
 * Add a single client.
 */
export async function add(client: Omit<Client, 'id'>): Promise<Client> {
  const { sqliteDb } = getDatabase();
  const id = generateId();

  await sqliteDb.runAsync(
    'INSERT INTO clients (id, company_name, address, phone) VALUES (?, ?, ?, ?)',
    [id, client.companyName, client.address ?? null, client.phone ?? null]
  );

  return { id, ...client };
}

/**
 * Get count of clients in database.
 */
export async function getCount(): Promise<number> {
  const { sqliteDb } = getDatabase();
  const result = await sqliteDb.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clients'
  );
  return result?.count ?? 0;
}

/**
 * Delete all clients.
 */
export async function deleteAll(): Promise<void> {
  const { sqliteDb } = getDatabase();
  await sqliteDb.runAsync('DELETE FROM clients');
}

/**
 * Import clients from CSV content.
 *
 * Expected format:
 * - First row = headers
 * - Delimiter: `;` or `,` (auto-detected)
 * - Expected columns (case-insensitive): nome/ragione_sociale/ragione sociale, indirizzo, telefono
 * - Skips duplicates by company_name
 *
 * @returns Number of clients imported
 */
export async function importFromCsv(csvContent: string): Promise<number> {
  const { sqliteDb } = getDatabase();

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return 0; // Need at least header + 1 data row

  // Auto-detect delimiter
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  // Parse headers
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  // Find column indices
  const nameIdx = headers.findIndex(
    (h) =>
      h === 'nome' ||
      h === 'ragione_sociale' ||
      h === 'ragione sociale' ||
      h === 'company_name' ||
      h === 'azienda' ||
      h === 'cliente'
  );
  const addressIdx = headers.findIndex(
    (h) => h === 'indirizzo' || h === 'address' || h === 'sede'
  );
  const phoneIdx = headers.findIndex(
    (h) => h === 'telefono' || h === 'phone' || h === 'tel'
  );

  if (nameIdx === -1) return 0; // Must have at least the name column

  // Get existing company names for deduplication
  const existing = await sqliteDb.getAllAsync<{ company_name: string }>(
    'SELECT company_name FROM clients'
  );
  const existingNames = new Set(existing.map((r) => r.company_name.toLowerCase()));

  let importedCount = 0;

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i], delimiter);
    const companyName = fields[nameIdx]?.trim();
    if (!companyName) continue;

    // Skip duplicates
    if (existingNames.has(companyName.toLowerCase())) continue;

    const id = generateId();
    const address = addressIdx >= 0 ? fields[addressIdx]?.trim() || null : null;
    const phone = phoneIdx >= 0 ? fields[phoneIdx]?.trim() || null : null;

    await sqliteDb.runAsync(
      'INSERT INTO clients (id, company_name, address, phone) VALUES (?, ?, ?, ?)',
      [id, companyName, address, phone]
    );

    existingNames.add(companyName.toLowerCase());
    importedCount++;
  }

  return importedCount;
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields.map((f) => f.replace(/^"|"$/g, ''));
}

// --- Exported Repository Object ---

export const clientRepository = {
  getAll,
  search,
  add,
  getCount,
  deleteAll,
  importFromCsv,
};


/**
 * Import clients from a CSV file — handles file picking cross-platform.
 * Returns number of clients imported.
 */
export async function importClientsFromCsv(): Promise<number> {
  const { Platform } = require('react-native');
  let csvContent: string;

  if (Platform.OS === 'web') {
    // Web: use file input
    csvContent = await new Promise<string>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('Nessun file selezionato.')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Errore lettura file.'));
        reader.readAsText(file);
      };
      input.oncancel = () => reject(new Error('Selezione annullata.'));
      input.click();
    });
  } else {
    // Native: use expo-document-picker
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = (await import('expo-file-system')).default;
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return 0;
    }
    csvContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
  }

  return importFromCsv(csvContent);
}
