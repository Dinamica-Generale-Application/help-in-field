/**
 * MissionImport — allows operators to import a mission file (.json)
 * received via WhatsApp and pre-fill a new report.
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { useReportStore } from '@/features/reports/stores/reportStore';
import { generateId } from '@/utils/generate-id';
import type { MissionExport } from '../types';
import type { Report } from '@/features/reports/types';
import { useSettingsStore } from '@/features/settings/stores/settingsStore';

export function MissionImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const addReport = useReportStore((s) => s.addReport);
  const operatorCode = useSettingsStore((s) => s.operatorCode);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const file = files[0]!;
    try {
      const text = await file.text();
      const data: MissionExport = JSON.parse(text);

      if (data.type !== 'mission' || !data.mission) {
        setError('File non valido — non è un file missione.');
        return;
      }

      const mission = data.mission;

      // Create a new report pre-filled with mission data, marked as "mission"
      const now = new Date().toISOString();
      const report: Report = {
        id: generateId(),
        status: 'mission',
        companyName: '',
        interventionDate: now.split('T')[0]!,
        operator: '',
        interventionLocation: mission.destination,
        interventionReason: mission.interventionReason,
        heatRisk: mission.heatRisk,
        description: mission.notes || '',
        devices: mission.product ? [{ id: generateId(), model: mission.product }] : [],
        hoursWorked: 0,
        discountPercent: 0,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      };

      addReport(report);
      navigate('/');
    } catch {
      setError('Errore nella lettura del file. Assicurati sia un file missione valido (.json).');
    }
  }, [addReport, navigate, operatorCode]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent min-h-[44px]"
      >
        <FileUp className="h-4 w-4" />
        Importa Missione
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
        className="hidden"
        aria-label="Importa file missione"
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
