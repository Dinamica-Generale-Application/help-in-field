/**
 * BackupSection — export/import backup and delete all data functionality.
 */

import { useCallback, useRef, useState } from 'react';
import { useReportStore } from '@/features/reports/stores/reportStore';
import { useSettingsStore } from '../stores/settingsStore';
import { exportBackup, importBackup } from '../utils/backup';

type DialogState =
  | { type: 'none' }
  | { type: 'import-confirm'; newCount: number; skippedCount: number; onConfirm: () => void }
  | { type: 'import-error'; message: string }
  | { type: 'delete-first' }
  | { type: 'delete-second' };

export function BackupSection() {
  const reports = useReportStore((s) => s.reports);
  const addReport = useReportStore((s) => s.addReport);
  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const clearAllData = useSettingsStore((s) => s.clearAllData);

  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  }, []);

  const handleExport = useCallback(() => {
    exportBackup(reports, settings);
    showStatus('Backup esportato con successo.');
  }, [reports, settings, showStatus]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so same file can be selected again
      e.target.value = '';

      try {
        const existingIds = reports.map((r) => r.id);
        const result = await importBackup(file, existingIds);

        if (result.newReportsCount === 0) {
          showStatus(`Nessun nuovo rapporto da importare (${result.skippedCount} già presenti).`);
          return;
        }

        setDialog({
          type: 'import-confirm',
          newCount: result.newReportsCount,
          skippedCount: result.skippedCount,
          onConfirm: () => {
            // Add new reports to store
            for (const report of result.reports) {
              addReport(report);
            }
            // Optionally update settings
            if (Object.keys(result.settings).length > 0) {
              updateSettings(result.settings);
            }
            setDialog({ type: 'none' });
            showStatus(`Importati ${result.newReportsCount} rapporti.`);
          },
        });
      } catch (err) {
        setDialog({
          type: 'import-error',
          message: err instanceof Error ? err.message : 'Errore durante l\'importazione.',
        });
      }
    },
    [reports, addReport, updateSettings, showStatus],
  );

  const handleDeleteClick = useCallback(() => {
    setDialog({ type: 'delete-first' });
  }, []);

  const handleDeleteFirstConfirm = useCallback(() => {
    setDialog({ type: 'delete-second' });
  }, []);

  const handleDeleteFinalConfirm = useCallback(() => {
    clearAllData();
    // Reset report store
    useReportStore.setState({ reports: [] });
    setDialog({ type: 'none' });
    showStatus('Tutti i dati sono stati cancellati.');
  }, [clearAllData, showStatus]);

  const closeDialog = useCallback(() => {
    setDialog({ type: 'none' });
  }, []);

  return (
    <section className="space-y-6" aria-labelledby="backup-section-title">
      <h2 id="backup-section-title" className="text-lg font-semibold text-foreground">
        Backup e Ripristino
      </h2>

      {/* Export/Import buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          ⬇️ Esporta Backup
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          ⬆️ Importa Backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Seleziona file backup JSON"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Il backup include tutti i rapporti, dispositivi, allegati e impostazioni in formato JSON.
      </p>

      {/* Delete all data */}
      <div className="border-t border-border pt-6 mt-6">
        <h3 className="text-sm font-medium text-destructive mb-2">Zona pericolosa</h3>
        <button
          type="button"
          onClick={handleDeleteClick}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          🗑️ Cancella tutti i dati
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          Elimina tutti i rapporti e le impostazioni in modo permanente.
        </p>
      </div>

      {/* Status message */}
      {statusMessage && (
        <p className="text-sm text-green-600 font-medium" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      {/* Dialogs */}
      {dialog.type !== 'none' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-dialog-title"
        >
          <div className="fixed inset-0 bg-black/50" onClick={closeDialog} aria-hidden="true" />

          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            {/* Import confirmation dialog */}
            {dialog.type === 'import-confirm' && (
              <>
                <h3 id="backup-dialog-title" className="text-lg font-semibold text-foreground">
                  Conferma Importazione
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Trovati <span className="font-medium text-foreground">{dialog.newCount}</span> nuovi rapporti da importare.
                  {dialog.skippedCount > 0 && (
                    <> ({dialog.skippedCount} già presenti, saranno ignorati.)</>
                  )}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Procedere con l'importazione?
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={dialog.onConfirm}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Importa
                  </button>
                </div>
              </>
            )}

            {/* Import error dialog */}
            {dialog.type === 'import-error' && (
              <>
                <h3 id="backup-dialog-title" className="text-lg font-semibold text-destructive">
                  Errore Importazione
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {dialog.message}
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Chiudi
                  </button>
                </div>
              </>
            )}

            {/* Delete first confirmation */}
            {dialog.type === 'delete-first' && (
              <>
                <h3 id="backup-dialog-title" className="text-lg font-semibold text-foreground">
                  Cancella tutti i dati
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Sei sicuro di voler cancellare tutti i dati?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Verranno eliminati tutti i rapporti ({reports.length}) e le impostazioni.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFirstConfirm}
                    className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Sì, cancella
                  </button>
                </div>
              </>
            )}

            {/* Delete second (final) confirmation */}
            {dialog.type === 'delete-second' && (
              <>
                <h3 id="backup-dialog-title" className="text-lg font-semibold text-destructive">
                  Conferma eliminazione
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">Questa azione è irreversibile.</strong>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tutti i rapporti e le impostazioni verranno eliminati definitivamente.
                  Si consiglia di esportare un backup prima di procedere.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteFinalConfirm}
                    className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
                  >
                    Conferma eliminazione
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
