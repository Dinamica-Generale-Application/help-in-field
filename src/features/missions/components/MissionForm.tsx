/**
 * MissionForm — form per creare una missione da condividere con il gruppo service.
 * Il responsabile inserisce: destinazione, prodotto, motivo, rischio caldo, note.
 * Genera un file JSON scaricabile e condivisibile via WhatsApp.
 */

import { useState, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import type { HeatRiskLevel, InterventionReason } from '@/features/reports/types';

export function MissionForm() {
  const [destination, setDestination] = useState('');
  const [product, setProduct] = useState('');
  const [interventionReason, setInterventionReason] = useState<InterventionReason | ''>('');
  const [heatRisk, setHeatRisk] = useState<HeatRiskLevel | ''>('');
  const [operator1, setOperator1] = useState('');
  const [operator2, setOperator2] = useState('');
  const [notes, setNotes] = useState('');
  const [exported, setExported] = useState(false);

  const handleExport = useCallback(async () => {
    if (!destination.trim() || !product.trim() || !interventionReason) {
      alert('Compila destinazione, prodotto e motivo intervento.');
      return;
    }

    // Build mission link with URL parameters
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/missions\/?$/, '');
    const params = new URLSearchParams();
    params.set('dest', destination.trim());
    params.set('product', product.trim());
    params.set('reason', interventionReason);
    if (heatRisk) params.set('risk', heatRisk);
    if (operator1.trim()) params.set('op1', operator1.trim());
    if (operator2.trim()) params.set('op2', operator2.trim());
    if (notes.trim()) params.set('notes', notes.trim());
    const missionLink = `${baseUrl}/missions/import?${params.toString()}`;

    // Build WhatsApp message with link
    const riskText = heatRisk ? `\n🌡️ Rischio caldo: ${formatHeatRiskText(heatRisk)}` : '';
    const opsText = [operator1.trim(), operator2.trim()].filter(Boolean).join(', ');
    const opsLine = opsText ? `\n👷 Operatori: ${opsText}` : '';
    const message = `📋 *MISSIONE INTERVENTO*\n\n📍 Destinazione: ${destination}\n🔧 Prodotto: ${product}\n📌 Motivo: ${formatReason(interventionReason)}${riskText}${opsLine}${notes ? `\n📝 Note: ${notes}` : ''}\n\n👉 Apri per importare:\n${missionLink}`;

    // Try Web Share API (text + URL)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Missione: ${destination}`,
          text: message,
          url: missionLink,
        });
        setExported(true);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: open WhatsApp web link
    const waText = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
    setExported(true);
  }, [destination, product, interventionReason, heatRisk, notes]);

  const handleReset = useCallback(() => {
    setDestination('');
    setProduct('');
    setInterventionReason('');
    setHeatRisk('');
    setNotes('');
    setExported(false);
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nuova Missione</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un ordine di intervento da condividere con il gruppo service.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="destination" className="text-sm font-medium">
            Destinazione (comune) <span className="text-destructive">*</span>
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            placeholder="Es. Poggio Rusco, Mantova"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="product" className="text-sm font-medium">
            Prodotto
          </label>
          <input
            id="product"
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            placeholder="Modello/tipo macchina"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="missionReason" className="text-sm font-medium">
            Motivo intervento
          </label>
          <select
            id="missionReason"
            value={interventionReason}
            onChange={(e) => setInterventionReason(e.target.value as InterventionReason | '')}
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">— Seleziona —</option>
            <option value="installation">Installazione</option>
            <option value="supervision">Supervisione</option>
            <option value="malfunction">Malfunzionamento</option>
            <option value="other">Altro</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="missionHeatRisk" className="text-sm font-medium">
            Rischio caldo <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              id="missionHeatRisk"
              value={heatRisk}
              onChange={(e) => setHeatRisk(e.target.value as HeatRiskLevel | '')}
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <option value="">— Non valutato —</option>
              <option value="none">🟢 Nessuno</option>
              <option value="low">🟡 Basso</option>
              <option value="moderate">🟠 Moderato</option>
              <option value="high">🔴 Alto</option>
            </select>
            <a
              href="https://www.worklimate.it/scelta-mappa/sole-attivita-fisica-moderata/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent min-h-[44px] whitespace-nowrap"
            >
              🌡️ Worklimate
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="missionOp1" className="text-sm font-medium">
              Operatore 1
            </label>
            <input
              id="missionOp1"
              type="text"
              value={operator1}
              onChange={(e) => setOperator1(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Sigla operatore 1"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="missionOp2" className="text-sm font-medium">
              Operatore 2
            </label>
            <input
              id="missionOp2"
              type="text"
              value={operator2}
              onChange={(e) => setOperator2(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              placeholder="Sigla operatore 2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="missionNotes" className="text-sm font-medium">
            Note
          </label>
          <textarea
            id="missionNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[80px] resize-y"
            placeholder="Indicazioni aggiuntive per l'operatore…"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 min-h-[44px]"
        >
          <Share2 className="h-4 w-4" />
          Condividi Missione
        </button>

        {exported && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent min-h-[44px]"
          >
            Nuova Missione
          </button>
        )}
      </div>

      {exported && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            ✅ Missione generata! Condividila via WhatsApp con il gruppo service.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function formatReason(reason: string): string {
  switch (reason) {
    case 'installation': return 'Installazione';
    case 'supervision': return 'Supervisione';
    case 'malfunction': return 'Malfunzionamento';
    case 'other': return 'Altro';
    default: return '';
  }
}

function formatHeatRiskText(level: string): string {
  switch (level) {
    case 'none': return '🟢 Nessuno';
    case 'low': return '🟡 Basso';
    case 'moderate': return '🟠 Moderato';
    case 'high': return '🔴 Alto';
    default: return '';
  }
}
