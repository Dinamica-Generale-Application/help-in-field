/**
 * ReportDetailRoute — loads a report from the store via URL param ID
 * and renders the ReportDetail component.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '../stores/reportStore';
import { ReportDetail } from '../components/ReportDetail';

export function ReportDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = useReportStore((s) => s.getReportById(id ?? ''));

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-foreground">
          Rapporto non trovato
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Il rapporto richiesto non esiste o è stato eliminato.
        </p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  return <ReportDetail report={report} />;
}
