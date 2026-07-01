/**
 * Store per le impostazioni dell'app.
 *
 * Gestisce la posizione di partenza fissa (sede/officina),
 * la chiave API OpenRouteService, nome operatore, e altre preferenze.
 * I dati vengono persisti tramite SQLite (cross-platform: nativo + web).
 */

import { create } from 'zustand';
import { getDatabase } from '../data/database';
import type { Coordinates, GeolocationConfig } from '../domain/geolocation';

// --- Tipi ---

export interface SettingsState {
  /** Coordinate della sede/officina (posizione di partenza fissa) */
  homeCoordinates: Coordinates | null;
  /** Indirizzo testuale della sede (per visualizzazione) */
  homeAddress: string;
  /** Nome operatore (precompila "eseguito da") */
  operatorName: string;
  /** Chiave API OpenRouteService */
  openRouteServiceApiKey: string;
  /** Fattore correttivo per stima offline (default 1.3) */
  roadFactor: number;
  /** Velocità media km/h (default 50) */
  averageSpeedKmh: number;
  /** Stato caricamento */
  isLoaded: boolean;
}

export interface SettingsActions {
  /** Carica impostazioni dal database */
  loadSettings: () => Promise<void>;
  /** Salva la posizione di partenza */
  setHomeLocation: (coords: Coordinates, address: string) => Promise<void>;
  /** Salva il nome operatore */
  setOperatorName: (name: string) => Promise<void>;
  /** Salva la chiave API */
  setApiKey: (key: string) => Promise<void>;
  /** Salva il fattore correttivo */
  setRoadFactor: (factor: number) => Promise<void>;
  /** Salva la velocità media */
  setAverageSpeed: (speed: number) => Promise<void>;
  /** Restituisce la configurazione corrente per il modulo geolocation */
  getGeolocationConfig: () => GeolocationConfig;
}

export type SettingsStore = SettingsState & SettingsActions;

// --- Database helpers ---

async function ensureSettingsTable(): Promise<void> {
  const { sqliteDb } = getDatabase();
  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

async function getSetting(key: string): Promise<string | null> {
  const { sqliteDb } = getDatabase();
  const row = await sqliteDb.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const { sqliteDb } = getDatabase();
  await sqliteDb.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// --- Store ---

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // --- Stato iniziale ---
  homeCoordinates: null,
  homeAddress: '',
  operatorName: '',
  openRouteServiceApiKey: '',
  roadFactor: 1.3,
  averageSpeedKmh: 50,
  isLoaded: false,

  // --- Azioni ---

  loadSettings: async () => {
    try {
      await ensureSettingsTable();

      const [coordsJson, address, operatorName, apiKey, roadFactor, avgSpeed] =
        await Promise.all([
          getSetting('home_coordinates'),
          getSetting('home_address'),
          getSetting('operator_name'),
          getSetting('ors_api_key'),
          getSetting('road_factor'),
          getSetting('average_speed'),
        ]);

      set({
        homeCoordinates: coordsJson ? JSON.parse(coordsJson) : null,
        homeAddress: address ?? '',
        operatorName: operatorName ?? '',
        openRouteServiceApiKey: apiKey ?? '',
        roadFactor: roadFactor ? parseFloat(roadFactor) : 1.3,
        averageSpeedKmh: avgSpeed ? parseFloat(avgSpeed) : 50,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setHomeLocation: async (coords: Coordinates, address: string) => {
    await ensureSettingsTable();
    await setSetting('home_coordinates', JSON.stringify(coords));
    await setSetting('home_address', address);
    set({ homeCoordinates: coords, homeAddress: address });
  },

  setOperatorName: async (name: string) => {
    await ensureSettingsTable();
    await setSetting('operator_name', name);
    set({ operatorName: name });
  },

  setApiKey: async (key: string) => {
    await ensureSettingsTable();
    await setSetting('ors_api_key', key);
    set({ openRouteServiceApiKey: key });
  },

  setRoadFactor: async (factor: number) => {
    await ensureSettingsTable();
    await setSetting('road_factor', String(factor));
    set({ roadFactor: factor });
  },

  setAverageSpeed: async (speed: number) => {
    await ensureSettingsTable();
    await setSetting('average_speed', String(speed));
    set({ averageSpeedKmh: speed });
  },

  getGeolocationConfig: (): GeolocationConfig => {
    const { openRouteServiceApiKey, roadFactor, averageSpeedKmh } = get();
    return {
      openRouteServiceApiKey: openRouteServiceApiKey || undefined,
      roadFactor,
      averageSpeedKmh,
    };
  },
}));
