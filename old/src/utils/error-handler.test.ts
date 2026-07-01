/**
 * Test per il modulo error-handler.
 *
 * Verifica:
 * - getErrorMessage restituisce messaggi italiani per tutti i codici
 * - handleError normalizza correttamente errori di tipi diversi
 * - withRetry ritenta il numero corretto di volte
 */

import { describe, it, expect, vi } from 'vitest';
import { getErrorMessage, handleError, withRetry } from './error-handler';
import { AppErrorCode } from '../types/errors';

describe('getErrorMessage', () => {
  it('restituisce un messaggio per ogni AppErrorCode', () => {
    for (const code of Object.values(AppErrorCode)) {
      const message = getErrorMessage(code);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('restituisce il messaggio corretto per STORAGE_FULL', () => {
    const msg = getErrorMessage(AppErrorCode.STORAGE_FULL);
    expect(msg).toContain('Spazio di archiviazione insufficiente');
  });

  it('restituisce il messaggio corretto per VALIDATION_FAILED', () => {
    const msg = getErrorMessage(AppErrorCode.VALIDATION_FAILED);
    expect(msg).toContain('campi obbligatori');
  });

  it('restituisce il messaggio corretto per OCR_TIMEOUT', () => {
    const msg = getErrorMessage(AppErrorCode.OCR_TIMEOUT);
    expect(msg).toContain('numero di serie');
  });
});

describe('handleError', () => {
  it('normalizza un Error standard in AppError con STORAGE_WRITE_ERROR di default', () => {
    const result = handleError(new Error('something went wrong'));
    expect(result.code).toBe(AppErrorCode.STORAGE_WRITE_ERROR);
    expect(result.message).toBeDefined();
    expect(result.technicalDetail).toBe('something went wrong');
    expect(result.recoverable).toBe(true);
  });

  it('restituisce un AppError già strutturato senza modifiche', () => {
    const appError = {
      code: AppErrorCode.PDF_GENERATION_FAILED,
      message: 'test message',
      recoverable: true,
    };
    const result = handleError(appError);
    expect(result).toEqual(appError);
  });

  it('deduce STORAGE_FULL da messaggio contenente "spazio"', () => {
    const result = handleError(new Error('Spazio insufficiente sul disco'));
    expect(result.code).toBe(AppErrorCode.STORAGE_FULL);
    expect(result.recoverable).toBe(false);
  });

  it('deduce DELETE_FAILED da messaggio contenente "delete"', () => {
    const result = handleError(new Error('Failed to delete record'));
    expect(result.code).toBe(AppErrorCode.DELETE_FAILED);
    expect(result.recoverable).toBe(true);
  });

  it('normalizza una stringa in AppError', () => {
    const result = handleError('errore generico');
    expect(result.technicalDetail).toBe('errore generico');
    expect(result.code).toBe(AppErrorCode.STORAGE_WRITE_ERROR);
  });

  it('normalizza null/undefined in AppError', () => {
    const result = handleError(null);
    expect(result.code).toBe(AppErrorCode.STORAGE_WRITE_ERROR);
    expect(result.technicalDetail).toBe('null');
  });

  it('deduce PDF_GENERATION_FAILED da messaggio pdf', () => {
    const result = handleError(new Error('PDF generation error'));
    expect(result.code).toBe(AppErrorCode.PDF_GENERATION_FAILED);
    expect(result.recoverable).toBe(true);
  });

  it('deduce ATTACHMENT_TOO_LARGE da messaggio con "dimensione"', () => {
    const result = handleError(new Error('La dimensione supera il limite'));
    expect(result.code).toBe(AppErrorCode.ATTACHMENT_TOO_LARGE);
    expect(result.recoverable).toBe(false);
  });
});

describe('withRetry', () => {
  it('restituisce il risultato al primo tentativo se non ci sono errori', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await withRetry(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('ritenta fino a 3 volte di default e poi lancia', async () => {
    const error = new Error('write failed');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(withRetry(operation)).rejects.toThrow('write failed');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('ritenta il numero specificato di volte', async () => {
    const error = new Error('write failed');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(withRetry(operation, 5)).rejects.toThrow('write failed');
    expect(operation).toHaveBeenCalledTimes(5);
  });

  it('ha successo se un tentativo successivo riesce', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success on 3rd');

    const result = await withRetry(operation);
    expect(result).toBe('success on 3rd');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('rispetta il backoff esponenziale tra i tentativi', async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(operation);

    // Avanza i timer per il primo delay (100ms)
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
