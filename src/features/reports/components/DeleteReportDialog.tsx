/**
 * DeleteReportDialog — confirmation dialog showing company name and date
 * before permanently deleting a report.
 */

import { formatDate } from '@/utils/format';

interface DeleteReportDialogProps {
  open: boolean;
  companyName: string;
  interventionDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteReportDialog({
  open,
  companyName,
  interventionDate,
  onConfirm,
  onCancel,
}: DeleteReportDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-foreground"
        >
          Elimina Rapporto
        </h2>

        <p className="mt-3 text-sm text-muted-foreground">
          Sei sicuro di voler eliminare il rapporto per{' '}
          <span className="font-medium text-foreground">{companyName}</span> del{' '}
          <span className="font-medium text-foreground">
            {formatDate(interventionDate)}
          </span>
          ?
        </p>
        <p className="mt-2 text-sm text-destructive">
          Questa azione non può essere annullata.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
