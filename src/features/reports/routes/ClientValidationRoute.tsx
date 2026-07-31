/**
 * ClientValidationRoute — Page for client to validate and sign a report.
 * URL: /reports/:id/validate
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '../stores/reportStore';
import { ClientValidationView } from '../components/ClientValidationView';
import type { ClientValidation } from '../types';

export function ClientValidationRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReportById, updateReport } = useReportStore();

  const report = id ? getReportById(id) : undefined;

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Report non trovato
          </h1>
          <p className="text-gray-600 mb-4">
            Il rapporto richiesto non esiste o è stato eliminato.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline"
          >
            Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  // Already validated
  if (report.clientValidation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-green-700 mb-2">
            ✓ Report già validato
          </h1>
          <p className="text-gray-600 mb-4">
            Questo rapporto è già stato firmato dal cliente.
          </p>
          <button
            onClick={() => navigate(`/reports/${id}`)}
            className="text-blue-600 hover:underline"
          >
            Visualizza report
          </button>
        </div>
      </div>
    );
  }

  const handleValidate = (validation: ClientValidation) => {
    const now = new Date().toISOString();
    updateReport(report.id, {
      status: 'validated',
      clientValidation: validation,
      updatedAt: now,
    });

    // Navigate to report detail
    navigate(`/reports/${id}`, { replace: true });
  };

  const handleCancel = () => {
    navigate(`/reports/${id}`);
  };

  return (
    <ClientValidationView
      report={report}
      onValidate={handleValidate}
      onCancel={handleCancel}
    />
  );
}
