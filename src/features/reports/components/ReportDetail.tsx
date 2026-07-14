/**
 * ReportDetail — read-only view of a report organized by sections.
 * Sections: client info, intervention details, devices, costs, attachments.
 * Actions: Edit, Export PDF, Delete.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, FileDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/utils/format';
import { useReportStore } from '../stores/reportStore';
import { useSettingsStore } from '@/features/settings/stores/settingsStore';
import { generatePdfFilename } from '../utils/pdf-export';
import { buildPdfData } from '../utils/pdf-data';
import { getLogoDataUrl } from '../utils/logo';
import { generateAndDownloadPdf } from '@/lib/html2pdf';
import { DeleteReportDialog } from './DeleteReportDialog';
import type { Report } from '../types';

interface ReportDetailProps {
  report: Report;
}

function formatInterventionReason(reason: string | undefined): string {
  switch (reason) {
    case 'installation': return 'Installazione';
    case 'supervision': return 'Supervisione';
    case 'malfunction': return 'Malfunzionamento';
    case 'other': return 'Altro';
    default: return '';
  }
}

function formatWarranty(warranty: string | undefined): string {
  switch (warranty) {
    case 'in_warranty': return 'In Garanzia';
    case 'out_warranty': return 'Non in Garanzia';
    default: return 'Non specificato';
  }
}

export function ReportDetail({ report }: ReportDetailProps) {
  const navigate = useNavigate();
  const deleteReport = useReportStore((s) => s.deleteReport);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isDraft = report.status === 'draft';

  async function handleExportPdf() {
    setPdfLoading(true);
    try {
      const operatorCode = useSettingsStore.getState().operatorCode;
      const logoDataUrl = await getLogoDataUrl();
      const filename = generatePdfFilename(report);
      const pdfData = buildPdfData(report, operatorCode, logoDataUrl || undefined);
      await generateAndDownloadPdf('', filename, pdfData);
    } catch {
      window.print();
    } finally {
      setPdfLoading(false);
    }
  }

  function handleDelete() {
    deleteReport(report.id);
    navigate('/', { replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {report.companyName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(report.interventionDate)}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium',
            isDraft
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          )}
        >
          {isDraft ? 'Bozza' : 'Completato'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(`/reports/${report.id}/edit`)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifica
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={pdfLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px] disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {pdfLoading ? 'Generazione…' : 'Esporta PDF'}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Elimina
        </button>
      </div>

      {/* Client Info */}
      <Section title="Dati Cliente">
        <Field label="Ragione Sociale" value={report.companyName} />
        {report.address && <Field label="Indirizzo" value={report.address} />}
        {report.phone && <Field label="Telefono" value={report.phone} />}
      </Section>

      {/* Intervention Details */}
      <Section title="Dettagli Intervento">
        <Field label="Data" value={formatDate(report.interventionDate)} />
        <Field label="Operatore" value={report.operator} />
        {report.interventionLocation && (
          <Field label="Luogo" value={report.interventionLocation} />
        )}
        {report.requestedBy && (
          <Field label="Richiesto da" value={report.requestedBy} />
        )}
        {report.onBehalfOf && (
          <Field label="Per conto di" value={report.onBehalfOf} />
        )}
        {report.interventionReason && (
          <Field label="Motivo" value={formatInterventionReason(report.interventionReason)} />
        )}
        <Field label="Descrizione" value={report.description} />
        {report.notes && <Field label="Note" value={report.notes} />}
      </Section>

      {/* Devices */}
      {report.devices.length > 0 && (
        <Section title="Dispositivi">
          <div className="space-y-3">
            {report.devices.map((device, i) => (
              <div
                key={device.id}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <p className="mb-1 text-sm font-medium text-foreground">
                  Dispositivo {i + 1}
                </p>
                {device.model && <Field label="Modello" value={device.model} />}
                {device.serialNumber && (
                  <Field label="N. Serie" value={device.serialNumber} />
                )}
                {device.productionYear && (
                  <Field label="Anno" value={device.productionYear} />
                )}
                {device.warranty && (
                  <Field label="Garanzia" value={formatWarranty(device.warranty)} />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Costs */}
      <Section title="Costi">
        <div className="space-y-1">
          <CostRow label="Ore lavorate" detail={`${report.hoursWorked} ore`} value={report.hourlyTotal} />
          <CostRow label="Chilometri" detail={`${report.kilometers ?? 0} km`} value={report.kilometerTotal} />
          {report.otherExpenses != null && report.otherExpenses > 0 && (
            <CostRow label="Altro" value={report.otherExpenses} />
          )}
          <div className="border-t border-border pt-2 mt-2">
            <CostRow label="Totale" value={report.grandTotal} bold />
          </div>
        </div>
      </Section>

      {/* Attachments */}
      {report.attachments.length > 0 && (
        <Section title="Allegati">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.attachments.map((att) => (
              <div key={att.id} className="overflow-hidden rounded-md border border-border">
                <img
                  src={att.dataUrl}
                  alt={att.description || 'Allegato'}
                  className="aspect-square w-full object-cover"
                />
                {att.description && (
                  <p className="p-2 text-xs text-muted-foreground truncate">
                    {att.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Delete Dialog */}
      <DeleteReportDialog
        open={showDeleteDialog}
        companyName={report.companyName}
        interventionDate={report.interventionDate}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

// --- Sub-components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1 sm:flex-row sm:gap-3">
      <span className="text-sm font-medium text-muted-foreground min-w-[140px]">
        {label}
      </span>
      <span className="text-sm text-foreground whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function CostRow({
  label,
  detail,
  value,
  bold,
}: {
  label: string;
  detail?: string;
  value: number | undefined | null;
  bold?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between text-sm', bold && 'font-semibold text-base')}>
      <div className="flex items-center gap-2">
        <span className={bold ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        {detail && <span className="text-xs text-muted-foreground">({detail})</span>}
      </div>
      <span className="text-foreground">{formatCurrency(value ?? 0)}</span>
    </div>
  );
}
