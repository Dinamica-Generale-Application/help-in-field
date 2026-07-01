// Domain Layer - Business logic modules
// Contains: CostCalculationEngine, ValidationModule, OcrModule, PdfExportModule
export {
  calculate,
  costCalculationEngine,
  HOURLY_RATE,
  KM_RATE,
  VAT_RATE,
} from './cost-calculation';
export type { CostInput, CostBreakdown, CostCalculationEngine } from './cost-calculation';

export {
  validateReport,
  validateField,
  validateVatNumber,
  validateHours,
  validateKilometers,
  validateDiscount,
} from './validation';
export type { ValidationError, ValidationResult } from './validation';

export { recognizeSerialNumber, ocrModule } from './ocr';
export type { OcrResult, OcrModule } from './ocr';

export {
  generatePdf,
  sharePdf,
  generateHtmlTemplate,
  pdfExportModule,
} from './pdf-export';
export type { PdfExportResult, PdfExportModule } from './pdf-export';

export {
  haversineDistance,
  estimateOffline,
  estimateWithRouting,
  estimateTravel,
  roundToQuarterHour,
} from './geolocation';
export type { Coordinates, TravelEstimate, GeolocationConfig } from './geolocation';

export {
  createOcrEngine,
  getOcrEngine,
  setOcrEngine,
  configureOcrEngine,
} from './ocr-engine';
export type { OcrEngine, OcrEngineConfig, OcrTextBlock, OcrRawResult } from './ocr-engine';
