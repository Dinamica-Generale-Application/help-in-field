/**
 * MissionImportRoute — auto-imports a mission from URL parameters.
 * When an operator clicks the mission link received via WhatsApp,
 * this page reads the params, creates a pre-filled report, and redirects to home.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '@/features/reports/stores/reportStore';
import { generateId } from '@/utils/generate-id';
import type { Report, InterventionReason, HeatRiskLevel } from '@/features/reports/types';

export function MissionImportRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addReport = useReportStore((s) => s.addReport);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    const dest = searchParams.get('dest');
    const product = searchParams.get('product');
    const reason = (searchParams.get('reason') as InterventionReason) || undefined;

    if (!dest) {
      setStatus('error');
      return;
    }

    // Prevent duplicates: check if we already imported this exact mission
    const importKey = `mission_imported_${searchParams.toString()}`;
    if (sessionStorage.getItem(importKey)) {
      navigate('/', { replace: true });
      return;
    }
    sessionStorage.setItem(importKey, '1');

    const heatRisk = (searchParams.get('risk') as HeatRiskLevel) || undefined;
    const notes = searchParams.get('notes') || '';
    const op1 = searchParams.get('op1') || '';
    const op2 = searchParams.get('op2') || '';

    // Build description with notes + operator info
    const descParts: string[] = [];
    if (notes) descParts.push(notes);
    if (op1) descParts.push(`Operatore 1: ${op1}`);

    const now = new Date().toISOString();
    const report: Report = {
      id: generateId(),
      status: 'mission',
      companyName: '',
      interventionDate: now.split('T')[0]!,
      operator: op2,
      interventionLocation: dest,
      interventionReason: reason,
      heatRisk,
      description: descParts.join('\n'),
      devices: product ? [{ id: generateId(), model: product }] : [],
      hoursWorked: 0,
      discountPercent: 0,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    addReport(report);
    setStatus('done');
    navigate('/', { replace: true });
  }, [searchParams, addReport, navigate]);

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-destructive">Link missione non valido</p>
          <p className="text-sm text-muted-foreground">Il link non contiene i dati necessari.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Importazione missione…</p>
    </div>
  );
}
