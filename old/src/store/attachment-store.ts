/**
 * Zustand store per la gestione degli allegati multimediali.
 * Gestisce stato, caricamento, aggiunta e rimozione allegati con validazione limiti.
 */

import { create } from 'zustand';

import { attachmentRepository, AttachmentError } from '../data/attachment-repository';
import type { AttachmentInput } from '../data/attachment-repository';
import type { Attachment } from '../types/report';

interface AttachmentState {
  /** Lista allegati caricati per il rapporto corrente */
  attachments: Attachment[];
  /** Indica se un'operazione di upload è in corso */
  isUploading: boolean;
  /** Messaggio di errore corrente (null se nessun errore) */
  error: string | null;
}

interface AttachmentActions {
  /** Carica tutti gli allegati per un dato rapporto */
  loadAttachments: (reportId: string) => Promise<void>;
  /** Aggiunge un allegato al rapporto, validando limiti di dimensione e numero */
  addAttachment: (reportId: string, input: AttachmentInput) => Promise<void>;
  /** Rimuove un allegato per ID */
  removeAttachment: (attachmentId: string) => Promise<void>;
  /** Resetta lo stato errore */
  clearError: () => void;
}

export const useAttachmentStore = create<AttachmentState & AttachmentActions>((set) => ({
  attachments: [],
  isUploading: false,
  error: null,

  loadAttachments: async (reportId: string) => {
    try {
      set({ error: null });
      const attachments = await attachmentRepository.getByReportId(reportId);
      set({ attachments });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il caricamento degli allegati.';
      set({ error: message });
    }
  },

  addAttachment: async (reportId: string, input: AttachmentInput) => {
    try {
      set({ isUploading: true, error: null });
      const attachment = await attachmentRepository.add(reportId, input);
      set((state) => ({
        attachments: [...state.attachments, attachment],
        isUploading: false,
      }));
    } catch (error) {
      let message: string;
      if (error instanceof AttachmentError) {
        message = error.message;
      } else {
        message = error instanceof Error ? error.message : "Errore durante l'aggiunta dell'allegato.";
      }
      set({ isUploading: false, error: message });
    }
  },

  removeAttachment: async (attachmentId: string) => {
    try {
      set({ error: null });
      await attachmentRepository.remove(attachmentId);
      set((state) => ({
        attachments: state.attachments.filter((a) => a.id !== attachmentId),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante la rimozione dell\'allegato.';
      set({ error: message });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
