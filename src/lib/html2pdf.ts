/**
 * PDF generation using jsPDF directly (text-based, parsable).
 * Produces real text (searchable/selectable) + embedded images for attachments.
 * This replaces the html2canvas approach for lighter, parsable PDFs.
 */

/**
 * Loads an image from a dataUrl and returns its natural dimensions.
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Generates a PDF from structured report data and triggers download.
 * Uses jsPDF for real text output + image embedding.
 */
export async function generateAndDownloadPdf(
  _html: string,
  filename: string,
  pdfData?: PdfReportData,
): Promise<void> {
  if (!pdfData) {
    // Fallback: if no structured data provided, use legacy approach
    await legacyHtml2PdfExport(_html, filename);
    return;
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 15;

  // --- Helper functions ---
  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  }

  function addSectionTitle(title: string) {
    checkPageBreak(12);
    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.text(title, marginLeft + 5, y + 5);
    y += 10;
  }

  function addField(label: string, value: string | undefined | null) {
    if (!value) return;
    checkPageBreak(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85);
    doc.text(`${label}:`, marginLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    // Wrap long values
    const labelWidth = 45;
    const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth);
    doc.text(valueLines, marginLeft + labelWidth, y);
    y += Math.max(valueLines.length * 4.5, 5);
  }

  function addFieldRow(fields: Array<{ label: string; value: string | undefined | null }>) {
    const validFields = fields.filter(f => f.value);
    if (validFields.length === 0) return;
    checkPageBreak(7);
    const colWidth = contentWidth / validFields.length;
    for (let i = 0; i < validFields.length; i++) {
      const f = validFields[i]!;
      const x = marginLeft + i * colWidth;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(85, 85, 85);
      doc.text(`${f.label}:`, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(f.value || '', x + 30, y);
    }
    y += 6;
  }

  // --- Logo ---
  if (pdfData.logoDataUrl) {
    try {
      const logoWidth = 50;
      const logoHeight = 15;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(pdfData.logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
      y += logoHeight + 5;
    } catch {
      // Logo failed, continue without it
    }
  }

  // --- Title ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 26, 26);
  const title = 'Rapporto di Assistenza Tecnica';
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // --- Dati Cliente ---
  addSectionTitle('Dati Cliente');
  addField('Ragione Sociale', pdfData.companyName);
  addField('Indirizzo', pdfData.address);
  addField('Telefono', pdfData.phone);
  y += 3;

  // --- Dettagli Intervento ---
  addSectionTitle('Dettagli Intervento');
  addFieldRow([
    { label: 'Data', value: pdfData.interventionDate },
    { label: 'Operatore 1', value: pdfData.operator1 },
  ]);
  if (pdfData.operator2) {
    addField('Operatore 2', pdfData.operator2);
  }
  addField('Luogo', pdfData.interventionLocation);
  addField('Richiesto da', pdfData.requestedBy);
  addField('Per conto di', pdfData.onBehalfOf);
  addField('Motivo richiesta intervento', pdfData.interventionReason);
  addField('Rischio Caldo', pdfData.heatRisk);
  addField('Problema riscontrato', pdfData.problemFound);
  addField('Descrizione dettagliata', pdfData.description);
  addField('Note', pdfData.notes);
  y += 3;

  // --- Dispositivi ---
  if (pdfData.devices && pdfData.devices.length > 0) {
    addSectionTitle('Dispositivi');
    for (let i = 0; i < pdfData.devices.length; i++) {
      const device = pdfData.devices[i]!;
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      doc.text(`Dispositivo ${i + 1}`, marginLeft, y);
      y += 5;
      addField('Modello', device.model);
      addField('N. Serie', device.serialNumber);
      addField('Anno', device.productionYear);
      addField('Garanzia', device.warranty);
      y += 2;
    }
    y += 3;
  }

  // --- Costi ---
  addSectionTitle('Costi');
  checkPageBreak(30);

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(marginLeft, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text('Voce', marginLeft + 2, y + 4);
  doc.text('Dettaglio', marginLeft + 50, y + 4);
  doc.text('Importo', marginLeft + contentWidth - 25, y + 4);
  y += 8;

  // Cost rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);

  doc.text('Ore lavorate', marginLeft + 2, y);
  doc.text(pdfData.costDetails.hoursDetail, marginLeft + 50, y);
  doc.text(pdfData.costDetails.hourlyTotal, marginLeft + contentWidth - 25, y);
  y += 6;

  doc.text('Chilometri', marginLeft + 2, y);
  doc.text(pdfData.costDetails.kmDetail, marginLeft + 50, y);
  doc.text(pdfData.costDetails.kmTotal, marginLeft + contentWidth - 25, y);
  y += 6;

  if (pdfData.costDetails.travelCost) {
    doc.text('Ore viaggio', marginLeft + 2, y);
    doc.text(pdfData.costDetails.travelDetail || '', marginLeft + 50, y);
    doc.text(pdfData.costDetails.travelCost, marginLeft + contentWidth - 25, y);
    y += 6;
  }

  if (pdfData.costDetails.otherExpenses) {
    doc.text('Altro', marginLeft + 2, y);
    doc.text(pdfData.costDetails.otherExpenses, marginLeft + contentWidth - 25, y);
    y += 6;
  }

  // Total row
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Totale Intervento', marginLeft + 2, y);
  doc.text(pdfData.costDetails.grandTotal, marginLeft + contentWidth - 25, y);
  y += 8;

  // --- Allegati (immagini) ---
  if (pdfData.attachments && pdfData.attachments.length > 0) {
    addSectionTitle('Allegati');
    for (const att of pdfData.attachments) {
      if (!att.dataUrl) continue;
      try {
        // Load image to get natural pixel dimensions
        const imgDims = await getImageDimensions(att.dataUrl);
        const format = att.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        const maxW = contentWidth - 10;
        const maxH = 120;

        // Scale to fit within maxW × maxH preserving aspect ratio
        const scaleW = maxW / imgDims.width;
        const scaleH = maxH / imgDims.height;
        const scale = Math.min(scaleW, scaleH);
        const imgW = imgDims.width * scale;
        const imgH = imgDims.height * scale;

        checkPageBreak(imgH + 15);
        doc.addImage(att.dataUrl, format, marginLeft + 5, y, imgW, imgH, undefined, 'MEDIUM');
        y += imgH + 3;
        if (att.description) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(att.description, marginLeft + 5, y);
          y += 5;
        }
        y += 5;
      } catch {
        // Skip image if it fails
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('[Immagine non disponibile]', marginLeft + 5, y);
        y += 8;
      }
    }
  }

  // --- Firma e Timbro ---
  checkPageBreak(45);
  addSectionTitle('Firma e Timbro');
  y += 25;
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.3);
  // Left signature
  doc.line(marginLeft + 5, y, marginLeft + 70, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text('Firma Tecnico', marginLeft + 20, y + 5);
  // Right signature
  const rightX = pageWidth - marginRight - 70;
  doc.line(rightX, y, rightX + 65, y);
  doc.text('Timbro e Firma Cliente', rightX + 8, y + 5);

  // --- Save ---
  doc.save(filename);
}

/**
 * Legacy export using html2pdf.js (canvas-based, for backward compatibility).
 */
async function legacyHtml2PdfExport(html: string, filename: string): Promise<void> {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default;

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const options = {
      margin: [10, 15, 10, 15] as unknown as number,
      filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    await html2pdf().set(options).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

// --- Types ---

export interface PdfReportData {
  logoDataUrl?: string;
  companyName: string;
  address?: string;
  phone?: string;
  interventionDate: string;
  operator1: string;
  operator2?: string;
  interventionLocation?: string;
  requestedBy?: string;
  onBehalfOf?: string;
  interventionReason?: string;
  heatRisk?: string;
  problemFound?: string;
  description: string;
  notes?: string;
  devices?: Array<{
    model?: string;
    serialNumber?: string;
    productionYear?: string;
    warranty?: string;
  }>;
  costDetails: {
    hoursDetail: string;
    kmDetail: string;
    travelDetail?: string;
    hourlyTotal: string;
    kmTotal: string;
    travelCost?: string;
    otherExpenses?: string;
    grandTotal: string;
  };
  attachments?: Array<{
    dataUrl?: string;
    description?: string;
  }>;
}
