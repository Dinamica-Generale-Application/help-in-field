import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReportFormData } from '../types/report';

// Hoisted mocks to avoid reference issues
const mockAddEventListener = vi.hoisted(() => vi.fn(() => ({ remove: vi.fn() })));
const mockRepository = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  getAll: vi.fn(),
  search: vi.fn(),
  saveDraft: vi.fn(),
  getStorageInfo: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
}));

vi.mock('../data/report-repository', () => ({
  reportRepository: mockRepository,
}));

import { useReportStore } from './report-store';

function createValidFormData(overrides?: Partial<ReportFormData>): ReportFormData {
  return {
    status: 'draft',
    companyName: 'Azienda Test',
    interventionDate: '2024-01-15',
    performedBy: 'Mario Rossi',
    description: 'Intervento di manutenzione',
    hoursWorked: 2,
    kilometers: 50,
    discountPercent: 10,
    ...overrides,
  };
}

describe('useReportStore', () => {
  beforeEach(() => {
    // Reset store state
    useReportStore.setState({
      reports: [],
      currentReport: null,
      formData: null,
      validationErrors: [],
      costBreakdown: null,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  describe('initForm', () => {
    it('should initialize with empty form data when no report provided', () => {
      useReportStore.getState().initForm();
      const state = useReportStore.getState();

      expect(state.formData).not.toBeNull();
      expect(state.formData!.companyName).toBe('');
      expect(state.formData!.status).toBe('draft');
      expect(state.currentReport).toBeNull();
      expect(state.costBreakdown).toBeNull();
      expect(state.validationErrors).toEqual([]);
    });

    it('should initialize form from existing report', () => {
      const report = {
        id: '123',
        status: 'completed' as const,
        companyName: 'Test SRL',
        interventionDate: '2024-03-01',
        performedBy: 'Luigi Verdi',
        description: 'Riparazione',
        hoursWorked: 4,
        kilometers: 100,
        discountPercent: 5,
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-01T12:00:00Z',
        hourlyTotal: 240,
        kilometerTotal: 90,
        subtotal: 330,
        discountAmount: 16.5,
        discountedSubtotal: 313.5,
        vatAmount: 68.97,
        grandTotal: 382.47,
      };

      useReportStore.getState().initForm(report);
      const state = useReportStore.getState();

      expect(state.formData!.companyName).toBe('Test SRL');
      expect(state.formData!.hoursWorked).toBe(4);
      expect(state.currentReport).toEqual(report);
      expect(state.costBreakdown).not.toBeNull();
      expect(state.costBreakdown!.hourlyTotal).toBe(240);
    });
  });

  describe('updateFormField', () => {
    it('should update a regular field without recalculating costs', () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('companyName', 'Nuova Azienda');

      const state = useReportStore.getState();
      expect(state.formData!.companyName).toBe('Nuova Azienda');
    });

    it('should recalculate costs when hoursWorked changes', () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('hoursWorked', 3);
      useReportStore.getState().updateFormField('kilometers', 100);

      const state = useReportStore.getState();
      expect(state.costBreakdown).not.toBeNull();
      expect(state.costBreakdown!.hourlyTotal).toBe(180); // 3 × 60
      expect(state.costBreakdown!.kilometerTotal).toBe(90); // 100 × 0.90
    });

    it('should recalculate costs when kilometers changes', () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('hoursWorked', 1);
      useReportStore.getState().updateFormField('kilometers', 200);

      const state = useReportStore.getState();
      expect(state.costBreakdown!.kilometerTotal).toBe(180); // 200 × 0.90
    });

    it('should recalculate costs when discountPercent changes', () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('hoursWorked', 2);
      useReportStore.getState().updateFormField('discountPercent', 20);

      const state = useReportStore.getState();
      expect(state.costBreakdown!.discountAmount).toBe(24); // 120 × 0.20
    });

    it('should return null costBreakdown when hours are not set', () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('kilometers', 100);

      const state = useReportStore.getState();
      expect(state.costBreakdown).toBeNull();
    });
  });

  describe('saveReport', () => {
    it('should set validation errors when form is invalid', async () => {
      useReportStore.getState().initForm(); // empty form - invalid

      const result = await useReportStore.getState().saveReport();

      const state = useReportStore.getState();
      expect(result).toBeNull();
      expect(state.validationErrors.length).toBeGreaterThan(0);
    });

    it('should preserve form data when validation fails (Req 9.5)', async () => {
      useReportStore.getState().initForm();
      useReportStore.getState().updateFormField('companyName', 'Test');
      // Still missing required fields

      await useReportStore.getState().saveReport();

      const state = useReportStore.getState();
      expect(state.formData!.companyName).toBe('Test'); // preserved
      expect(state.validationErrors.length).toBeGreaterThan(0);
    });

    it('should create report when form is valid and no id', async () => {
      const formData = createValidFormData();
      useReportStore.setState({ formData });

      const mockReport = { ...formData, id: 'new-id', createdAt: '', updatedAt: '' };
      mockRepository.create.mockResolvedValue(mockReport);
      mockRepository.getAll.mockResolvedValue([mockReport]);

      const result = await useReportStore.getState().saveReport();

      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockReport);
    });

    it('should update report when form is valid and id is provided', async () => {
      const formData = createValidFormData();
      useReportStore.setState({ formData });

      const mockReport = { ...formData, id: 'existing-id', createdAt: '', updatedAt: '' };
      mockRepository.update.mockResolvedValue(mockReport);
      mockRepository.getAll.mockResolvedValue([mockReport]);

      const result = await useReportStore.getState().saveReport('existing-id');

      expect(mockRepository.update).toHaveBeenCalledWith('existing-id', formData);
      expect(result).toEqual(mockReport);
    });
  });

  describe('loadReports', () => {
    it('should load reports from repository', async () => {
      const mockReports = [
        { id: '1', companyName: 'A', interventionDate: '2024-01-01' },
        { id: '2', companyName: 'B', interventionDate: '2024-01-02' },
      ];
      mockRepository.getAll.mockResolvedValue(mockReports);

      await useReportStore.getState().loadReports();

      const state = useReportStore.getState();
      expect(state.reports).toEqual(mockReports);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading while fetching', async () => {
      mockRepository.getAll.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 50))
      );

      const promise = useReportStore.getState().loadReports();
      expect(useReportStore.getState().isLoading).toBe(true);

      await promise;
      expect(useReportStore.getState().isLoading).toBe(false);
    });
  });

  describe('deleteReport', () => {
    it('should remove report and refresh list', async () => {
      mockRepository.delete.mockResolvedValue(undefined);
      mockRepository.getAll.mockResolvedValue([]);
      useReportStore.setState({ currentReport: { id: 'del-1' } as any });

      await useReportStore.getState().deleteReport('del-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('del-1');
      expect(useReportStore.getState().currentReport).toBeNull();
      expect(useReportStore.getState().reports).toEqual([]);
    });

    it('should preserve currentReport if deleting a different report', async () => {
      const current = { id: 'keep-me' } as any;
      mockRepository.delete.mockResolvedValue(undefined);
      mockRepository.getAll.mockResolvedValue([current]);
      useReportStore.setState({ currentReport: current });

      await useReportStore.getState().deleteReport('other-id');

      expect(useReportStore.getState().currentReport).toEqual(current);
    });
  });

  describe('searchReports', () => {
    it('should delegate search to repository', async () => {
      const mockResults = [{ id: '1', companyName: 'Found' }];
      mockRepository.search.mockResolvedValue(mockResults);

      const results = await useReportStore.getState().searchReports({ text: 'Found' });

      expect(mockRepository.search).toHaveBeenCalledWith({ text: 'Found' });
      expect(results).toEqual(mockResults);
    });
  });

  describe('saveDraft', () => {
    it('should save form data as draft via repository', async () => {
      const formData = createValidFormData();
      useReportStore.setState({ formData });

      const mockDraft = { ...formData, id: 'draft-1', status: 'draft' };
      mockRepository.saveDraft.mockResolvedValue(mockDraft);
      mockRepository.getAll.mockResolvedValue([mockDraft]);

      const result = await useReportStore.getState().saveDraft();

      expect(mockRepository.saveDraft).toHaveBeenCalledWith(formData);
      expect(result).toEqual(mockDraft);
    });
  });

  describe('resetForm', () => {
    it('should clear form state completely', () => {
      useReportStore.setState({
        formData: createValidFormData(),
        currentReport: { id: '1' } as any,
        costBreakdown: { hourlyTotal: 60 } as any,
        validationErrors: [{ field: 'x', message: 'y', type: 'required' }],
      });

      useReportStore.getState().resetForm();

      const state = useReportStore.getState();
      expect(state.formData).toBeNull();
      expect(state.currentReport).toBeNull();
      expect(state.costBreakdown).toBeNull();
      expect(state.validationErrors).toEqual([]);
    });
  });

  describe('subscribeAppState', () => {
    it('should register AppState listener and return unsubscribe function', () => {
      const unsubscribe = useReportStore.getState().subscribeAppState();

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should auto-save draft when app goes to background with unsaved form', () => {
      const formData = createValidFormData();
      useReportStore.setState({ formData, currentReport: null });
      mockRepository.saveDraft.mockResolvedValue({});

      useReportStore.getState().subscribeAppState();

      // Get the listener callback
      const callback = mockAddEventListener.mock.calls[0][1] as (state: string) => void;
      callback('background');

      expect(mockRepository.saveDraft).toHaveBeenCalledWith(formData);
    });

    it('should auto-save update when app goes to background with existing report', () => {
      const formData = createValidFormData();
      const currentReport = { id: 'existing-1' } as any;
      useReportStore.setState({ formData, currentReport });
      mockRepository.update.mockResolvedValue({});

      useReportStore.getState().subscribeAppState();

      const callback = mockAddEventListener.mock.calls[0][1] as (state: string) => void;
      callback('background');

      expect(mockRepository.update).toHaveBeenCalledWith('existing-1', formData);
    });
  });
});
