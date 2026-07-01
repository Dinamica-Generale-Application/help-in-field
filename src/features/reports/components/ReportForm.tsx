import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Check, RotateCcw, Save } from 'lucide-react';
import type {
  Attachment,
  Device,
  InterventionReason,
  PaymentStatus,
  Report,
  ReportFormData,
} from '../types';
import { useReportStore } from '../stores/reportStore';
import { useSettingsStore } from '@/features/settings/stores/settingsStore';
import { useCostCalculation } from '../hooks/useCostCalculation';
import { validateField, validateReport, type ValidationError } from '../utils/validation';
import { CostSummary } from './CostSummary';
import { DeviceSection } from './DeviceSection';
import { AttachmentSection } from './AttachmentSection';
import { SpeechButton } from './SpeechButton';
import { GpsButton, type GpsResult } from './GpsButton';
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { generateId } from '@/utils/generate-id';
import { parseItalianNumber } from '@/utils/format';

interface ReportFormProps {
  reportId?: string;
}

/**
 * Form completo per creazione/modifica rapporto.
 * Auto-save debounced 1s, validazione inline on-blur,
 * dialog "modifiche non salvate" su navigazione.
 */
export function ReportForm({ reportId }: ReportFormProps) {
  const navigate = useNavigate();
  const { addReport, updateReport, getReportById } = useReportStore();
  const operatorCode = useSettingsStore((s) => s.operatorCode);

  // Load existing report or create defaults
  const existingReport = reportId ? getReportById(reportId) : undefined;
  const isEditMode = !!existingReport;

  const [formId] = useState(() => existingReport?.id || generateId());

  // Form state
  const [companyName, setCompanyName] = useState(existingReport?.companyName || '');
  const [address, setAddress] = useState(existingReport?.address || '');
  const [phone, setPhone] = useState(existingReport?.phone || '');
  const [interventionDate, setInterventionDate] = useState(
    existingReport?.interventionDate || new Date().toISOString().split('T')[0]!,
  );
  const [operator, setOperator] = useState(existingReport?.operator || operatorCode || '');
  const [interventionLocation, setInterventionLocation] = useState(
    existingReport?.interventionLocation || '',
  );
  const [interventionLat, setInterventionLat] = useState<number | undefined>(
    existingReport?.interventionLat,
  );
  const [interventionLon, setInterventionLon] = useState<number | undefined>(
    existingReport?.interventionLon,
  );
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [requestedBy, setRequestedBy] = useState(existingReport?.requestedBy || '');
  const [onBehalfOf, setOnBehalfOf] = useState(existingReport?.onBehalfOf || '');
  const [interventionReason, setInterventionReason] = useState<InterventionReason | ''>(
    existingReport?.interventionReason || '',
  );
  const [description, setDescription] = useState(existingReport?.description || '');
  const [devices, setDevices] = useState<Device[]>(existingReport?.devices || []);
  const [hoursWorkedStr, setHoursWorkedStr] = useState(
    existingReport?.hoursWorked ? String(existingReport.hoursWorked) : '',
  );
  const [kilometersStr, setKilometersStr] = useState(
    existingReport?.kilometers !== undefined ? String(existingReport.kilometers) : '',
  );
  const [discountPercentStr, setDiscountPercentStr] = useState(
    existingReport?.discountPercent ? String(existingReport.discountPercent) : '',
  );
  const [payment, setPayment] = useState<PaymentStatus | ''>(existingReport?.payment || '');
  const [notes, setNotes] = useState(existingReport?.notes || '');
  const [attachments, setAttachments] = useState<Attachment[]>(
    existingReport?.attachments || [],
  );
  const [status, setStatus] = useState(existingReport?.status || 'draft');

  // Speech-to-text interim state
  const [speechInterimText, setSpeechInterimText] = useState('');

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completionErrors, setCompletionErrors] = useState<ValidationError[]>([]);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>('');

  // Parse numeric fields
  const hoursWorked = useMemo(() => parseItalianNumber(hoursWorkedStr), [hoursWorkedStr]);
  const kilometers = useMemo(() => parseItalianNumber(kilometersStr), [kilometersStr]);
  const discountPercent = useMemo(() => parseItalianNumber(discountPercentStr), [discountPercentStr]);

  // Cost calculation
  const costBreakdown = useCostCalculation(
    isNaN(hoursWorked) ? 0 : hoursWorked,
    isNaN(kilometers) ? 0 : kilometers,
    isNaN(discountPercent) ? 0 : discountPercent,
  );

  // Build form data
  const buildFormData = useCallback((): ReportFormData => {
    const hours = isNaN(hoursWorked) ? 0 : hoursWorked;
    const km = isNaN(kilometers) ? undefined : kilometers;
    const discount = isNaN(discountPercent) ? 0 : discountPercent;

    return {
      status,
      companyName: companyName.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      interventionDate,
      operator: operator.trim(),
      interventionLocation: interventionLocation.trim() || undefined,
      interventionLat,
      interventionLon,
      requestedBy: requestedBy.trim() || undefined,
      onBehalfOf: onBehalfOf.trim() || undefined,
      interventionReason: interventionReason || undefined,
      description: description.trim(),
      devices,
      hoursWorked: hours,
      kilometers: km,
      discountPercent: discount,
      payment: payment || undefined,
      notes: notes.trim() || undefined,
      attachments,
      // Cost fields
      hourlyTotal: costBreakdown?.hourlyTotal,
      kilometerTotal: costBreakdown?.kilometerTotal,
      subtotal: costBreakdown?.subtotal,
      discountAmount: costBreakdown?.discountAmount,
      taxableAmount: costBreakdown?.taxableAmount,
      vatAmount: costBreakdown?.vatAmount,
      grandTotal: costBreakdown?.grandTotal,
    };
  }, [
    status, companyName, address, phone, interventionDate, operator,
    interventionLocation, interventionLat, interventionLon,
    requestedBy, onBehalfOf, interventionReason,
    description, devices, hoursWorked, kilometers, discountPercent,
    payment, notes, attachments, costBreakdown,
  ]);

  // --- Auto-save (debounced 1s) ---
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createdAt = existingReport?.createdAt;

  const saveReport = useCallback(() => {
    const formData = buildFormData();
    const now = new Date().toISOString();

    if (isEditMode) {
      updateReport(formId, { ...formData, updatedAt: now });
    } else {
      const report: Report = {
        ...formData,
        id: formId,
        createdAt: createdAt || now,
        updatedAt: now,
      };
      // Try to add; if already exists (auto-save race), update instead
      const added = addReport(report);
      if (!added) {
        updateReport(formId, { ...formData, updatedAt: now });
      }
    }

    lastSavedRef.current = now;
    setIsDirty(false);
  }, [buildFormData, formId, isEditMode, createdAt, addReport, updateReport]);

  // Trigger auto-save on form changes
  useEffect(() => {
    if (!isDirty) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveReport();
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, saveReport]);

  // Mark dirty on any field change
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setCompletionErrors([]);
  }, []);

  // Handler to append dictated text to description (does not overwrite)
  const handleSpeechResult = useCallback((text: string) => {
    setDescription((prev) => {
      const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
      return prev + separator + text;
    });
    setIsDirty(true);
    setCompletionErrors([]);
  }, []);

  // Handler for GPS result — pre-fill location and km
  const handleGpsResult = useCallback((result: GpsResult) => {
    setInterventionLat(result.latitude);
    setInterventionLon(result.longitude);

    // Pre-fill intervention location with reverse-geocoded address
    if (result.address) {
      setInterventionLocation(result.address);
    }

    // Pre-fill kilometers if calculated (home coordinates were configured)
    if (result.kilometers !== null) {
      setKilometersStr(String(result.kilometers));
      setGpsMessage(null);
    } else {
      // Home not configured — inform user
      setGpsMessage('Sede non configurata, inserisci km manualmente.');
    }

    markDirty();
  }, [markDirty]);

  // --- Navigation blocking ---
  const blocker = useBlocker(isDirty);

  // --- Inline validation on blur ---
  const handleBlur = useCallback(
    (field: string, value: unknown) => {
      const error = validateField(field, value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[field] = error.message;
        } else {
          delete next[field];
        }
        return next;
      });
    },
    [],
  );

  // --- Actions ---
  const handleSaveDraft = useCallback(() => {
    setStatus('draft');
    // Force immediate save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setTimeout(() => saveReport(), 0);
    navigate('/');
  }, [saveReport, navigate]);

  const handleComplete = useCallback(() => {
    const formData = buildFormData();
    const result = validateReport(formData);

    if (!result.isValid) {
      setCompletionErrors(result.errors);
      // Also set field errors for highlighting
      const newErrors: Record<string, string> = {};
      for (const err of result.errors) {
        newErrors[err.field] = err.message;
      }
      setFieldErrors(newErrors);
      return;
    }

    setStatus('completed');
    setCompletionErrors([]);
    // Save with completed status
    const now = new Date().toISOString();
    const completedData = { ...formData, status: 'completed' as const };
    if (isEditMode) {
      updateReport(formId, { ...completedData, updatedAt: now });
    } else {
      const report: Report = {
        ...completedData,
        id: formId,
        createdAt: createdAt || now,
        updatedAt: now,
      };
      const added = addReport(report);
      if (!added) {
        updateReport(formId, { ...completedData, updatedAt: now });
      }
    }
    setIsDirty(false);
    navigate('/');
  }, [buildFormData, formId, isEditMode, createdAt, addReport, updateReport, navigate]);

  const handleReopen = useCallback(() => {
    setStatus('draft');
    const now = new Date().toISOString();
    updateReport(formId, { status: 'draft', updatedAt: now });
    setIsDirty(false);
  }, [formId, updateReport]);

  // Error helper
  const fieldError = (field: string) => fieldErrors[field];
  const inputClasses = (field: string) =>
    `w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 ${
      fieldError(field)
        ? 'border-destructive focus-visible:outline-destructive'
        : 'border-input focus-visible:outline-ring'
    }`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {isEditMode ? 'Modifica Rapporto' : 'Nuovo Rapporto'}
        </h1>
        {status === 'completed' && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Completato
          </span>
        )}
      </div>

      {/* Completion errors summary */}
      {completionErrors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive mb-1">
            Completa i campi obbligatori:
          </p>
          <ul className="list-disc list-inside text-sm text-destructive/80">
            {completionErrors.map((err) => (
              <li key={err.field}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dati cliente */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Dati Cliente
        </h2>

        <div className="space-y-1">
          <label htmlFor="companyName" className="text-sm font-medium">
            Ragione Sociale <span className="text-destructive">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => { setCompanyName(e.target.value); markDirty(); }}
            onBlur={() => handleBlur('companyName', companyName)}
            className={inputClasses('companyName')}
            placeholder="Nome azienda cliente"
          />
          {fieldError('companyName') && (
            <p className="text-xs text-destructive">{fieldError('companyName')}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="address" className="text-sm font-medium">
              Indirizzo sede intervento
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); markDirty(); }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Indirizzo aziendale"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Telefono azienda
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); markDirty(); }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Numero fisso/centralino"
            />
          </div>
        </div>
      </section>

      {/* Dettagli intervento */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Dettagli Intervento
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="interventionDate" className="text-sm font-medium">
              Data intervento <span className="text-destructive">*</span>
            </label>
            <input
              id="interventionDate"
              type="date"
              value={interventionDate}
              onChange={(e) => { setInterventionDate(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('interventionDate', interventionDate)}
              className={inputClasses('interventionDate')}
            />
            {fieldError('interventionDate') && (
              <p className="text-xs text-destructive">{fieldError('interventionDate')}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="operator" className="text-sm font-medium">
              Operatore <span className="text-destructive">*</span>
            </label>
            <input
              id="operator"
              type="text"
              value={operator}
              onChange={(e) => { setOperator(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('operator', operator)}
              className={inputClasses('operator')}
              placeholder="Sigla operatore (es. OP1)"
            />
            {fieldError('operator') && (
              <p className="text-xs text-destructive">{fieldError('operator')}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="interventionLocation" className="text-sm font-medium">
              Luogo intervento
            </label>
            <div className="flex items-center gap-2">
              <input
                id="interventionLocation"
                type="text"
                value={interventionLocation}
                onChange={(e) => { setInterventionLocation(e.target.value); markDirty(); }}
                className="flex-1 rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                placeholder="Indirizzo o descrizione sito"
              />
              <GpsButton onResult={handleGpsResult} />
            </div>
            {gpsMessage && (
              <p className="text-xs text-amber-600" aria-live="polite">
                {gpsMessage}
              </p>
            )}
            {interventionLat != null && interventionLon != null && (
              <p className="text-xs text-muted-foreground">
                Coordinate: {interventionLat.toFixed(5)}, {interventionLon.toFixed(5)}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="requestedBy" className="text-sm font-medium">
              Richiesto da
            </label>
            <input
              id="requestedBy"
              type="text"
              value={requestedBy}
              onChange={(e) => { setRequestedBy(e.target.value); markDirty(); }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Ruolo/reparto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="onBehalfOf" className="text-sm font-medium">
              Per conto di
            </label>
            <input
              id="onBehalfOf"
              type="text"
              value={onBehalfOf}
              onChange={(e) => { setOnBehalfOf(e.target.value); markDirty(); }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Azienda committente"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="interventionReason" className="text-sm font-medium">
              Motivo intervento
            </label>
            <select
              id="interventionReason"
              value={interventionReason}
              onChange={(e) => { setInterventionReason(e.target.value as InterventionReason | ''); markDirty(); }}
              className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <option value="">— Seleziona —</option>
              <option value="installation">Installazione</option>
              <option value="supervision">Supervisione</option>
              <option value="malfunction">Malfunzionamento</option>
              <option value="other">Altro</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            Descrizione <span className="text-destructive">*</span>
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('description', description)}
              className={`${inputClasses('description')} min-h-[100px] resize-y flex-1`}
              placeholder="Descrizione intervento"
              rows={4}
            />
            <SpeechButton
              onResult={handleSpeechResult}
              onInterimChange={setSpeechInterimText}
            />
          </div>
          {fieldError('description') && (
            <p className="text-xs text-destructive">{fieldError('description')}</p>
          )}
          {/* Interim speech results — real-time grey text */}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {speechInterimText && (
              <p className="text-sm text-muted-foreground italic">
                {speechInterimText}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Dispositivi */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Dispositivi
        </h2>
        <DeviceSection
          devices={devices}
          onChange={(newDevices) => { setDevices(newDevices); markDirty(); }}
        />
      </section>

      {/* Costi */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ore e Costi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="hoursWorked" className="text-sm font-medium">
              Ore lavorate <span className="text-destructive">*</span>
            </label>
            <input
              id="hoursWorked"
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hoursWorkedStr}
              onChange={(e) => { setHoursWorkedStr(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('hoursWorked', hoursWorked)}
              className={inputClasses('hoursWorked')}
              placeholder="0,25 – 24"
            />
            {fieldError('hoursWorked') && (
              <p className="text-xs text-destructive">{fieldError('hoursWorked')}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="kilometers" className="text-sm font-medium">
              Chilometri
            </label>
            <input
              id="kilometers"
              type="number"
              min="0"
              max="9999"
              value={kilometersStr}
              onChange={(e) => { setKilometersStr(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('kilometers', kilometers)}
              className={inputClasses('kilometers')}
              placeholder="0 – 9999"
            />
            {fieldError('kilometers') && (
              <p className="text-xs text-destructive">{fieldError('kilometers')}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="discountPercent" className="text-sm font-medium">
              Sconto %
            </label>
            <input
              id="discountPercent"
              type="number"
              min="0"
              max="100"
              value={discountPercentStr}
              onChange={(e) => { setDiscountPercentStr(e.target.value); markDirty(); }}
              onBlur={() => handleBlur('discountPercent', discountPercent)}
              className={inputClasses('discountPercent')}
              placeholder="0 – 100"
            />
            {fieldError('discountPercent') && (
              <p className="text-xs text-destructive">{fieldError('discountPercent')}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="payment" className="text-sm font-medium">
            Stato pagamento
          </label>
          <select
            id="payment"
            value={payment}
            onChange={(e) => { setPayment(e.target.value as PaymentStatus | ''); markDirty(); }}
            className="w-full sm:w-auto rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">— Non specificato —</option>
            <option value="paid">Pagato</option>
            <option value="unpaid">Non pagato</option>
          </select>
        </div>

        {/* Cost breakdown */}
        <CostSummary breakdown={costBreakdown} />
      </section>

      {/* Note */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Note
        </h2>
        <div className="space-y-1">
          <label htmlFor="notes" className="sr-only">Note aggiuntive</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); markDirty(); }}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[80px] resize-y"
            placeholder="Note aggiuntive…"
            rows={3}
          />
        </div>
      </section>

      {/* Allegati */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Allegati
        </h2>
        <AttachmentSection
          attachments={attachments}
          onChange={(newAttachments) => { setAttachments(newAttachments); markDirty(); }}
        />
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="inline-flex items-center gap-2 rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[44px]"
        >
          <Save className="h-4 w-4" />
          Salva Bozza
        </button>

        {status !== 'completed' && (
          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[44px]"
          >
            <Check className="h-4 w-4" />
            Completa Rapporto
          </button>
        )}

        {status === 'completed' && (
          <button
            type="button"
            onClick={handleReopen}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4" />
            Riapri
          </button>
        )}
      </div>

      {/* Navigation blocker dialog */}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => { if (!open) blocker.reset?.(); }}
      >
        <DialogTitle>Modifiche non salvate</DialogTitle>
        <DialogDescription>
          Hai modifiche non salvate. Vuoi davvero uscire? Le modifiche verranno perse.
        </DialogDescription>
        <DialogFooter>
          <button
            type="button"
            onClick={() => blocker.reset?.()}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[44px]"
          >
            Resta
          </button>
          <button
            type="button"
            onClick={() => blocker.proceed?.()}
            className="rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-h-[44px]"
          >
            Esci
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
