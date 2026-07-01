/**
 * BackupSection — export/import backup and delete all data functionality.
 * Uses Radix Dialog for accessible modals with focus trap.
 */

import { useCallback, useRef, useState } from 'react';
import { useReportStore } from '@/features/reports/stores/reportStore';
import { useSettingsStore } from '../stores/settingsStore';
import { exportBackup, importBackup } from '../utils/backup';
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

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

      {/* Import confirmation dialog */}
      <Dialog open={dialog.type === 'import-confirm'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        {dialog.type === 'import-confirm' && (
          <>
            <DialogTitle>Conferma Importazione</DialogTitle>
            <DialogDescription>
              Trovati <span className="font-medium text-foreground">{dialog.newCount}</span> nuovi rapporti da importare.
              {dialog.skippedCount > 0 && (
                <> ({dialog.skippedCount} già presenti, saranno ignorati.)</>
              )}
            </DialogDescription>
            <p className="mt-2 text-sm text-muted-foreground">
              Procedere con l'importazione?
            </p>
            <DialogFooter>
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
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* Import error dialog */}
      <Dialog open={dialog.type === 'import-error'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        {dialog.type === 'import-error' && (
          <>
            <DialogTitle className="text-destructive">Errore Importazione</DialogTitle>
            <DialogDescription>{dialog.message}</DialogDescription>
            <DialogFooter>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
              >
                Chiudi
              </button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* Delete first confirmation */}
      <Dialog open={dialog.type === 'delete-first'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogTitle>Cancella tutti i dati</DialogTitle>
        <DialogDescription>
          Sei sicuro di voler cancellare tutti i dati?
        </DialogDescription>
        <p className="mt-2 text-sm text-muted-foreground">
          Verranno eliminati tutti i rapporti ({reports.length}) e le impostazioni.
        </p>
        <DialogFooter>
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
        </DialogFooter>
      </Dialog>

      {/* Delete second (final) confirmation */}
      <Dialog open={dialog.type === 'delete-second'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogTitle className="text-destructive">Conferma eliminazione</DialogTitle>
        <DialogDescription>
          <strong className="text-foreground">Questa azione è irreversibile.</strong>
        </DialogDescription>
        <p className="mt-2 text-sm text-muted-foreground">
          Tutti i rapporti e le impostazioni verranno eliminati definitivamente.
          Si consiglia di esportare un backup prima di procedere.
        </p>
        <DialogFooter>
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
        </DialogFooter>
      </Dialog>
    </section>
  );
}
