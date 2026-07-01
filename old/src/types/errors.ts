/**
 * Application error codes and types for structured error handling.
 */

/** Internal error codes for categorizing application failures */
export enum AppErrorCode {
  STORAGE_FULL = 'STORAGE_FULL',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  OCR_TIMEOUT = 'OCR_TIMEOUT',
  OCR_NO_MATCH = 'OCR_NO_MATCH',
  ATTACHMENT_TOO_LARGE = 'ATTACHMENT_TOO_LARGE',
  ATTACHMENT_LIMIT_REACHED = 'ATTACHMENT_LIMIT_REACHED',
  DELETE_FAILED = 'DELETE_FAILED',
}

/** Structured application error with user-friendly messaging and recovery options */
export interface AppError {
  /** Error category code */
  code: AppErrorCode;
  /** User-friendly message in Italian */
  message: string;
  /** Technical detail for debugging purposes */
  technicalDetail?: string;
  /** Whether the error can be recovered from (e.g. via retry) */
  recoverable: boolean;
  /** Optional retry action if the error is recoverable */
  retryAction?: () => Promise<void>;
}
