/**
 * Settings store — operator configuration with localStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Coordinates } from '@/types';
import { STORAGE_KEYS } from '@/types';
import { storageWithQuotaHandling } from '@/utils/storage-persist';

export interface SettingsState {
  operatorCode: string;
  homeCoordinates?: Coordinates;
  homeAddress: string;
  openRouteServiceApiKey: string;
  roadFactor: number;
  averageSpeedKmh: number;
}

export interface SettingsActions {
  updateSettings: (partial: Partial<SettingsState>) => void;
  resetSettings: () => void;
  clearAllData: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const DEFAULT_SETTINGS: SettingsState = {
  operatorCode: '',
  homeAddress: '',
  openRouteServiceApiKey: '',
  roadFactor: 1.3,
  averageSpeedKmh: 50,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (partial: Partial<SettingsState>): void => {
        set(partial);
      },

      resetSettings: (): void => {
        set(DEFAULT_SETTINGS);
      },

      clearAllData: (): void => {
        // Clear all app localStorage keys
        localStorage.removeItem(STORAGE_KEYS.REPORTS);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        localStorage.removeItem(STORAGE_KEYS.VERSION);
        // Clear IndexedDB attachments
        import('@/lib/attachmentDb').then(({ clearAllAttachments }) => {
          clearAllAttachments().catch(() => {});
        });
        // Reset settings state in memory
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => storageWithQuotaHandling),
      partialize: (state) => ({
        operatorCode: state.operatorCode,
        homeCoordinates: state.homeCoordinates,
        homeAddress: state.homeAddress,
        openRouteServiceApiKey: state.openRouteServiceApiKey,
        roadFactor: state.roadFactor,
        averageSpeedKmh: state.averageSpeedKmh,
      }),
    }
  )
);
