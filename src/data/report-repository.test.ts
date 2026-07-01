import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReportFormData } from '../types/report';

// --- Mocks ---

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

// Chain builders
const mockValuesChain = { values: vi.fn().mockResolvedValue(undefined) };
const mockSetChain = { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) };
const mockWhereDeleteChain = { where: vi.fn().mockResolvedValue(undefined) };
const mockFromChain = {
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockResolvedValue([]),
    }),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
  }),
};

const mockDb = {
  insert: mockInsert.mockReturnValue(mockValuesChain),
  update: mockUpdate.mockReturnValue(mockSetChain),
  delete: mockDelete.mockReturnValue(mockWhereDeleteChain),
  select: mockSelect.mockReturnValue(mockFromChain),
};

vi.mock('./database', () => ({
  getDatabase: () => ({ db: mockDb, sqliteDb: {} }),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

vi.mock('../domain/cost-calculation', () => ({
  calculate: vi.fn((input: { hours: number; kilometers: number; discountPercent: number }) => ({
    hourlyTotal: input.hours * 60,
    kilometerTotal: input.kilometers * 0.9,
    subtotal: input.hours * 60 + input.kilometers * 0.9,
    discountAmount: (input.hours * 60 + input.kilometers * 0.9) * (input.discountPercent / 100),
    discountedSubtotal: (input.hours * 60 + input.kilometers * 0.9) * (1 - input.discountPercent / 100),
    vatAmount: (input.hours * 60 + input.kilometers * 0.9) * (1 - input.discountPercent / 100) * 0.22,
    grandTotal: (input.hours * 60 + input.kilometers * 0.9) * (1 - input.discountPercent / 100) * 1.22,
  })),
}));

import {
  create,
  update,
  deleteReport,
  getById,
  getAll,
  search,
  saveDraft,
  getStorageInfo,
  reportRepository,
} from './report-repository';

// --- Test Data ---

function makeFormData(overrides?: Partial<ReportFormData>): ReportFormData {
  return {
    status: 'completed',
    companyName: 'Acme Corp',
    address: 'Via Roma 1',
    phone: '0123456789',
    vatNumber: '12345678901',
    interventionDate: '2024-01-15',
    performedBy: 'Mario Rossi',
    interventionLocation: 'Milano',
    requestedBy: 'Luigi Bianchi',
    onBehalfOf: undefined,
    interventionReason: 'malfunction',
    description: 'Riparazione motore',
    model: 'XR-500',
    serialNumber: '1ZZABC123',
    productionYear: '2020',
    warranty: 'out_warranty',
    payment: 'paid',
    hoursWorked: 2,
    kilometers: 50,
    discountPercent: 10,
    notes: 'Tutto ok',
    ...overrides,
  };
}

function makeDbRow(overrides?: Record<string, unknown>) {
  return {
    id: 'test-uuid-1234',
    status: 'completed',
    companyName: 'Acme Corp',
    address: 'Via Roma 1',
    phone: '0123456789',
    vatNumber: '12345678901',
    interventionDate: '2024-01-15',
    performedBy: 'Mario Rossi',
    interventionLocation: 'Milano',
    requestedBy: 'Luigi Bianchi',
    onBehalfOf: null,
    interventionReason: 'malfunction',
    description: 'Riparazione motore',
    model: 'XR-500',
    serialNumber: '1ZZABC123',
    productionYear: '2020',
    warranty: 'out_warranty',
    payment: 'paid',
    hoursWorked: 2,
    kilometers: 50,
    discountPercent: 10,
    hourlyTotal: 120,
    kilometerTotal: 45,
    subtotal: 165,
    discountAmount: 16.5,
    discountedSubtotal: 148.5,
    vatAmount: 32.67,
    grandTotal: 181.17,
    notes: 'Tutto ok',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('ReportRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behavior
    mockInsert.mockReturnValue(mockValuesChain);
    mockValuesChain.values.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue(mockSetChain);
    mockSetChain.set.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDelete.mockReturnValue(mockWhereDeleteChain);
    mockWhereDeleteChain.where.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('should insert a report with generated UUID and computed costs', async () => {
      // Mock getStorageInfo (count query)
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 5 }]),
      };
      // Mock getById (after insert)
      const getByIdFromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeDbRow()]),
          }),
        }),
      };

      // First select call: getStorageInfo, second: getById
      mockSelect
        .mockReturnValueOnce(countFromChain)
        .mockReturnValueOnce(getByIdFromChain);

      const result = await create(makeFormData());

      expect(result.id).toBe('test-uuid-1234');
      expect(result.companyName).toBe('Acme Corp');
      expect(result.status).toBe('completed');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should throw when storage limit is reached', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 500 }]),
      };
      mockSelect.mockReturnValueOnce(countFromChain);

      await expect(create(makeFormData())).rejects.toThrow(
        'Limite massimo di 500 rapporti raggiunto'
      );
    });

    it('should retry up to 3 times on write error', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 0 }]),
      };
      const getByIdFromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeDbRow()]),
          }),
        }),
      };
      mockSelect
        .mockReturnValueOnce(countFromChain)
        .mockReturnValueOnce(getByIdFromChain);

      // Fail twice, succeed on third attempt
      mockValuesChain.values
        .mockRejectedValueOnce(new Error('write error'))
        .mockRejectedValueOnce(new Error('write error'))
        .mockResolvedValueOnce(undefined);

      const result = await create(makeFormData());
      expect(result.id).toBe('test-uuid-1234');
      expect(mockValuesChain.values).toHaveBeenCalledTimes(3);
    });

    it('should throw after 3 failed retries', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 0 }]),
      };
      mockSelect.mockReturnValueOnce(countFromChain);

      mockValuesChain.values
        .mockRejectedValueOnce(new Error('write error'))
        .mockRejectedValueOnce(new Error('write error'))
        .mockRejectedValueOnce(new Error('write error'));

      await expect(create(makeFormData())).rejects.toThrow('write error');
      expect(mockValuesChain.values).toHaveBeenCalledTimes(3);
    });
  });

  describe('getById', () => {
    it('should return null when report is not found', async () => {
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await getById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return a report when found', async () => {
      const row = makeDbRow();
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([row]),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await getById('test-uuid-1234');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('test-uuid-1234');
      expect(result!.companyName).toBe('Acme Corp');
      expect(result!.hourlyTotal).toBe(120);
    });
  });

  describe('getAll', () => {
    it('should return reports ordered by intervention date DESC', async () => {
      const rows = [
        makeDbRow({ id: '1', interventionDate: '2024-03-01' }),
        makeDbRow({ id: '2', interventionDate: '2024-02-01' }),
        makeDbRow({ id: '3', interventionDate: '2024-01-01' }),
      ];
      const fromChain = {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(rows),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await getAll();
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[2].id).toBe('3');
    });
  });

  describe('deleteReport', () => {
    it('should delete a report by ID', async () => {
      await deleteReport('test-uuid-1234');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockWhereDeleteChain.where).toHaveBeenCalled();
    });

    it('should retry on delete error', async () => {
      mockWhereDeleteChain.where
        .mockRejectedValueOnce(new Error('delete error'))
        .mockRejectedValueOnce(new Error('delete error'))
        .mockResolvedValueOnce(undefined);

      await deleteReport('test-uuid-1234');
      expect(mockWhereDeleteChain.where).toHaveBeenCalledTimes(3);
    });
  });

  describe('search', () => {
    it('should query with text filter', async () => {
      const rows = [makeDbRow()];
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(rows),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await search({ text: 'Acme' });
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Acme Corp');
    });

    it('should return empty array when no matches', async () => {
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await search({ text: 'NonExistent' });
      expect(result).toHaveLength(0);
    });

    it('should support status filter', async () => {
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([makeDbRow({ status: 'draft' })]),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      const result = await search({ status: 'draft' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('draft');
    });
  });

  describe('saveDraft', () => {
    it('should create a report with status draft', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 0 }]),
      };
      const getByIdFromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeDbRow({ status: 'draft' })]),
          }),
        }),
      };
      mockSelect
        .mockReturnValueOnce(countFromChain)
        .mockReturnValueOnce(getByIdFromChain);

      const result = await saveDraft(makeFormData({ status: 'completed' }));
      expect(result.status).toBe('draft');
    });
  });

  describe('getStorageInfo', () => {
    it('should return count and max reports', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 42 }]),
      };
      mockSelect.mockReturnValueOnce(countFromChain);

      const info = await getStorageInfo();
      expect(info.usedReports).toBe(42);
      expect(info.maxReports).toBe(500);
    });

    it('should return 0 when no reports exist', async () => {
      const countFromChain = {
        from: vi.fn().mockReturnValue([{ count: 0 }]),
      };
      mockSelect.mockReturnValueOnce(countFromChain);

      const info = await getStorageInfo();
      expect(info.usedReports).toBe(0);
      expect(info.maxReports).toBe(500);
    });
  });

  describe('update', () => {
    it('should update fields and recompute costs', async () => {
      // getById for existing report
      const existingFromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeDbRow()]),
          }),
        }),
      };
      // getById after update
      const updatedFromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeDbRow({ hoursWorked: 4 })]),
          }),
        }),
      };
      mockSelect
        .mockReturnValueOnce(existingFromChain)
        .mockReturnValueOnce(updatedFromChain);

      const result = await update('test-uuid-1234', { hoursWorked: 4 });
      expect(result.hoursWorked).toBe(4);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw if report does not exist', async () => {
      const fromChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      mockSelect.mockReturnValueOnce(fromChain);

      await expect(update('non-existent', { companyName: 'New' })).rejects.toThrow(
        'non trovato'
      );
    });
  });

  describe('reportRepository object', () => {
    it('should expose all repository methods', () => {
      expect(reportRepository.create).toBe(create);
      expect(reportRepository.update).toBe(update);
      expect(reportRepository.delete).toBe(deleteReport);
      expect(reportRepository.getById).toBe(getById);
      expect(reportRepository.getAll).toBe(getAll);
      expect(reportRepository.search).toBe(search);
      expect(reportRepository.saveDraft).toBe(saveDraft);
      expect(reportRepository.getStorageInfo).toBe(getStorageInfo);
    });
  });
});
