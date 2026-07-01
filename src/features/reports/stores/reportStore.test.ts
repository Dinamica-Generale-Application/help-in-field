/**
 * Unit tests for reportStore — CRUD, persistence, limit, and duplicates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useReportStore } from './reportStore';
import { STORAGE_KEYS } from '@/types';
import { MAX_REPORTS } from '@/config/constants';
import type { Report } from '../types';

function createMockReport(overrides: Partial<Report> = {}): Report {
  return {
    id: crypto.randomUUID(),
    status: 'draft',
    companyName: 'Test Company',
    address: 'Via Test 1',
    phone: '0123456789',
    interventionDate: '2024-01-15',
    operator: 'OP1',
    description: 'Test description',
    devices: [],
    hoursWorked: 2,
    kilometers: 50,
    discountPercent: 0,
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('reportStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store state
    localStorage.clear();
    useReportStore.setState({ reports: [] });
  });

  describe('addReport', () => {
    it('adds a report to the store', () => {
      const report = createMockReport();
      const result = useReportStore.getState().addReport(report);

      expect(result).toBe(true);
      expect(useReportStore.getState().reports).toHaveLength(1);
      expect(useReportStore.getState().reports[0]).toEqual(report);
    });

    it('rejects adding when at MAX_REPORTS limit', () => {
      // Fill store to capacity
      const reports: Report[] = Array.from({ length: MAX_REPORTS }, () => createMockReport());
      useReportStore.setState({ reports });

      const newReport = createMockReport();
      const result = useReportStore.getState().addReport(newReport);

      expect(result).toBe(false);
      expect(useReportStore.getState().reports).toHaveLength(MAX_REPORTS);
    });

    it('rejects duplicate reports by ID', () => {
      const report = createMockReport({ id: 'duplicate-id' });
      useReportStore.getState().addReport(report);

      const duplicate = createMockReport({ id: 'duplicate-id', companyName: 'Different' });
      const result = useReportStore.getState().addReport(duplicate);

      expect(result).toBe(false);
      expect(useReportStore.getState().reports).toHaveLength(1);
      expect(useReportStore.getState().reports[0]!.companyName).toBe('Test Company');
    });
  });

  describe('updateReport', () => {
    it('updates an existing report', () => {
      const report = createMockReport({
        id: 'update-test',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });
      useReportStore.getState().addReport(report);

      useReportStore.getState().updateReport('update-test', {
        companyName: 'Updated Company',
        status: 'completed',
      });

      const updated = useReportStore.getState().getReportById('update-test');
      expect(updated).toBeDefined();
      expect(updated!.companyName).toBe('Updated Company');
      expect(updated!.status).toBe('completed');
      expect(updated!.updatedAt).not.toBe('2023-01-01T00:00:00.000Z');
    });

    it('does nothing if report ID not found', () => {
      const report = createMockReport({ id: 'existing' });
      useReportStore.getState().addReport(report);

      useReportStore.getState().updateReport('nonexistent', {
        companyName: 'Nope',
      });

      const reports = useReportStore.getState().reports;
      expect(reports).toHaveLength(1);
      expect(reports[0]!.companyName).toBe('Test Company');
    });
  });

  describe('deleteReport', () => {
    it('removes a report by ID', () => {
      const report = createMockReport({ id: 'delete-me' });
      useReportStore.getState().addReport(report);
      expect(useReportStore.getState().reports).toHaveLength(1);

      useReportStore.getState().deleteReport('delete-me');
      expect(useReportStore.getState().reports).toHaveLength(0);
    });

    it('does nothing if ID not found', () => {
      const report = createMockReport();
      useReportStore.getState().addReport(report);

      useReportStore.getState().deleteReport('nonexistent');
      expect(useReportStore.getState().reports).toHaveLength(1);
    });
  });

  describe('getReportById', () => {
    it('returns the correct report', () => {
      const report = createMockReport({ id: 'find-me', companyName: 'Target' });
      useReportStore.getState().addReport(report);
      useReportStore.getState().addReport(createMockReport());

      const found = useReportStore.getState().getReportById('find-me');
      expect(found?.companyName).toBe('Target');
    });

    it('returns undefined if not found', () => {
      const found = useReportStore.getState().getReportById('ghost');
      expect(found).toBeUndefined();
    });
  });

  describe('searchReports', () => {
    beforeEach(() => {
      useReportStore.getState().addReport(
        createMockReport({ id: '1', companyName: 'Acme Corp', interventionDate: '2024-03-10' })
      );
      useReportStore.getState().addReport(
        createMockReport({
          id: '2',
          companyName: 'Beta Srl',
          interventionDate: '2024-04-20',
          devices: [{ id: 'd1', serialNumber: '1ZZ123AB' }],
        })
      );
      useReportStore.getState().addReport(
        createMockReport({ id: '3', companyName: 'Gamma SpA', interventionDate: '2024-05-01' })
      );
    });

    it('returns all reports when query is empty', () => {
      const results = useReportStore.getState().searchReports('');
      expect(results).toHaveLength(3);
    });

    it('filters by company name (case-insensitive)', () => {
      const results = useReportStore.getState().searchReports('acme');
      expect(results).toHaveLength(1);
      expect(results[0]!.companyName).toBe('Acme Corp');
    });

    it('filters by intervention date', () => {
      const results = useReportStore.getState().searchReports('2024-04');
      expect(results).toHaveLength(1);
      expect(results[0]!.companyName).toBe('Beta Srl');
    });

    it('filters by device serial number', () => {
      const results = useReportStore.getState().searchReports('1zz123');
      expect(results).toHaveLength(1);
      expect(results[0]!.companyName).toBe('Beta Srl');
    });

    it('returns empty array when no match', () => {
      const results = useReportStore.getState().searchReports('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('persists reports to localStorage', async () => {
      const report = createMockReport({ id: 'persist-test' });
      useReportStore.getState().addReport(report);

      // Zustand persist is synchronous in test with localStorage
      const stored = localStorage.getItem(STORAGE_KEYS.REPORTS);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.state.reports).toHaveLength(1);
      expect(parsed.state.reports[0].id).toBe('persist-test');
    });

    it('rehydrates from localStorage on store creation', () => {
      // Manually set localStorage as if it were persisted
      const report = createMockReport({ id: 'rehydrate-test' });
      const data = {
        state: { reports: [report] },
        version: 0,
      };
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(data));

      // Force rehydration
      useReportStore.persist.rehydrate();

      const found = useReportStore.getState().getReportById('rehydrate-test');
      expect(found).toBeDefined();
      expect(found?.id).toBe('rehydrate-test');
    });
  });
});
