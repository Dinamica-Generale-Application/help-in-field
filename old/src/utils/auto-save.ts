/**
 * Auto-save module per il salvataggio automatico delle bozze.
 *
 * Salva automaticamente lo stato del form quando l'app va in background
 * o viene terminata dal sistema operativo. Al prossimo avvio, permette
 * il recovery dei dati non salvati.
 *
 * Utilizza il filesystem locale (expo-file-system) per persistere i dati
 * del form indipendentemente dal database SQLite principale.
 *
 * Validates: Requirements 5.4
 */

import { AppState, type AppStateStatus } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { ReportFormData } from '../types/report';

// --- Costanti ---

const AUTO_SAVE_FILENAME = 'auto_save.json';

/**
 * Percorso completo del file di auto-save.
 */
function getAutoSaveFilePath(): string {
  return `${FileSystem.documentDirectory}${AUTO_SAVE_FILENAME}`;
}

// --- Interfaccia auto-save payload ---

interface AutoSavePayload {
  formData: ReportFormData;
  reportId: string | null;
  savedAt: string; // ISO 8601 timestamp
}

/**
 * Configura l'auto-save che si attiva su AppState change (background/inactive).
 *
 * Registra un listener che, quando l'app va in background o diventa inattiva,
 * salva lo stato corrente del form nel filesystem per un successivo recovery.
 *
 * @param getFormState - Funzione che restituisce lo stato corrente del form
 * @returns Funzione di cleanup per rimuovere il listener
 */
export function setupAutoSave(
  getFormState: () => { formData: ReportFormData | null; currentReportId: string | null }
): () => void {
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      const { formData, currentReportId } = getFormState();

      if (formData) {
        try {
          const payload: AutoSavePayload = {
            formData,
            reportId: currentReportId,
            savedAt: new Date().toISOString(),
          };
          await FileSystem.writeAsStringAsync(
            getAutoSaveFilePath(),
            JSON.stringify(payload)
          );
        } catch {
          // Best effort: se il salvataggio auto-save fallisce, non bloccare l'app
        }
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove();
  };
}

/**
 * Recupera l'ultimo auto-save dal filesystem.
 *
 * Utilizzato all'avvio dell'app per recuperare dati non salvati
 * dopo un crash o una terminazione inattesa.
 *
 * @returns I dati del form auto-salvati, oppure null se non presenti
 */
export async function getLastAutoSave(): Promise<ReportFormData | null> {
  try {
    const filePath = getAutoSaveFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) return null;

    const raw = await FileSystem.readAsStringAsync(filePath);
    const payload: AutoSavePayload = JSON.parse(raw);
    return payload.formData;
  } catch {
    // Se il parsing fallisce, il dato è corrotto: pulisci e restituisci null
    await clearAutoSave();
    return null;
  }
}

/**
 * Recupera l'ID del rapporto associato all'ultimo auto-save.
 *
 * @returns L'ID del rapporto se l'auto-save era relativo a un rapporto esistente, null altrimenti
 */
export async function getLastAutoSaveReportId(): Promise<string | null> {
  try {
    const filePath = getAutoSaveFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) return null;

    const raw = await FileSystem.readAsStringAsync(filePath);
    const payload: AutoSavePayload = JSON.parse(raw);
    return payload.reportId;
  } catch {
    return null;
  }
}

/**
 * Cancella i dati di auto-save dal filesystem.
 *
 * Da chiamare dopo che l'utente ha salvato con successo il rapporto
 * o ha deciso di scartare il recovery.
 */
export async function clearAutoSave(): Promise<void> {
  try {
    const filePath = getAutoSaveFilePath();
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }
  } catch {
    // Best effort cleanup
  }
}
