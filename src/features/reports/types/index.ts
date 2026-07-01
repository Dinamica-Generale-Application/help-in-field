/**
 * Report feature types.
 */

/** Status of a report */
export type ReportStatus = 'draft' | 'completed';

/** Reason for the intervention */
export type InterventionReason = 'installation' | 'supervision' | 'malfunction' | 'other';

/** Warranty status */
export type WarrantyStatus = 'in_warranty' | 'out_warranty';

/** Payment status */
export type PaymentStatus = 'paid' | 'unpaid';

/**
 * Device entity — represents a single device associated with a report.
 */
export interface Device {
  id: string;
  model?: string;
  serialNumber?: string;
  productionYear?: string;
  warranty?: WarrantyStatus;
}

/**
 * Attachment entity — photo attached to a report, stored as base64 data URL.
 */
export interface Attachment {
  id: string;
  dataUrl: string;
  description?: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Full report entity as stored in localStorage.
 */
export interface Report {
  id: string;
  status: ReportStatus;

  // Dati cliente
  companyName: string;
  address?: string;
  phone?: string;

  // Dettagli intervento
  interventionDate: string; // ISO 8601 (YYYY-MM-DD)
  operator: string;
  interventionLocation?: string;
  interventionLat?: number;
  interventionLon?: number;
  requestedBy?: string;
  onBehalfOf?: string;
  interventionReason?: InterventionReason;
  description: string;

  // Dispositivi
  devices: Device[];

  // Costi input
  hoursWorked: number;
  kilometers?: number;
  discountPercent: number;
  payment?: PaymentStatus;

  // Note
  notes?: string;

  // Allegati
  attachments: Attachment[];

  // Costi calcolati (denormalizzati per il PDF)
  hourlyTotal?: number;
  kilometerTotal?: number;
  subtotal?: number;
  discountAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  grandTotal?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data used to create or update a report.
 * Same as Report but without auto-generated fields.
 */
export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;
