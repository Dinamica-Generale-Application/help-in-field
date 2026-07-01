/**
 * Gestione errori globale per l'applicazione.
 *
 * Fornisce:
 * - Messaggi user-friendly in italiano per ogni AppErrorCode
 * - Normalizzazione errori in AppError strutturati
 * - Wrapper generico retry con backoff esponenziale
 *
 * Validates: Requirements 1.4, 5.3, 7.3, 8.5, 11.4
 */

import { AppErrorCode, type AppError } from '../types/errors';

// --- Messaggi utente in italiano per ogni codice errore ---

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.STORAGE_FULL]:
    'Spazio di archiviazione insufficiente. Eliminare alcuni rapporti per liberare spazio.',
  [AppErrorCode.STORAGE_WRITE_ERROR]:
    'Errore durante il salvataggio dei dati. Riprovare tra qualche istante.',
  [AppErrorCode.VALIDATION_FAILED]:
    'Alcuni campi obbligatori non sono compilati correttamente. Verificare i dati inseriti.',
  [AppErrorCode.PDF_GENERATION_FAILED]:
    'Impossibile generare il file PDF. Riprovare o verificare lo spazio disponibile.',
  [AppErrorCode.OCR_TIMEOUT]:
    'Riconoscimento del numero di serie non riuscito entro il tempo limite. Inserire il valore manualmente.',
  [AppErrorCode.OCR_NO_MATCH]:
    'Nessun numero di serie riconosciuto nell\'immagine. Inserire il valore manualmente.',
  [AppErrorCode.ATTACHMENT_TOO_LARGE]:
    'Il file selezionato supera la dimensione massima consentita.',
  [AppErrorCode.ATTACHMENT_LIMIT_REACHED]:
    'Raggiunto il numero massimo di allegati per questo rapporto (20).',
  [AppErrorCode.DELETE_FAILED]:
    'Impossibile eliminare il rapporto. Riprovare tra qualche istante.',
};

// --- Flag di recuperabilità per ogni codice errore ---

const RECOVERABLE_ERRORS: Record<AppErrorCode, boolean> = {
  [AppErrorCode.STORAGE_FULL]: false,
  [AppErrorCode.STORAGE_WRITE_ERROR]: true,
  [AppErrorCode.VALIDATION_FAILED]: true,
  [AppErrorCode.PDF_GENERATION_FAILED]: true,
  [AppErrorCode.OCR_TIMEOUT]: true,
  [AppErrorCode.OCR_NO_MATCH]: false,
  [AppErrorCode.ATTACHMENT_TOO_LARGE]: false,
  [AppErrorCode.ATTACHMENT_LIMIT_REACHED]: false,
  [AppErrorCode.DELETE_FAILED]: true,
};

/**
 * Restituisce il messaggio user-friendly in italiano per un dato codice errore.
 */
export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code];
}

/**
 * Normalizza un errore sconosciuto in un AppError strutturato.
 *
 * Tenta di rilevare il tipo di errore dal messaggio o dalla struttura
 * e assegna il codice appropriato. Se non riconosciuto, usa STORAGE_WRITE_ERROR
 * come fallback generico recuperabile.
 */
export function handleError(error: unknown): AppError {
  // Se è già un AppError strutturato, restituisci direttamente
  if (isAppError(error)) {
    return error;
  }

  // Estrai messaggio tecnico
  const technicalDetail = extractTechnicalDetail(error);

  // Tenta di determinare il codice errore dal messaggio
  const code = inferErrorCode(technicalDetail);

  return {
    code,
    message: ERROR_MESSAGES[code],
    technicalDetail,
    recoverable: RECOVERABLE_ERRORS[code],
  };
}

/**
 * Wrapper generico per retry con backoff esponenziale.
 *
 * Ritenta l'operazione fino a `maxRetries` volte (default 3).
 * Il ritardo tra i tentativi cresce esponenzialmente: 100ms, 200ms, 400ms, ...
 *
 * @param operation - Funzione asincrona da eseguire
 * @param maxRetries - Numero massimo di tentativi (default 3)
 * @returns Il risultato dell'operazione se ha successo
 * @throws L'ultimo errore se tutti i tentativi falliscono
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Backoff esponenziale: 100ms, 200ms, 400ms, ...
        const delay = 100 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// --- Funzioni interne ---

/**
 * Verifica se un oggetto è già un AppError.
 */
function isAppError(error: unknown): error is AppError {
  if (error == null || typeof error !== 'object') return false;
  const obj = error as Record<string, unknown>;
  return (
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.recoverable === 'boolean' &&
    Object.values(AppErrorCode).includes(obj.code as AppErrorCode)
  );
}

/**
 * Estrae un dettaglio tecnico leggibile da un errore sconosciuto.
 */
function extractTechnicalDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Deduce il codice errore dal messaggio tecnico.
 */
function inferErrorCode(detail: string): AppErrorCode {
  const lowerDetail = detail.toLowerCase();

  // Allegati — controlla prima delle regole più generiche (es. "limite")
  if (lowerDetail.includes('dimensione') || lowerDetail.includes('too large') || lowerDetail.includes('file size')) {
    return AppErrorCode.ATTACHMENT_TOO_LARGE;
  }
  if (lowerDetail.includes('allegati') || lowerDetail.includes('attachment limit') || lowerDetail.includes('numero massimo')) {
    return AppErrorCode.ATTACHMENT_LIMIT_REACHED;
  }

  // Storage pieno
  if (lowerDetail.includes('spazio') || lowerDetail.includes('disk full') || lowerDetail.includes('no space')) {
    return AppErrorCode.STORAGE_FULL;
  }
  if (lowerDetail.includes('500 rapporti') || lowerDetail.includes('limite massimo')) {
    return AppErrorCode.STORAGE_FULL;
  }

  // PDF
  if (lowerDetail.includes('pdf') || lowerDetail.includes('generation')) {
    return AppErrorCode.PDF_GENERATION_FAILED;
  }

  // OCR
  if (lowerDetail.includes('timeout') || lowerDetail.includes('ocr')) {
    return AppErrorCode.OCR_TIMEOUT;
  }

  // Eliminazione
  if (lowerDetail.includes('elimina') || lowerDetail.includes('delete')) {
    return AppErrorCode.DELETE_FAILED;
  }

  // Validazione
  if (lowerDetail.includes('valid')) {
    return AppErrorCode.VALIDATION_FAILED;
  }

  // Default: errore generico di scrittura (recuperabile)
  return AppErrorCode.STORAGE_WRITE_ERROR;
}
