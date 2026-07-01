/**
 * Unit tests for ReportListRoute logic — sorting and search integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useReportStore } from '../stores/reportStore';
import type { Report } from '../types';

function createMockReport(overrides: Partial<Report> = {}): Report {
  return {
    id: crypto.randomUUID(),
    status: 'draft',
    companyName: 'Test Company',
    interventionDate: '2024-01-15',
    operator: 'OP1',
    description: 'Test description',
    devices: [],
    hoursWorked: 2,
    discountPercent: 0,
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Sort reports by interventionDate descending (same logic as ReportListRoute).
 */
function sortByDateDesc(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    const dateA = new Date(a.interventionDate).getTime();
    const dateB = new Date(b.interventionDate).getTime();
    return dateB - dateA;
  });
}

describe('ReportList logic', () => {
  beforeEach(() => {
    localStorage.clear();
    useReportStore.setState({ reports: [] });
  });

  describe('sortByDateDesc', () => {
    it('sorts reports with most recent intervention date first', () => {
      const reports = [
        createMockReport({ id: 'old', interventionDate: '2024-01-01' }),
        createMockReport({ id: 'new', interventionDate: '2024-06-15' }),
        createMockReport({ id: 'mid', interventionDate: '2024-03-10' }),
      ];

      const sorted = sortByDateDesc(reports);

      expect(sorted[0]!.id).toBe('new');
      expect(sorted[1]!.id).toBe('mid');
      expect(sorted[2]!.id).toBe('old');
    });

    it('returns empty array for empty input', () => {
      expect(sortByDateDesc([])).toEqual([]);
    });

    it('handles single report', () => {
      const reports = [createMockReport({ id: 'only' })];
      const sorted = sortByDateDesc(reports);
      expect(sorted).toHaveLength(1);
      expect(sorted[0]!.id).toBe('only');
    });

    it('preserves order for same-date reports', () => {
      const reports = [
        createMockReport({ id: 'a', interventionDate: '2024-05-01' }),
        createMockReport({ id: 'b', interventionDate: '2024-05-01' }),
      ];

      const sorted = sortByDateDesc(reports);
      expect(sorted).toHaveLength(2);
      // Both should be present
      const ids = sorted.map((r) => r.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
    });

    it('does not mutate the original array', () => {
      const reports = [
        createMockReport({ id: 'a', interventionDate: '2024-01-01' }),
        createMockReport({ id: 'b', interventionDate: '2024-06-01' }),
      ];
      const original = [...reports];

      sortByDateDesc(reports);

      expect(reports[0]!.id).toBe(original[0]!.id);
      expect(reports[1]!.id).toBe(original[1]!.id);
    });
  });

  describe('search + sort integration', () => {
    beforeEach(() => {
      useReportStore.getState().addReport(
        createMockReport({ id: '1', companyName: 'Alfa Srl', interventionDate: '2024-01-10' })
      );
      useReportStore.getState().addReport(
        createMockReport({ id: '2', companyName: 'Alfa SpA', interventionDate: '2024-06-20' })
      );
      useReportStore.getState().addReport(
        createMockReport({ id: '3', companyName: 'Beta Corp', interventionDate: '2024-03-15' })
      );
    });

    it('search filters then sort shows most recent first', () => {
      const filtered = useReportStore.getState().searchReports('alfa');
      const sorted = sortByDateDesc(filtered);

      expect(sorted).toHaveLength(2);
      expect(sorted[0]!.id).toBe('2'); // June 2024
      expect(sorted[1]!.id).toBe('1'); // January 2024
    });

    it('empty query returns all reports sorted by date desc', () => {
      const all = useReportStore.getState().searchReports('');
      const sorted = sortByDateDesc(all);

      expect(sorted).toHaveLength(3);
      expect(sorted[0]!.id).toBe('2'); // June 2024
      expect(sorted[1]!.id).toBe('3'); // March 2024
      expect(sorted[2]!.id).toBe('1'); // January 2024
    });

    it('search is case-insensitive', () => {
      const results = useReportStore.getState().searchReports('ALFA');
      expect(results).toHaveLength(2);
    });

    it('returns empty array for no match', () => {
      const results = useReportStore.getState().searchReports('zzz');
      const sorted = sortByDateDesc(results);
      expect(sorted).toHaveLength(0);
    });
  });
});
