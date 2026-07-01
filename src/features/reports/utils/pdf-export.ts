/**
 * PDF Export — Generates professional HTML template for report PDF export.
 * Ported from old/src/domain/pdf-export.ts, adapted to new schema.
 */

import type { Report, Device, Attachment } from '../types';
import { HOURLY_RATE, KM_RATE } from '@/config/constants';

// --- Helpers ---

/**
 * Escape dei caratteri HTML speciali per prevenire XSS nel template.
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formatta un numero come valuta EUR (es. "1.234,56 €").
 */
function formatCurrencyPdf(value: number | undefined | null): string {
  if (value == null) return '0,00 €';
  const fixed = Math.abs(value).toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0]!;
  const decPart = parts[1]!;
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 ? '-' : '';
  return `${sign}${withThousands},${decPart} €`;
}

/**
 * Formatta una data ISO in formato italiano GG/MM/AAAA.
 */
function formatDatePdf(isoDate: string | undefined): string {
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

// --- HTML Template ---

/**
 * Generates the full HTML template for the report PDF.
 */
export function generateHtmlTemplate(report: Report): string {
  const devices = report.devices || [];
  const attachments = report.attachments || [];

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
      <span class="field-value">${formatDatePdf(report.interventionDate)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Operatore:</span>
      <span class="field-value">${escapeHtml(report.operator)}</span>
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
    ${report.notes ? `<div class="field-row">
      <span class="field-label">Note:</span>
      <span class="field-value">${escapeHtml(report.notes)}</span>
    </div>` : ''}
  </div>

  ${devices.length > 0 ? `
  <!-- Sezione Dispositivi -->
  <div class="section">
    <div class="section-title">Dispositivi</div>
    ${devices.map((device: Device, i: number) => `
      <div style="margin-bottom: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Dispositivo ${i + 1}</div>
        ${device.model ? `<div class="field-row"><span class="field-label">Modello:</span><span class="field-value">${escapeHtml(device.model)}</span></div>` : ''}
        ${device.serialNumber ? `<div class="field-row"><span class="field-label">N. Serie:</span><span class="field-value">${escapeHtml(device.serialNumber)}</span></div>` : ''}
        ${device.productionYear ? `<div class="field-row"><span class="field-label">Anno:</span><span class="field-value">${escapeHtml(device.productionYear)}</span></div>` : ''}
        ${device.warranty ? `<div class="field-row"><span class="field-label">Garanzia:</span><span class="field-value">${formatWarranty(device.warranty)}</span></div>` : ''}
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
          <td>${report.hoursWorked ?? 0} ore × ${HOURLY_RATE},00 €/h</td>
          <td>${formatCurrencyPdf(report.hourlyTotal)}</td>
        </tr>
        <tr>
          <td>Chilometri</td>
          <td>${report.kilometers ?? 0} km × ${KM_RATE.toFixed(2).replace('.', ',')} €/km</td>
          <td>${formatCurrencyPdf(report.kilometerTotal)}</td>
        </tr>
        <tr>
          <td>Subtotale</td>
          <td></td>
          <td>${formatCurrencyPdf(report.subtotal)}</td>
        </tr>
        ${report.discountAmount && report.discountAmount > 0 ? `<tr>
          <td>Sconto (${report.discountPercent}%)</td>
          <td></td>
          <td>-${formatCurrencyPdf(report.discountAmount)}</td>
        </tr>` : ''}
        <tr>
          <td>Imponibile</td>
          <td></td>
          <td>${formatCurrencyPdf(report.taxableAmount)}</td>
        </tr>
        <tr>
          <td>IVA (22%)</td>
          <td></td>
          <td>${formatCurrencyPdf(report.vatAmount)}</td>
        </tr>
        <tr class="total-row">
          <td>Totale Intervento</td>
          <td>${formatPayment(report.payment)}</td>
          <td>${formatCurrencyPdf(report.grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${attachments.length > 0 ? `
  <!-- Sezione Allegati -->
  <div class="section">
    <div class="section-title">Allegati</div>
    <div class="attachments-list">
      ${attachments.map((att: Attachment) => `
        <div class="attachment-item">
          <img src="${att.dataUrl}" alt="${escapeHtml(att.description || 'Allegato')}" />
          ${att.description ? `<div class="attachment-description">${escapeHtml(att.description)}</div>` : ''}
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
 * Sanitizes a company name for use in PDF filename.
 * Replaces special chars with dashes, trims, lowercases.
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòù]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Generates the PDF filename: rapporto_[company-name-sanitized]_[DD-MM-YYYY].pdf
 */
export function generatePdfFilename(report: Report): string {
  const companySlug = sanitizeFilename(report.companyName);
  const date = new Date(report.interventionDate);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `rapporto_${companySlug}_${dd}-${mm}-${yyyy}.pdf`;
}
