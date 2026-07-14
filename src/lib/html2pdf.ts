/**
 * html2pdf wrapper — dynamic import of html2pdf.js for lazy loading.
 * Includes iOS Safari fallback: if download fails, opens blob URL in new tab.
 */

/**
 * Detects if the current device is running iOS (any browser).
 * On iOS, all browsers use the WebKit engine and have the same download limitations.
 */
function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Generates a PDF from an HTML string and triggers download.
 * Falls back to opening a blob URL in a new tab on iOS Safari.
 */
export async function generateAndDownloadPdf(html: string, filename: string): Promise<void> {
  // Dynamic import of html2pdf.js (lazy loaded for bundle size)
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default;

  // Create a temporary container for the HTML
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

    if (isIos()) {
      // iOS: generate as blob and trigger via <a> link (avoids popup blocker)
      const blob: Blob = await html2pdf().set(options).from(container).outputPdf('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      // iOS Safari supports download attribute partially — set it as hint
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after a delay to allow the browser to process
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } else {
      // Standard browsers: download directly
      await html2pdf().set(options).from(container).save();
    }
  } finally {
    document.body.removeChild(container);
  }
}
