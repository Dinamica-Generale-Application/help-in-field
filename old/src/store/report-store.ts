/**
 * Zustand Store per i rapporti di assistenza tecnica.
 *
 * Gestisce lo stato applicativo dei rapporti: lista, form corrente,
 * validazione, calcolo costi e auto-save.
 *
 * Validates: Requirements 2.7, 4.6, 5.1, 5.2, 5.4, 9.5
 */

import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import { reportRepository } from '../data/report-repository';
import { calculate, type CostBreakdown } from '../domain/cost-calculation';
import { validateReport, type ValidationError, type ValidationResult } from '../domain/validation';
import type { Report, ReportFormData, SearchQuery } from '../types/report';

// --- Tipi stato ---

export interface ReportStoreState {
  /** Lista dei rapporti caricati */
  reports: Report[];
  /** Rapporto attualmente selezionato/visualizzato */
  currentReport: Report | null;
  /** Dati del form in fase di modifica */
  formData: ReportFormData | null;
  /** Errori di validazione correnti */
  validationErrors: ValidationError[];
  /** Breakdown costi calcolato in tempo reale */
  costBreakdown: CostBreakdown | null;
  /** Stato di caricamento */
  isLoading: boolean;
}

export interface ReportStoreActions {
  /** Carica tutti i rapporti dal repository */
  loadReports: () => Promise<void>;
  /** Crea un nuovo rapporto dal formData corrente */
  createReport: () => Promise<Report | null>;
  /** Aggiorna un rapporto esistente con i dati del form */
  updateReport: (id: string) => Promise<Report | null>;
  /** Elimina un rapporto */
  deleteReport: (id: string) => Promise<void>;
  /** Salva il form corrente come bozza */
  saveDraft: () => Promise<Report | null>;
  /** Salva il rapporto (valida, poi persiste) */
  saveReport: (id?: string) => Promise<Report | null>;
  /** Cerca rapporti tramite query */
  searchReports: (query: SearchQuery) => Promise<Report[]>;
  /** Inizializza il form con dati vuoti o da un rapporto esistente */
  initForm: (report?: Report) => void;
  /** Aggiorna un campo del form, ricalcola costi se necessario */
  updateFormField: (field: keyof ReportFormData, value: unknown) => void;
  /** Resetta il form */
  resetForm: () => void;
  /** Attiva il listener per auto-save su AppState change */
  subscribeAppState: () => () => void;
}

export type ReportStore = ReportStoreState & ReportStoreActions;

// --- Form iniziale vuoto ---

function createEmptyFormData(): ReportFormData {
  return {
    status: 'draft',
    companyName: '',
    interventionDate: '',
    performedBy: '',
    description: '',
    discountPercent: 0,
  };
}

// --- Campi che triggano il ricalcolo costi ---

const COST_FIELDS: Array<keyof ReportFormData> = ['hoursWorked', 'kilometers', 'discountPercent'];

/**
 * Ricalcola il breakdown costi dal formData corrente.
 */
function recalculateCosts(formData: ReportFormData): CostBreakdown | null {
  const hours = formData.hoursWorked;
  if (hours == null || hours <= 0) {
    return null;
  }

  return calculate({
    hours,
    kilometers: formData.kilometers ?? 0,
    discountPercent: formData.discountPercent ?? 0,
  });
}

// --- Store ---

export const useReportStore = create<ReportStore>((set, get) => ({
  // --- Stato iniziale ---
  reports: [],
  currentReport: null,
  formData: null,
  validationErrors: [],
  costBreakdown: null,
  isLoading: false,

  // --- Azioni ---

  loadReports: async () => {
    set({ isLoading: true });
    try {
      const reports = await reportRepository.getAll();
      set({ reports, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createReport: async () => {
    const { formData } = get();
    if (!formData) return null;

    set({ isLoading: true });
    try {
      const report = await reportRepository.create(formData);
      const reports = await reportRepository.getAll();
      set({ reports, currentReport: report, isLoading: false });
      return report;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  updateReport: async (id: string) => {
    const { formData } = get();
    if (!formData) return null;

    set({ isLoading: true });
    try {
      const report = await reportRepository.update(id, formData);
      const reports = await reportRepository.getAll();
      set({ reports, currentReport: report, isLoading: false });
      return report;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  deleteReport: async (id: string) => {
    set({ isLoading: true });
    try {
      await reportRepository.delete(id);
      const { currentReport } = get();
      const reports = await reportRepository.getAll();
      set({
        reports,
        currentReport: currentReport?.id === id ? null : currentReport,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  saveDraft: async () => {
    const { formData } = get();
    if (!formData) return null;

    set({ isLoading: true });
    try {
      const report = await reportRepository.saveDraft(formData);
      const reports = await reportRepository.getAll();
      set({ reports, currentReport: report, isLoading: false });
      return report;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  saveReport: async (id?: string) => {
    const { formData } = get();
    if (!formData) return null;

    // Valida prima di salvare (Requirement 9.5: preserva i dati del form in caso di errore)
    const result: ValidationResult = validateReport(formData);
    if (!result.isValid) {
      set({ validationErrors: result.errors });
      return null;
    }

    // Validazione superata: pulisci errori
    set({ validationErrors: [] });

    // Persisti
    if (id) {
      return get().updateReport(id);
    } else {
      return get().createReport();
    }
  },

  searchReports: async (query: SearchQuery) => {
    set({ isLoading: true });
    try {
      const results = await reportRepository.search(query);
      set({ isLoading: false });
      return results;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  initForm: (report?: Report) => {
    if (report) {
      // Carica dati da rapporto esistente nel form
      const formData: ReportFormData = {
        status: report.status,
        companyName: report.companyName,
        address: report.address,
        phone: report.phone,
        vatNumber: report.vatNumber,
        interventionDate: report.interventionDate,
        performedBy: report.performedBy,
        interventionLocation: report.interventionLocation,
        interventionLat: report.interventionLat,
        interventionLon: report.interventionLon,
        requestedBy: report.requestedBy,
        onBehalfOf: report.onBehalfOf,
        interventionReason: report.interventionReason,
        description: report.description,
        model: report.model,
        serialNumber: report.serialNumber,
        productionYear: report.productionYear,
        warranty: report.warranty,
        payment: report.payment,
        hoursWorked: report.hoursWorked,
        kilometers: report.kilometers,
        discountPercent: report.discountPercent,
        notes: report.notes,
      };
      const costBreakdown = recalculateCosts(formData);
      set({ formData, currentReport: report, costBreakdown, validationErrors: [] });
    } else {
      const formData = createEmptyFormData();
      set({ formData, currentReport: null, costBreakdown: null, validationErrors: [] });
    }
  },

  updateFormField: (field: keyof ReportFormData, value: unknown) => {
    const { formData } = get();
    if (!formData) return;

    const updatedFormData = { ...formData, [field]: value } as ReportFormData;

    // Ricalcola costi se il campo modificato è ore/km/sconto (Requirement 4.6)
    if (COST_FIELDS.includes(field)) {
      const costBreakdown = recalculateCosts(updatedFormData);
      set({ formData: updatedFormData, costBreakdown });
    } else {
      set({ formData: updatedFormData });
    }
  },

  resetForm: () => {
    set({ formData: null, currentReport: null, costBreakdown: null, validationErrors: [] });
  },

  subscribeAppState: () => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const { formData, currentReport } = get();
        if (formData) {
          // Auto-save: se il rapporto esiste già, aggiorna; altrimenti salva come bozza
          if (currentReport) {
            reportRepository.update(currentReport.id, formData).catch(() => {
              // Silently fail - best effort auto-save
            });
          } else {
            reportRepository.saveDraft(formData).catch(() => {
              // Silently fail - best effort auto-save
            });
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  },
}));
