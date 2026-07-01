/**
 * DeviceRepository — gestione dispositivi associati a un rapporto.
 * Ogni rapporto può avere multipli dispositivi (modello, numero di serie, etc).
 */

import { generateId } from '../utils/generate-id';
import { getDatabase } from './database';
import type { Device, WarrantyStatus } from '../types/report';

export interface DeviceInput {
  model?: string;
  serialNumber?: string;
  productionYear?: string;
  warranty?: WarrantyStatus;
}

/**
 * Adds a new device to a report.
 */
export async function addDevice(reportId: string, data: DeviceInput): Promise<Device> {
  const { sqliteDb } = getDatabase();
  const id = generateId();

  await sqliteDb.runAsync(
    `INSERT INTO devices (id, report_id, model, serial_number, production_year, warranty)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      reportId,
      data.model ?? null,
      data.serialNumber ?? null,
      data.productionYear ?? null,
      data.warranty ?? null,
    ]
  );

  return {
    id,
    reportId,
    model: data.model,
    serialNumber: data.serialNumber,
    productionYear: data.productionYear,
    warranty: data.warranty,
  };
}

/**
 * Removes a device by its ID.
 */
export async function removeDevice(deviceId: string): Promise<void> {
  const { sqliteDb } = getDatabase();
  await sqliteDb.runAsync('DELETE FROM devices WHERE id = ?', [deviceId]);
}

/**
 * Gets all devices for a given report.
 */
export async function getByReportId(reportId: string): Promise<Device[]> {
  const { sqliteDb } = getDatabase();

  const rows = await sqliteDb.getAllAsync<{
    id: string;
    report_id: string;
    model: string | null;
    serial_number: string | null;
    production_year: string | null;
    warranty: string | null;
  }>(
    'SELECT id, report_id, model, serial_number, production_year, warranty FROM devices WHERE report_id = ? ORDER BY rowid ASC',
    [reportId]
  );

  return rows.map((row) => ({
    id: row.id,
    reportId: row.report_id,
    model: row.model ?? undefined,
    serialNumber: row.serial_number ?? undefined,
    productionYear: row.production_year ?? undefined,
    warranty: (row.warranty as WarrantyStatus) ?? undefined,
  }));
}

/**
 * Updates a device's data.
 */
export async function updateDevice(deviceId: string, data: Partial<DeviceInput>): Promise<void> {
  const { sqliteDb } = getDatabase();

  const setClauses: string[] = [];
  const values: (string | null)[] = [];

  if (data.model !== undefined) {
    setClauses.push('model = ?');
    values.push(data.model ?? null);
  }
  if (data.serialNumber !== undefined) {
    setClauses.push('serial_number = ?');
    values.push(data.serialNumber ?? null);
  }
  if (data.productionYear !== undefined) {
    setClauses.push('production_year = ?');
    values.push(data.productionYear ?? null);
  }
  if (data.warranty !== undefined) {
    setClauses.push('warranty = ?');
    values.push(data.warranty ?? null);
  }

  if (setClauses.length === 0) return;

  values.push(deviceId);
  await sqliteDb.runAsync(
    `UPDATE devices SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Singleton repository instance.
 */
export const deviceRepository = {
  addDevice,
  removeDevice,
  getByReportId,
  updateDevice,
};
