/**
 * Drizzle ORM schema definition for the field service reports SQLite database.
 * Defines tables: reports, attachments, devices with all constraints and indices.
 */

import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Reports table — stores all field service report data.
 */
export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    status: text('status', { enum: ['draft', 'completed'] })
      .notNull()
      .default('draft'),

    // Dati cliente
    companyName: text('company_name').notNull(),
    address: text('address'),
    phone: text('phone'),
    vatNumber: text('vat_number'),

    // Dettagli intervento
    interventionDate: text('intervention_date').notNull(),
    performedBy: text('performed_by').notNull(),
    interventionLocation: text('intervention_location'),
    interventionLat: real('intervention_lat'),
    interventionLon: real('intervention_lon'),
    requestedBy: text('requested_by'),
    onBehalfOf: text('on_behalf_of'),
    interventionReason: text('intervention_reason', {
      enum: ['installation', 'supervision', 'malfunction', 'other'],
    }),
    description: text('description').notNull(),
    /** @deprecated Use devices table instead */
    model: text('model'),
    /** @deprecated Use devices table instead */
    serialNumber: text('serial_number'),
    /** @deprecated Use devices table instead */
    productionYear: text('production_year'),
    /** @deprecated Use devices table instead */
    warranty: text('warranty', { enum: ['in_warranty', 'out_warranty'] }),
    payment: text('payment', { enum: ['paid', 'unpaid'] }),

    // Costi
    hoursWorked: real('hours_worked'),
    kilometers: real('kilometers'),
    discountPercent: real('discount_percent').default(0),
    hourlyTotal: real('hourly_total'),
    kilometerTotal: real('kilometer_total'),
    subtotal: real('subtotal'),
    discountAmount: real('discount_amount'),
    discountedSubtotal: real('discounted_subtotal'),
    vatAmount: real('vat_amount'),
    grandTotal: real('grand_total'),

    // Note
    notes: text('notes'),

    // Metadata
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_reports_date').on(table.interventionDate),
    index('idx_reports_company').on(table.companyName),
    index('idx_reports_serial').on(table.serialNumber),
  ]
);

/**
 * Attachments table — stores metadata for multimedia attachments linked to reports.
 * File contents are stored on the filesystem; only the path is kept in the DB.
 */
export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['image', 'video'] }).notNull(),
    filePath: text('file_path').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    description: text('description'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_attachments_report').on(table.reportId),
  ]
);

/**
 * Devices table — stores devices associated with a report (multiple per report).
 */
export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    model: text('model'),
    serialNumber: text('serial_number'),
    productionYear: text('production_year'),
    warranty: text('warranty', { enum: ['in_warranty', 'out_warranty'] }),
  },
  (table) => [
    index('idx_devices_report').on(table.reportId),
  ]
);

/**
 * Clients table — stores client records for autocomplete and CSV import.
 */
export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    companyName: text('company_name').notNull(),
    address: text('address'),
    phone: text('phone'),
  },
  (table) => [
    index('idx_clients_name').on(table.companyName),
  ]
);
