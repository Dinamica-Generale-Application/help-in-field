/**
 * Builds structured PdfReportData from a Report entity.
 * Used by the jsPDF-based export for text-based (parsable) PDFs.
 */

import type { Report } from '../types';
import type { PdfReportData } from '@/lib/html2pdf';
import { HOURLY_RATE, KM_RATE } from '@/config/constants';

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

function formatDatePdf(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatInterventionReason(reason: string | undefined): string {
  switch (reason) {
    case 'installation': return 'Installazione';
    case 'supervision': return 'Supervisione';
    case 'malfunction': return 'Malfunzionamento';
    case 'other': return 'Altro';
    default: return '';
  }
}

function formatHeatRisk(level: string | undefined): string {
  switch (level) {
    case 'none': return 'Nessuno';
    case 'low': return 'Basso';
    case 'moderate': return 'Moderato';
    case 'high': return 'Alto';
    default: return '';
  }
}

function formatWarranty(warranty: string | undefined): string {
  switch (warranty) {
    case 'in_warranty': return 'In Garanzia';
    case 'out_warranty': return 'Non in Garanzia';
    default: return '';
  }
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
    default: return '';
  }
}

export function buildPdfData(
  report: Report,
  operatorCode: string,
  logoDataUrl?: string,
): PdfReportData {
  const hours = report.hoursWorked ?? 0;
  const km = report.kilometers ?? 0;

  return {
    logoDataUrl: logoDataUrl || undefined,
    companyName: report.companyName,
    address: report.address,
    phone: report.phone,
    interventionDate: formatDatePdf(report.interventionDate),
    operator1: operatorCode,
    operator2: report.operator || undefined,
    interventionLocation: report.interventionLocation,
    requestedBy: report.requestedBy,
    onBehalfOf: report.onBehalfOf,
    interventionReason: formatInterventionReason(report.interventionReason),
    heatRisk: formatHeatRisk(report.heatRisk),
    problemFound: formatProblemFound(report.problemFound),
    description: report.description,
    notes: report.notes,
    devices: report.devices.map((d) => ({
      model: d.model,
      serialNumber: d.serialNumber,
      productionYear: d.productionYear,
      warranty: formatWarranty(d.warranty),
    })),
    costDetails: {
      hoursDetail: `${hours} ore × ${HOURLY_RATE},00 €/h`,
      kmDetail: `${km} km × ${KM_RATE.toFixed(2).replace('.', ',')} €/km`,
      travelDetail: km > 0 ? `${(km / 55).toFixed(1)} ore × ${HOURLY_RATE},00 €/h` : undefined,
      hourlyTotal: formatCurrencyPdf(report.hourlyTotal),
      kmTotal: formatCurrencyPdf(report.kilometerTotal),
      travelCost: km > 0 ? formatCurrencyPdf(Math.round((km / 55) * HOURLY_RATE * 100) / 100) : undefined,
      otherExpenses: report.otherExpenses && report.otherExpenses > 0
        ? formatCurrencyPdf(report.otherExpenses)
        : undefined,
      grandTotal: formatCurrencyPdf(report.grandTotal),
    },
    attachments: report.attachments?.map((att) => ({
      dataUrl: att.dataUrl,
      description: att.description,
    })),
  };
}
