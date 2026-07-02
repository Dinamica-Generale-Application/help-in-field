/**
 * html2pdf wrapper — dynamic import of html2pdf.js for lazy loading.
 * Includes iOS Safari fallback: if download fails, opens blob URL in new tab.
 */

/**
 * Detects if the current browser is iOS Safari.
 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  return isIos && isSafari;
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

    if (isIosSafari()) {
      // iOS Safari: generate as blob and open in new tab
      const blob: Blob = await html2pdf().set(options).from(container).outputPdf('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      // Standard browsers: download directly
      await html2pdf().set(options).from(container).save();
    }
  } finally {
    document.body.removeChild(container);
  }
}
