/**
 * ClientValidationView — Simplified view for client to review and sign off on a report.
 * Shows: client name, date, work performed (description).
 * Client can add notes and sign.
 */

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { formatDate } from '@/utils/format';
import type { Report, ClientValidation } from '../types';

interface ClientValidationViewProps {
  report: Report;
  onValidate: (validation: ClientValidation) => void;
  onCancel: () => void;
}

function formatProblemFound(problem: string | undefined): string {
  switch (problem) {
    case 'installazione': return 'Installazione';
    case 'regolazione_selezionatori': return 'Regolazione selezionatori';
    case 'regolazione_nastri_pneumatica': return 'Regolazione nastri e pneumatica';
    case 'guasto_elettrico': return 'Guasto elettrico';
    case 'guasto_meccanico': return 'Guasto meccanico';
    case 'verifica_pesatura': return 'Verifica sistema di pesatura';
    case 'verifica_cloud': return 'Verifica cloud';
    case 'altro': return 'Altro';
    default: return problem || '';
  }
}

export function ClientValidationView({ report, onValidate, onCancel }: ClientValidationViewProps) {
  const [signerRole, setSignerRole] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    // Validate required fields
    if (!signerRole.trim()) {
      setError('Inserire nome o ruolo di chi firma');
      return;
    }
    if (!signatureDataUrl) {
      setError('Firma richiesta per la validazione');
      return;
    }

    const validation: ClientValidation = {
      signatureDataUrl,
      signerRole: signerRole.trim(),
      clientNotes: clientNotes.trim() || undefined,
      validatedAt: new Date().toISOString(),
    };

    onValidate(validation);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Validazione Intervento
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Verifica i dati e firma per confermare
          </p>
        </div>

        {/* Report Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Riepilogo Intervento
          </h2>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Cliente</span>
              <p className="text-base text-gray-900">{report.companyName}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-500">Data intervento</span>
              <p className="text-base text-gray-900">{formatDate(report.interventionDate)}</p>
            </div>

            {report.problemFound && (
              <div>
                <span className="text-sm font-medium text-gray-500">Problema riscontrato</span>
                <p className="text-base text-gray-900">{formatProblemFound(report.problemFound)}</p>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-gray-500">Lavoro svolto</span>
              <p className="text-base text-gray-900 whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>
        </div>

        {/* Client Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Note del Cliente
          </h2>
          <textarea
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[80px]"
            placeholder="Aggiungi eventuali osservazioni..."
            rows={3}
          />
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Firma del Cliente
          </h2>

          <div className="space-y-1">
            <label htmlFor="signerRole" className="text-sm font-medium text-gray-700">
              Nome o ruolo <span className="text-red-500">*</span>
            </label>
            <input
              id="signerRole"
              type="text"
              value={signerRole}
              onChange={(e) => { setSignerRole(e.target.value); setError(''); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es. Resp. Produzione, Mario Rossi"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Firma <span className="text-red-500">*</span>
            </label>
            <SignatureCanvas
              onChange={(dataUrl) => { setSignatureDataUrl(dataUrl); setError(''); }}
              width={Math.min(380, window.innerWidth - 64)}
              height={180}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            Conferma
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-500">
          Con la firma confermi di aver preso visione dell'intervento effettuato.
        </p>
      </div>
    </div>
  );
}
