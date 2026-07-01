// Data Layer - Database and repository modules
export * from './schema';
export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  type DatabaseInitResult,
} from './database';
export {
  attachmentRepository,
  AttachmentError,
  type AttachmentInput,
} from './attachment-repository';
export {
  reportRepository,
  create as createReport,
  update as updateReport,
  deleteReport,
  getById as getReportById,
  getAll as getAllReports,
  search as searchReports,
  saveDraft,
  getStorageInfo,
} from './report-repository';
export {
  deviceRepository,
  addDevice,
  removeDevice,
  getByReportId as getDevicesByReportId,
  updateDevice,
  type DeviceInput,
} from './device-repository';
export {
  clientRepository,
  type Client,
} from './client-repository';
