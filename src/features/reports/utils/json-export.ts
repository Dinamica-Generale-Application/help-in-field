/**
 * JSON Export — Downloads a JSON file with structured report data.
 * Used alongside PDF export so that data can be processed by external tools (dashboards, analytics).
 * The JSON excludes binary data (attachments.dataUrl) to keep files small.
 */

import type { Report } from '../types';
import { generatePdfFilename } from './pdf-export';

/**
 * Builds the JSON-serializable data for a report (strips binary attachment data).
 */
function buildExportData(report: Report, operatorCode?: string) {
  return {
    id: report.id,
    status: report.status,
    companyName: report.companyName,
    address: report.address,
    phone: report.phone,
    interventionDate: report.interventionDate,
    operator1: operatorCode || '',
    operator2: report.operator || '',
    interventionLocation: report.interventionLocation,
    interventionLat: report.interventionLat,
    interventionLon: report.interventionLon,
    requestedBy: report.requestedBy,
    onBehalfOf: report.onBehalfOf,
    interventionReason: report.interventionReason,
    heatRisk: report.heatRisk,
    description: report.description,
    devices: report.devices.map((d) => ({
      model: d.model,
      serialNumber: d.serialNumber,
      productionYear: d.productionYear,
      warranty: d.warranty,
    })),
    hoursWorked: report.hoursWorked,
    kilometers: report.kilometers,
    otherExpenses: report.otherExpenses,
    hourlyTotal: report.hourlyTotal,
    kilometerTotal: report.kilometerTotal,
    grandTotal: report.grandTotal,
    notes: report.notes,
    attachmentCount: report.attachments?.length ?? 0,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

/**
 * Generates and downloads a .json file with the report data.
 * Filename matches the PDF filename but with .json extension.
 */
export function downloadReportJson(report: Report, operatorCode?: string): void {
  const data = buildExportData(report, operatorCode);
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const filename = generatePdfFilename(report).replace(/\.pdf$/, '.json');

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
