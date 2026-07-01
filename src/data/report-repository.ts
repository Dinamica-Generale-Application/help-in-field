/**
 * ReportRepository - Data access layer for field service reports.
 *
 * Provides CRUD operations, search, draft saving, and storage info.
 * Integrates CostCalculationEngine to compute cost fields on create/update.
 * Implements retry logic (up to 3 attempts) on write errors.
 * Limits storage to a maximum of 500 reports.
 */

import { generateId } from '../utils/generate-id';
import { eq, desc, sql, like, and, gte, lte } from 'drizzle-orm';
import { getDatabase } from './database';
import { reports } from './schema';
import { calculate } from '../domain/cost-calculation';
import type { Report, ReportFormData, SearchQuery } from '../types/report';

// --- Constants ---
const MAX_REPORTS = 500;
const MAX_RETRIES = 3;

// --- Helpers ---

/**
 * Converts a database row to a Report domain object.
 */
function rowToReport(row: typeof reports.$inferSelect): Report {
  return {
    id: row.id,
    status: row.status as Report['status'],
    companyName: row.companyName,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    vatNumber: row.vatNumber ?? undefined,
    interventionDate: row.interventionDate,
    performedBy: row.performedBy,
    interventionLocation: row.interventionLocation ?? undefined,
    interventionLat: row.interventionLat ?? undefined,
    interventionLon: row.interventionLon ?? undefined,
    requestedBy: row.requestedBy ?? undefined,
    onBehalfOf: row.onBehalfOf ?? undefined,
    interventionReason: row.interventionReason as Report['interventionReason'],
    description: row.description,
    model: row.model ?? undefined,
    serialNumber: row.serialNumber ?? undefined,
    productionYear: row.productionYear ?? undefined,
    warranty: row.warranty as Report['warranty'],
    payment: row.payment as Report['payment'],
    hoursWorked: row.hoursWorked ?? undefined,
    kilometers: row.kilometers ?? undefined,
    discountPercent: row.discountPercent ?? 0,
    hourlyTotal: row.hourlyTotal ?? undefined,
    kilometerTotal: row.kilometerTotal ?? undefined,
    subtotal: row.subtotal ?? undefined,
    discountAmount: row.discountAmount ?? undefined,
    discountedSubtotal: row.discountedSubtotal ?? undefined,
    vatAmount: row.vatAmount ?? undefined,
    grandTotal: row.grandTotal ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Computes cost breakdown from form data and returns the cost fields.
 */
function computeCostFields(formData: ReportFormData | Partial<ReportFormData>) {
  const hours = formData.hoursWorked;
  const kilometers = formData.kilometers;
  const discountPercent = formData.discountPercent;

  if (hours != null && hours > 0) {
    const costBreakdown = calculate({
      hours,
      kilometers: kilometers ?? 0,
      discountPercent: discountPercent ?? 0,
    });
    return {
      hourlyTotal: costBreakdown.hourlyTotal,
      kilometerTotal: costBreakdown.kilometerTotal,
      subtotal: costBreakdown.subtotal,
      discountAmount: costBreakdown.discountAmount,
      discountedSubtotal: costBreakdown.discountedSubtotal,
      vatAmount: costBreakdown.vatAmount,
      grandTotal: costBreakdown.grandTotal,
    };
  }
  return {
    hourlyTotal: null,
    kilometerTotal: null,
    subtotal: null,
    discountAmount: null,
    discountedSubtotal: null,
    vatAmount: null,
    grandTotal: null,
  };
}

/**
 * Executes an async operation with retry logic (up to MAX_RETRIES attempts).
 * Only retries on errors (write failures).
 */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        // Small delay before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }
  }
  throw lastError;
}

// --- Repository Implementation ---

/**
 * Creates a new report from form data.
 * Computes cost fields via CostCalculationEngine.
 * Throws if storage limit (500 reports) is reached.
 */
export async function create(formData: ReportFormData): Promise<Report> {
  const { db } = getDatabase();

  // Check storage limit
  const storageInfo = await getStorageInfo();
  if (storageInfo.usedReports >= MAX_REPORTS) {
    throw new Error(
      `Limite massimo di ${MAX_REPORTS} rapporti raggiunto. Eliminare rapporti esistenti per crearne di nuovi.`
    );
  }

  const id = generateId();
  const now = new Date().toISOString();
  const costFields = computeCostFields(formData);

  const insertValues = {
    id,
    status: formData.status,
    companyName: formData.companyName,
    address: formData.address ?? null,
    phone: formData.phone ?? null,
    vatNumber: formData.vatNumber ?? null,
    interventionDate: formData.interventionDate,
    performedBy: formData.performedBy,
    interventionLocation: formData.interventionLocation ?? null,
    interventionLat: formData.interventionLat ?? null,
    interventionLon: formData.interventionLon ?? null,
    requestedBy: formData.requestedBy ?? null,
    onBehalfOf: formData.onBehalfOf ?? null,
    interventionReason: formData.interventionReason ?? null,
    description: formData.description,
    model: formData.model ?? null,
    serialNumber: formData.serialNumber ?? null,
    productionYear: formData.productionYear ?? null,
    warranty: formData.warranty ?? null,
    payment: formData.payment ?? null,
    hoursWorked: formData.hoursWorked ?? null,
    kilometers: formData.kilometers ?? null,
    discountPercent: formData.discountPercent ?? 0,
    ...costFields,
    notes: formData.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await withRetry(async () => {
    await db.insert(reports).values(insertValues);
  });

  return (await getById(id))!;
}

/**
 * Updates an existing report with partial data.
 * Recomputes cost fields if hours, kilometers, or discount are updated.
 */
export async function update(
  id: string,
  formData: Partial<ReportFormData>
): Promise<Report> {
  const { db } = getDatabase();

  // Fetch existing report to merge data for cost calculation
  const existing = await getById(id);
  if (!existing) {
    throw new Error(`Rapporto con ID "${id}" non trovato.`);
  }

  // Merge existing data with updates for cost calculation
  const mergedForCost: Partial<ReportFormData> = {
    hoursWorked: formData.hoursWorked ?? existing.hoursWorked,
    kilometers: formData.kilometers ?? existing.kilometers,
    discountPercent: formData.discountPercent ?? existing.discountPercent,
  };

  const costFields = computeCostFields(mergedForCost);
  const now = new Date().toISOString();

  const updateValues: Record<string, unknown> = {
    updatedAt: now,
    ...costFields,
  };

  // Map form data fields to DB columns
  if (formData.status !== undefined) updateValues.status = formData.status;
  if (formData.companyName !== undefined) updateValues.companyName = formData.companyName;
  if (formData.address !== undefined) updateValues.address = formData.address ?? null;
  if (formData.phone !== undefined) updateValues.phone = formData.phone ?? null;
  if (formData.vatNumber !== undefined) updateValues.vatNumber = formData.vatNumber ?? null;
  if (formData.interventionDate !== undefined) updateValues.interventionDate = formData.interventionDate;
  if (formData.performedBy !== undefined) updateValues.performedBy = formData.performedBy;
  if (formData.interventionLocation !== undefined) updateValues.interventionLocation = formData.interventionLocation ?? null;
  if (formData.interventionLat !== undefined) updateValues.interventionLat = formData.interventionLat ?? null;
  if (formData.interventionLon !== undefined) updateValues.interventionLon = formData.interventionLon ?? null;
  if (formData.requestedBy !== undefined) updateValues.requestedBy = formData.requestedBy ?? null;
  if (formData.onBehalfOf !== undefined) updateValues.onBehalfOf = formData.onBehalfOf ?? null;
  if (formData.interventionReason !== undefined) updateValues.interventionReason = formData.interventionReason ?? null;
  if (formData.description !== undefined) updateValues.description = formData.description;
  if (formData.model !== undefined) updateValues.model = formData.model ?? null;
  if (formData.serialNumber !== undefined) updateValues.serialNumber = formData.serialNumber ?? null;
  if (formData.productionYear !== undefined) updateValues.productionYear = formData.productionYear ?? null;
  if (formData.warranty !== undefined) updateValues.warranty = formData.warranty ?? null;
  if (formData.payment !== undefined) updateValues.payment = formData.payment ?? null;
  if (formData.hoursWorked !== undefined) updateValues.hoursWorked = formData.hoursWorked ?? null;
  if (formData.kilometers !== undefined) updateValues.kilometers = formData.kilometers ?? null;
  if (formData.discountPercent !== undefined) updateValues.discountPercent = formData.discountPercent ?? 0;
  if (formData.notes !== undefined) updateValues.notes = formData.notes ?? null;

  await withRetry(async () => {
    await db.update(reports).set(updateValues).where(eq(reports.id, id));
  });

  return (await getById(id))!;
}

/**
 * Deletes a report by ID.
 * Attachments are removed via ON DELETE CASCADE in the database schema.
 */
export async function deleteReport(id: string): Promise<void> {
  const { db } = getDatabase();

  await withRetry(async () => {
    await db.delete(reports).where(eq(reports.id, id));
  });
}

/**
 * Retrieves a report by its ID.
 * Returns null if not found.
 */
export async function getById(id: string): Promise<Report | null> {
  const { db } = getDatabase();

  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);

  if (rows.length === 0) {
    return null;
  }

  return rowToReport(rows[0]);
}

/**
 * Retrieves all reports ordered by intervention_date DESC.
 */
export async function getAll(): Promise<Report[]> {
  const { db } = getDatabase();

  const rows = await db
    .select()
    .from(reports)
    .orderBy(desc(reports.interventionDate));

  return rows.map(rowToReport);
}

/**
 * Searches reports by query criteria.
 * - text: matches against companyName, serialNumber, or interventionDate (case-insensitive LIKE)
 * - dateFrom/dateTo: filters by intervention date range
 * - status: filters by report status
 */
export async function search(query: SearchQuery): Promise<Report[]> {
  const { db } = getDatabase();

  const conditions = [];

  if (query.text) {
    const searchPattern = `%${query.text}%`;
    conditions.push(
      sql`(${reports.companyName} LIKE ${searchPattern} OR ${reports.serialNumber} LIKE ${searchPattern} OR ${reports.interventionDate} LIKE ${searchPattern})`
    );
  }

  if (query.dateFrom) {
    conditions.push(gte(reports.interventionDate, query.dateFrom));
  }

  if (query.dateTo) {
    conditions.push(lte(reports.interventionDate, query.dateTo));
  }

  if (query.status) {
    conditions.push(eq(reports.status, query.status));
  }

  let queryBuilder = db.select().from(reports);

  if (conditions.length > 0) {
    queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder;
  }

  const rows = await queryBuilder.orderBy(desc(reports.interventionDate));

  return rows.map(rowToReport);
}

/**
 * Saves a report as a draft.
 * If the report has no ID, creates a new one with status 'draft'.
 * Sets status to 'draft' regardless of the provided status.
 */
export async function saveDraft(formData: ReportFormData): Promise<Report> {
  const draftData: ReportFormData = {
    ...formData,
    status: 'draft',
  };
  return create(draftData);
}

/**
 * Returns storage info: number of reports used and maximum allowed.
 */
export async function getStorageInfo(): Promise<{
  usedReports: number;
  maxReports: number;
}> {
  const { db } = getDatabase();

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reports);

  return {
    usedReports: result[0]?.count ?? 0,
    maxReports: MAX_REPORTS,
  };
}

// --- Exported Repository Object ---

/**
 * Singleton repository instance conforming to the ReportRepository interface.
 */
export const reportRepository = {
  create,
  update,
  delete: deleteReport,
  getById,
  getAll,
  search,
  saveDraft,
  getStorageInfo,
};
