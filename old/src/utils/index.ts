// Utility modules
export { getErrorMessage, handleError, withRetry } from './error-handler';
export { setupAutoSave, getLastAutoSave, getLastAutoSaveReportId, clearAutoSave } from './auto-save';
export { checkStorageAvailable } from './storage-check';
export { exportBackup, importBackup } from './backup';
export { requestSpeechPermission, startListening, stopListening, isSpeechAvailable } from './speech-to-text';
export type { SpeechCallbacks } from './speech-to-text';
