/**
 * Report store — CRUD operations with localStorage persistence via Zustand.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Report } from '../types';
import { STORAGE_KEYS } from '@/types';
import { MAX_REPORTS } from '@/config/constants';
import { storageWithQuotaHandling } from '@/utils/storage-persist';

export interface ReportState {
  reports: Report[];
}

export interface ReportActions {
  addReport: (report: Report) => boolean;
  updateReport: (id: string, partial: Partial<Report>) => void;
  deleteReport: (id: string) => void;
  getReportById: (id: string) => Report | undefined;
  searchReports: (query: string) => Report[];
}

export type ReportStore = ReportState & ReportActions;

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (report: Report): boolean => {
        const { reports } = get();
        if (reports.length >= MAX_REPORTS) {
          return false;
        }
        // Skip duplicates by ID
        if (reports.some((r) => r.id === report.id)) {
          return false;
        }
        set({ reports: [...reports, report] });
        return true;
      },

      updateReport: (id: string, partial: Partial<Report>): void => {
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...partial, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },

      deleteReport: (id: string): void => {
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        }));
      },

      getReportById: (id: string): Report | undefined => {
        return get().reports.find((r) => r.id === id);
      },

      searchReports: (query: string): Report[] => {
        const { reports } = get();
        if (!query.trim()) return reports;
        const lower = query.toLowerCase();
        return reports.filter(
          (r) =>
            r.companyName.toLowerCase().includes(lower) ||
            r.interventionDate.includes(lower) ||
            r.devices.some((d) => d.serialNumber?.toLowerCase().includes(lower))
        );
      },
    }),
    {
      name: STORAGE_KEYS.REPORTS,
      storage: createJSONStorage(() => storageWithQuotaHandling),
      partialize: (state) => ({ reports: state.reports }),
    }
  )
);
