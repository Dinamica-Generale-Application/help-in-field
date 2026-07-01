/**
 * DeleteReportDialog — confirmation dialog showing company name and date
 * before permanently deleting a report.
 * Uses Radix Dialog for focus trap, Escape key handling, and accessibility.
 */

import { Dialog, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
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
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogTitle>Elimina Rapporto</DialogTitle>

      <DialogDescription>
        Sei sicuro di voler eliminare il rapporto per{' '}
        <span className="font-medium text-foreground">{companyName}</span> del{' '}
        <span className="font-medium text-foreground">
          {formatDate(interventionDate)}
        </span>
        ?
      </DialogDescription>

      <p className="mt-2 text-sm text-destructive">
        Questa azione non può essere annullata.
      </p>

      <DialogFooter>
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
      </DialogFooter>
    </Dialog>
  );
}
