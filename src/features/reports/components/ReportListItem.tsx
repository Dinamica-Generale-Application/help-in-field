/**
 * ReportListItem — row component for report list.
 * Shows company name, date, status chip (Bozza/Completato), and PDF button.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { generateHtmlTemplate, generatePdfFilename } from '../utils/pdf-export';
import { getLogoDataUrl } from '../utils/logo';
import { generateAndDownloadPdf } from '@/lib/html2pdf';
import { useSettingsStore } from '@/features/settings/stores/settingsStore';
import type { Report } from '../types';

interface ReportListItemProps {
  report: Report;
}

export function ReportListItem({ report }: ReportListItemProps) {
  const navigate = useNavigate();
  const [pdfLoading, setPdfLoading] = useState(false);

  const isDraft = report.status === 'draft';

  async function handleExportPdf(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setPdfLoading(true);
    try {
      const logoDataUrl = await getLogoDataUrl();
      const html = await generateHtmlTemplate(report, logoDataUrl, useSettingsStore.getState().operatorCode);
      const filename = generatePdfFilename(report);
      await generateAndDownloadPdf(html, filename);
    } catch {
      window.print();
    } finally {
      setPdfLoading(false);
    }
  }

  function handleRowClick(e: React.MouseEvent) {
    // Avoid navigating if user clicked the PDF button area
    const target = e.target as HTMLElement;
    if (target.closest('[data-pdf-button]')) return;
    navigate(`/reports/${report.id}`);
  }

  function handleRowKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/reports/${report.id}`);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors cursor-pointer',
        'hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'min-h-[44px]'
      )}
      aria-label={`Rapporto ${report.companyName}, ${formatDate(report.interventionDate)}, ${isDraft ? 'bozza' : 'completato'}`}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-foreground">
          {report.companyName}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatDate(report.interventionDate)}
        </p>
      </div>

      {/* Status chip */}
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          isDraft
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        )}
      >
        {isDraft ? 'Bozza' : 'Completato'}
      </span>

      {/* PDF button */}
      <button
        type="button"
        data-pdf-button
        onClick={handleExportPdf}
        disabled={pdfLoading}
        className={cn(
          'flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'min-h-[44px] min-w-[44px]',
          'disabled:opacity-50'
        )}
        aria-label={`Esporta PDF per ${report.companyName}`}
      >
        <FileText className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
