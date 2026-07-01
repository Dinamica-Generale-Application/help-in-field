/**
 * TypeScript models for field service reports.
 * Maps to the SQLite database schema defined in src/data/schema.ts.
 */

/** Status of a report */
export type ReportStatus = 'draft' | 'completed';

/** Reason for the intervention */
export type InterventionReason = 'installation' | 'supervision' | 'malfunction' | 'other';

/** Warranty status */
export type WarrantyStatus = 'in_warranty' | 'out_warranty';

/** Payment status */
export type PaymentStatus = 'paid' | 'unpaid';

/** Attachment type */
export type AttachmentType = 'image' | 'video';

/**
 * Device entity — represents a single device associated with a report.
 */
export interface Device {
  id: string;
  reportId: string;
  model?: string;
  serialNumber?: string;
  productionYear?: string;
  warranty?: WarrantyStatus;
}

/**
 * Full report entity as stored in the database.
 */
export interface Report {
  id: string;
  status: ReportStatus;

  // Dati cliente
  companyName: string;
  address?: string;
  phone?: string;
  vatNumber?: string;

  // Dettagli intervento
  interventionDate: string; // ISO 8601 format
  performedBy: string;
  interventionLocation?: string;
  interventionLat?: number;
  interventionLon?: number;
  requestedBy?: string;
  onBehalfOf?: string;
  interventionReason?: InterventionReason;
  description: string;
  /** @deprecated Use devices table instead */
  model?: string;
  /** @deprecated Use devices table instead */
  serialNumber?: string;
  /** @deprecated Use devices table instead */
  productionYear?: string;
  /** @deprecated Use devices table instead */
  warranty?: WarrantyStatus;
  payment?: PaymentStatus;

  // Costi
  hoursWorked?: number;
  kilometers?: number;
  discountPercent: number;
  hourlyTotal?: number;
  kilometerTotal?: number;
  subtotal?: number;
  discountAmount?: number;
  discountedSubtotal?: number;
  vatAmount?: number;
  grandTotal?: number;

  // Note
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Attachment entity as stored in the database.
 */
export interface Attachment {
  id: string;
  reportId: string;
  type: AttachmentType;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  createdAt: string;
}

/**
 * Form data used to create or update a report.
 * Excludes auto-generated fields (id, timestamps) and computed cost fields.
 */
export type ReportFormData = Omit<
  Report,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'hourlyTotal'
  | 'kilometerTotal'
  | 'subtotal'
  | 'discountAmount'
  | 'discountedSubtotal'
  | 'vatAmount'
  | 'grandTotal'
>;

/**
 * Search query parameters for filtering reports.
 */
export interface SearchQuery {
  /** Free text search on company name, serial number, or intervention date */
  text?: string;
  /** Filter by start date (ISO 8601) */
  dateFrom?: string;
  /** Filter by end date (ISO 8601) */
  dateTo?: string;
  /** Filter by report status */
  status?: ReportStatus;
}
