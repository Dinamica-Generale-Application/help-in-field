/**
 * Verifica disponibilità storage prima del salvataggio.
 *
 * Controlla che non sia stato raggiunto il limite massimo di 500 rapporti.
 * Utilizzato come guardia prima di operazioni di scrittura per fornire
 * un messaggio utente appropriato anziché un errore generico.
 *
 * Validates: Requirements 1.4
 */

import { reportRepository } from '../data/report-repository';

// --- Costanti ---

/** Limite massimo di rapporti consentiti nello storage locale */
const MAX_REPORTS = 500;

/**
 * Verifica se è possibile salvare un nuovo rapporto.
 *
 * Controlla il numero di rapporti attualmente presenti nello storage
 * rispetto al limite massimo di 500.
 *
 * @returns true se il salvataggio è consentito (sotto il limite), false altrimenti
 */
export async function checkStorageAvailable(): Promise<boolean> {
  try {
    const storageInfo = await reportRepository.getStorageInfo();
    return storageInfo.usedReports < MAX_REPORTS;
  } catch {
    // In caso di errore nel controllo, assumiamo storage disponibile
    // per non bloccare l'utente. L'errore verrà catturato al momento
    // del salvataggio effettivo.
    return true;
  }
}
