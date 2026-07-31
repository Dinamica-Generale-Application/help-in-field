/**
 * Report feature types.
 */

/** Status of a report */
export type ReportStatus = 'draft' | 'completed' | 'validated' | 'mission';

/**
 * Client validation data — captured when client signs off on the report.
 */
export interface ClientValidation {
  /** Signature image as base64 data URL */
  signatureDataUrl: string;
  /** Client name or role (e.g., "Resp. Produzione") */
  signerRole: string;
  /** Optional notes from the client */
  clientNotes?: string;
  /** Timestamp when validated */
  validatedAt: string;
}

/** Reason for the intervention */
export type InterventionReason = 'installation' | 'supervision' | 'malfunction' | 'other';

/** Warranty status */
export type WarrantyStatus = 'in_warranty' | 'out_warranty';

/** Payment status */
export type PaymentStatus = 'paid' | 'unpaid';

/** Heat risk level */
export type HeatRiskLevel = 'none' | 'low' | 'moderate' | 'high';

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
 * Attachment entity — photo or video attached to a report.
 * The actual binary data is stored in IndexedDB (via attachmentDb).
 * Only metadata is kept in localStorage with the report.
 */
export interface Attachment {
  id: string;
  type: 'image' | 'video';
  /** Object URL for display (transient, regenerated from IndexedDB) */
  dataUrl?: string;
  description?: string;
  mimeType: string;
  size: number;
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
  heatRisk?: HeatRiskLevel;
  problemFound?: string;
  description: string;

  // Dispositivi
  devices: Device[];

  // Costi input
  hoursWorked: number;
  kilometers?: number;
  otherExpenses?: number;
  discountPercent: number;
  payment?: PaymentStatus;

  // Note
  notes?: string;

  // Allegati
  attachments: Attachment[];

  // Costi calcolati (denormalizzati per il PDF)
  hourlyTotal?: number;
  kilometerTotal?: number;
  grandTotal?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Client validation (optional)
  clientValidation?: ClientValidation;
}

/**
 * Form data used to create or update a report.
 * Same as Report but without auto-generated fields.
 */
export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;
