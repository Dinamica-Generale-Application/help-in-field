/**
 * PdfExportModule - Modulo Esportazione PDF
 *
 * Genera un file PDF dal rapporto di assistenza tecnica e attiva la condivisione nativa.
 * Utilizza expo-print per la generazione e expo-sharing per la condivisione.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Report, Attachment, Device } from '../types/report';
import { deviceRepository } from '../data/device-repository';

// --- Interfaces ---

export interface PdfExportResult {
  success: boolean;
  filePath: string | null;
  error: string | null;
}

export interface PdfExportModule {
  generatePdf(report: Report, attachments: Attachment[], devices?: Device[]): Promise<PdfExportResult>;
  sharePdf(filePath: string): Promise<void>;
}

// --- Helpers ---

/**
 * Formatta un numero come valuta EUR (es. "1.234,56 €").
 */
function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '0,00 €';
  return value.toFixed(2).replace('.', ',') + ' €';
}

/**
 * Formatta una data ISO in formato italiano GG/MM/AAAA.
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Mappa il codice motivo intervento alla label italiana.
 */
function formatInterventionReason(reason: string | undefined): string {
  switch (reason) {
    case 'installation': return 'Installazione';
    case 'supervision': return 'Supervisione';
    case 'malfunction': return 'Malfunzionamento';
    case 'other': return 'Altro';
    default: return '';
  }
}

/**
 * Mappa lo stato garanzia alla label italiana.
 */
function formatWarranty(warranty: string | undefined): string {
  switch (warranty) {
    case 'in_warranty': return 'In Garanzia';
    case 'out_warranty': return 'Non in Garanzia';
    default: return '';
  }
}

/**
 * Mappa lo stato pagamento alla label italiana.
 */
function formatPayment(payment: string | undefined): string {
  switch (payment) {
    case 'paid': return 'Pagato';
    case 'unpaid': return 'Non Pagato';
    default: return '';
  }
}

// --- HTML Template Generation ---

/**
 * Genera il template HTML completo per il PDF del rapporto.
 * Esportata per consentire il testing separato.
 */
export function generateHtmlTemplate(report: Report, attachments: Attachment[], devices?: Device[]): string {
  const images = attachments.filter(a => a.type === 'image');
  const videos = attachments.filter(a => a.type === 'video');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #333;
      padding: 20px;
      line-height: 1.5;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      margin-bottom: 20px;
      color: #1a1a1a;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
      padding: 5px 10px;
      background-color: #f0f0f0;
      border-left: 4px solid #333;
    }
    .field-row {
      display: flex;
      margin-bottom: 6px;
      padding: 2px 0;
    }
    .field-label {
      font-weight: bold;
      min-width: 180px;
      color: #555;
    }
    .field-value {
      flex: 1;
    }
    .cost-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .cost-table th, .cost-table td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .cost-table th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .cost-table .total-row {
      font-weight: bold;
      font-size: 13px;
      border-top: 2px solid #333;
    }
    .attachments-list {
      margin-top: 10px;
    }
    .attachment-item {
      width: 100%;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .attachment-item img {
      width: 100%;
      max-height: 380px;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .attachment-description {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
      font-style: italic;
    }
    .video-placeholder {
      width: 100%;
      height: 120px;
      background-color: #e0e0e0;
      border: 1px solid #ccc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .video-placeholder .icon {
      font-size: 32px;
      color: #666;
      margin-bottom: 5px;
    }
    .video-placeholder .label {
      font-size: 11px;
      color: #666;
    }
    .signature-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .signature-box {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    .signature-area {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 5px;
      font-size: 11px;
      color: #555;
    }
  </style>
</head>
<body>
  <h1>Rapporto di Assistenza Tecnica</h1>

  <!-- Sezione Dati Cliente -->
  <div class="section">
    <div class="section-title">Dati Cliente</div>
    <div class="field-row">
      <span class="field-label">Ragione Sociale:</span>
      <span class="field-value">${escapeHtml(report.companyName)}</span>
    </div>
    ${report.address ? `<div class="field-row">
      <span class="field-label">Indirizzo:</span>
      <span class="field-value">${escapeHtml(report.address)}</span>
    </div>` : ''}
    ${report.phone ? `<div class="field-row">
      <span class="field-label">Telefono:</span>
      <span class="field-value">${escapeHtml(report.phone)}</span>
    </div>` : ''}
  </div>

  <!-- Sezione Dettagli Intervento -->
  <div class="section">
    <div class="section-title">Dettagli Intervento</div>
    <div class="field-row">
      <span class="field-label">Data Intervento:</span>
      <span class="field-value">${formatDate(report.interventionDate)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Intervento eseguito da:</span>
      <span class="field-value">${escapeHtml(report.performedBy)}</span>
    </div>
    ${report.interventionLocation ? `<div class="field-row">
      <span class="field-label">Luogo Intervento:</span>
      <span class="field-value">${escapeHtml(report.interventionLocation)}</span>
    </div>` : ''}
    ${report.requestedBy ? `<div class="field-row">
      <span class="field-label">Richiesto da:</span>
      <span class="field-value">${escapeHtml(report.requestedBy)}</span>
    </div>` : ''}
    ${report.onBehalfOf ? `<div class="field-row">
      <span class="field-label">Per conto di:</span>
      <span class="field-value">${escapeHtml(report.onBehalfOf)}</span>
    </div>` : ''}
    ${report.interventionReason ? `<div class="field-row">
      <span class="field-label">Motivo Intervento:</span>
      <span class="field-value">${formatInterventionReason(report.interventionReason)}</span>
    </div>` : ''}
    <div class="field-row">
      <span class="field-label">Descrizione:</span>
      <span class="field-value">${escapeHtml(report.description)}</span>
    </div>
    ${report.model ? `<div class="field-row">
      <span class="field-label">Modello:</span>
      <span class="field-value">${escapeHtml(report.model)}</span>
    </div>` : ''}
    ${report.serialNumber ? `<div class="field-row">
      <span class="field-label">Numero di Serie:</span>
      <span class="field-value">${escapeHtml(report.serialNumber)}</span>
    </div>` : ''}
    ${report.productionYear ? `<div class="field-row">
      <span class="field-label">Anno di Produzione:</span>
      <span class="field-value">${escapeHtml(report.productionYear)}</span>
    </div>` : ''}
    ${report.warranty ? `<div class="field-row">
      <span class="field-label">Garanzia:</span>
      <span class="field-value">${formatWarranty(report.warranty)}</span>
    </div>` : ''}
    ${report.notes ? `<div class="field-row">
      <span class="field-label">Note:</span>
      <span class="field-value">${escapeHtml(report.notes)}</span>
    </div>` : ''}
  </div>

  ${(devices && devices.length > 0) ? `
  <div class="section">
    <div class="section-title">Dispositivi</div>
    ${devices.map((device, i) => `
      <div style="margin-bottom: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Dispositivo ${i + 1}</div>
        ${device.model ? `<div class="field-row"><span class="field-label">Modello:</span><span class="field-value">${escapeHtml(device.model)}</span></div>` : ''}
        ${device.serialNumber ? `<div class="field-row"><span class="field-label">N. Serie:</span><span class="field-value">${escapeHtml(device.serialNumber)}</span></div>` : ''}
        ${device.productionYear ? `<div class="field-row"><span class="field-label">Anno:</span><span class="field-value">${escapeHtml(device.productionYear)}</span></div>` : ''}
        ${device.warranty ? `<div class="field-row"><span class="field-label">Garanzia:</span><span class="field-value">${device.warranty === 'in_warranty' ? 'In Garanzia' : 'Non in Garanzia'}</span></div>` : ''}
      </div>
    `).join('')}
  </div>` : ''}

  <!-- Sezione Costi -->
  <div class="section">
    <div class="section-title">Costi</div>
    <table class="cost-table">
      <thead>
        <tr>
          <th>Voce</th>
          <th>Dettaglio</th>
          <th>Importo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ore lavorate</td>
          <td>${report.hoursWorked ?? 0} ore × 60,00 €/h</td>
          <td>${formatCurrency(report.hourlyTotal)}</td>
        </tr>
        <tr>
          <td>Chilometri</td>
          <td>${report.kilometers ?? 0} km × 0,90 €/km</td>
          <td>${formatCurrency(report.kilometerTotal)}</td>
        </tr>
        <tr>
          <td>Subtotale</td>
          <td></td>
          <td>${formatCurrency(report.subtotal)}</td>
        </tr>
        <tr class="total-row">
          <td>Totale Intervento</td>
          <td></td>
          <td>${formatCurrency(report.grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Sezione Allegati -->
  ${(images.length > 0 || videos.length > 0) ? `
  <div class="section">
    <div class="section-title">Allegati</div>
    <div class="attachments-list">
      ${images.map(img => `
        <div class="attachment-item">
          <img src="${escapeHtml(img.filePath)}" alt="${escapeHtml(img.description || img.fileName)}" />
          ${img.description ? `<div class="attachment-description">${escapeHtml(img.description)}</div>` : ''}
        </div>
      `).join('')}
      ${videos.map(vid => `
        <div class="attachment-item">
          <div class="video-placeholder">
            <div class="icon">&#9654;</div>
            <div class="label">Video: ${escapeHtml(vid.fileName)}</div>
          </div>
          ${vid.description ? `<div class="attachment-description">${escapeHtml(vid.description)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Sezione Firma e Timbro -->
  <div class="section signature-section">
    <div class="section-title">Firma e Timbro</div>
    <div class="signature-box">
      <div class="signature-area">
        <div class="signature-line">Firma Tecnico</div>
      </div>
      <div class="signature-area">
        <div class="signature-line">Timbro e Firma Cliente</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Escape dei caratteri HTML speciali per prevenire XSS nel template.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Implementazione ---

/**
 * Genera un file PDF dal rapporto e dai suoi allegati.
 * In caso di errore restituisce un PdfExportResult con success=false e il messaggio di errore.
 */
export async function generatePdf(
  report: Report,
  attachments: Attachment[],
  devices?: Device[]
): Promise<PdfExportResult> {
  try {
    const reportDevices = devices ?? await deviceRepository.getByReportId(report.id);
    const html = generateHtmlTemplate(report, attachments, reportDevices);

    const { uri } = await Print.printToFileAsync({ html });

    if (!uri) {
      return {
        success: false,
        filePath: null,
        error: 'Generazione PDF fallita: nessun file prodotto.',
      };
    }

    return {
      success: true,
      filePath: uri,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto durante la generazione del PDF.';
    return {
      success: false,
      filePath: null,
      error: `Generazione PDF fallita: ${message}`,
    };
  }
}

/**
 * Condivide un file PDF tramite il menu di condivisione nativo del dispositivo.
 * Lancia un errore se la condivisione non è disponibile o fallisce.
 */
export async function sharePdf(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('La condivisione non è disponibile su questo dispositivo.');
  }
  await Sharing.shareAsync(filePath, {
    mimeType: 'application/pdf',
    dialogTitle: 'Condividi Rapporto',
  });
}

/**
 * Istanza del PdfExportModule conforme all'interfaccia.
 */
export const pdfExportModule: PdfExportModule = {
  generatePdf,
  sharePdf,
};
