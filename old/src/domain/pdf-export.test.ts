/**
 * Tests for PdfExportModule - HTML template generation and error handling.
 *
 * Tests the generateHtmlTemplate function directly (pure, no native dependencies).
 * Native PDF generation and sharing are tested via integration tests.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock native modules before importing the module under test
vi.mock('expo-print', () => ({
  printToFileAsync: vi.fn(),
}));
vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
}));

import { generateHtmlTemplate } from './pdf-export';
import type { Report, Attachment } from '../types/report';

// --- Test Fixtures ---

function createTestReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'test-report-1',
    status: 'completed',
    companyName: 'Acme S.r.l.',
    address: 'Via Roma 123, Milano',
    phone: '02 1234567',
    vatNumber: '12345678901',
    interventionDate: '2024-03-15',
    performedBy: 'Mario Rossi',
    interventionLocation: 'Sede cliente',
    requestedBy: 'Luigi Verdi',
    onBehalfOf: 'Direzione Tecnica',
    interventionReason: 'malfunction',
    description: 'Sostituzione componente difettoso',
    model: 'XR-500',
    serialNumber: '1ZZA1234567',
    productionYear: '2022',
    warranty: 'in_warranty',
    payment: 'unpaid',
    hoursWorked: 3,
    kilometers: 50,
    discountPercent: 10,
    hourlyTotal: 180,
    kilometerTotal: 45,
    subtotal: 225,
    discountAmount: 22.5,
    discountedSubtotal: 202.5,
    vatAmount: 44.55,
    grandTotal: 247.05,
    notes: 'Intervento completato con successo',
    createdAt: '2024-03-15T08:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
    ...overrides,
  };
}

function createTestAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'att-1',
    reportId: 'test-report-1',
    type: 'image',
    filePath: '/data/attachments/test-report-1/att-1.jpg',
    fileName: 'foto_seriale.jpg',
    mimeType: 'image/jpeg',
    fileSize: 2048000,
    description: 'Numero di serie',
    createdAt: '2024-03-15T09:00:00Z',
    ...overrides,
  };
}

// --- Tests ---

describe('PdfExportModule - generateHtmlTemplate', () => {
  describe('Struttura del documento', () => {
    it('should generate valid HTML with all required sections', () => {
      const report = createTestReport();
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Rapporto di Assistenza Tecnica');
      expect(html).toContain('Dati Cliente');
      expect(html).toContain('Dettagli Intervento');
      expect(html).toContain('Costi');
      expect(html).toContain('Firma e Timbro');
    });

    it('should include signature areas for both technician and client', () => {
      const report = createTestReport();
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('Firma Tecnico');
      expect(html).toContain('Timbro e Firma Cliente');
    });
  });

  describe('Sezione Dati Cliente', () => {
    it('should include company name', () => {
      const report = createTestReport({ companyName: 'Test Company S.p.A.' });
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('Ragione Sociale:');
      expect(html).toContain('Test Company S.p.A.');
    });

    it('should include address, phone, and VAT number when present', () => {
      const report = createTestReport();
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('Indirizzo:');
      expect(html).toContain('Via Roma 123, Milano');
      expect(html).toContain('Telefono:');
      expect(html).toContain('02 1234567');
      expect(html).toContain('P.IVA:');
      expect(html).toContain('12345678901');
    });

    it('should omit optional fields when not provided', () => {
      const report = createTestReport({
        address: undefined,
        phone: undefined,
        vatNumber: undefined,
      });
      const html = generateHtmlTemplate(report, []);

      expect(html).not.toContain('Indirizzo:');
      expect(html).not.toContain('Telefono:');
      expect(html).not.toContain('P.IVA:');
    });
  });

  describe('Sezione Dettagli Intervento', () => {
    it('should include all mandatory intervention fields', () => {
      const report = createTestReport();
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('Data Intervento:');
      expect(html).toContain('15/03/2024');
      expect(html).toContain('Intervento eseguito da:');
      expect(html).toContain('Mario Rossi');
      expect(html).toContain('Descrizione:');
      expect(html).toContain('Sostituzione componente difettoso');
    });

    it('should format intervention reason in Italian', () => {
      const reasons: Array<[string, string]> = [
        ['installation', 'Installazione'],
        ['supervision', 'Supervisione'],
        ['malfunction', 'Malfunzionamento'],
        ['other', 'Altro'],
      ];

      for (const [code, label] of reasons) {
        const report = createTestReport({ interventionReason: code as Report['interventionReason'] });
        const html = generateHtmlTemplate(report, []);
        expect(html).toContain(label);
      }
    });

    it('should format warranty status in Italian', () => {
      const report = createTestReport({ warranty: 'in_warranty' });
      const html = generateHtmlTemplate(report, []);
      expect(html).toContain('In Garanzia');

      const report2 = createTestReport({ warranty: 'out_warranty' });
      const html2 = generateHtmlTemplate(report2, []);
      expect(html2).toContain('Non in Garanzia');
    });

    it('should not include payment field in PDF (removed)', () => {
      const report = createTestReport({ payment: 'paid' });
      const html = generateHtmlTemplate(report, []);
      expect(html).not.toContain('Pagamento');
    });
  });

  describe('Sezione Costi', () => {
    it('should include cost breakdown values (ore, km, totale)', () => {
      const report = createTestReport();
      const html = generateHtmlTemplate(report, []);

      // hourlyTotal
      expect(html).toContain('180,00 €');
      // kilometerTotal
      expect(html).toContain('45,00 €');
      // Subtotale (ore + km)
      expect(html).toContain('225,00 €');
      // Totale Intervento shows grandTotal (with VAT)
      expect(html).toContain('247,05 €');
      expect(html).toContain('Totale Intervento');
    });

    it('should show hours and km detail', () => {
      const report = createTestReport({ hoursWorked: 5, kilometers: 120 });
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('5 ore × 60,00 €/h');
      expect(html).toContain('120 km × 0,90 €/km');
    });

    it('should not show sconto, subtotale scontato or IVA rows', () => {
      const report = createTestReport({ discountPercent: 15 });
      const html = generateHtmlTemplate(report, []);

      expect(html).not.toContain('Sconto');
      expect(html).not.toContain('Subtotale scontato');
      expect(html).not.toContain('IVA (22%)');
    });
  });

  describe('Sezione Allegati', () => {
    it('should include images inline with file path', () => {
      const attachment = createTestAttachment({
        type: 'image',
        filePath: '/data/attachments/report-1/photo.jpg',
        description: 'Foto targa',
      });
      const html = generateHtmlTemplate(createTestReport(), [attachment]);

      expect(html).toContain('Allegati');
      expect(html).toContain('file:///data/attachments/report-1/photo.jpg');
      expect(html).toContain('Foto targa');
    });

    it('should display video as placeholder with description', () => {
      const videoAttachment = createTestAttachment({
        type: 'video',
        filePath: '/data/attachments/report-1/video.mp4',
        fileName: 'diagnosi.mp4',
        description: 'Video diagnosi problema',
      });
      const html = generateHtmlTemplate(createTestReport(), [videoAttachment]);

      expect(html).toContain('Allegati');
      expect(html).toContain('Video: diagnosi.mp4');
      expect(html).toContain('Video diagnosi problema');
      // Should NOT include a direct video embed/src
      expect(html).not.toContain('file:///data/attachments/report-1/video.mp4');
    });

    it('should not render attachments section when there are no attachments', () => {
      const html = generateHtmlTemplate(createTestReport(), []);
      // The section title "Allegati" should not appear
      expect(html).not.toContain('>Allegati</div>');
    });

    it('should handle mixed images and videos', () => {
      const attachments: Attachment[] = [
        createTestAttachment({ id: 'img-1', type: 'image', filePath: '/data/attachments/r1/img1.jpg', fileName: 'img1.jpg', description: undefined }),
        createTestAttachment({ id: 'vid-1', type: 'video', filePath: '/data/attachments/r1/vid1.mp4', fileName: 'vid1.mp4', description: 'Test video' }),
        createTestAttachment({ id: 'img-2', type: 'image', filePath: '/data/attachments/r1/img2.jpg', fileName: 'img2.jpg', description: 'Seconda foto' }),
      ];
      const html = generateHtmlTemplate(createTestReport(), attachments);

      expect(html).toContain('Allegati');
      // Images use filePath in src
      expect(html).toContain('file:///data/attachments/r1/img1.jpg');
      expect(html).toContain('file:///data/attachments/r1/img2.jpg');
      // Video shows fileName in placeholder
      expect(html).toContain('Video: vid1.mp4');
      expect(html).toContain('Test video');
      expect(html).toContain('Seconda foto');
    });
  });

  describe('HTML escaping', () => {
    it('should escape special characters in text fields', () => {
      const report = createTestReport({
        companyName: 'A&B <Company> "Test"',
        description: "It's a <script>alert('xss')</script> test",
      });
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('A&amp;B &lt;Company&gt; &quot;Test&quot;');
      expect(html).toContain('It&#039;s a &lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; test');
      expect(html).not.toContain("<script>alert('xss')</script>");
    });
  });

  describe('Edge cases', () => {
    it('should handle report with no optional fields', () => {
      const report = createTestReport({
        address: undefined,
        phone: undefined,
        vatNumber: undefined,
        interventionLocation: undefined,
        requestedBy: undefined,
        onBehalfOf: undefined,
        interventionReason: undefined,
        model: undefined,
        serialNumber: undefined,
        productionYear: undefined,
        warranty: undefined,
        payment: undefined,
        hoursWorked: undefined,
        kilometers: undefined,
        notes: undefined,
      });
      const html = generateHtmlTemplate(report, []);

      // Should still have required sections
      expect(html).toContain('Dati Cliente');
      expect(html).toContain('Dettagli Intervento');
      expect(html).toContain('Costi');
      expect(html).toContain('Firma e Timbro');
    });

    it('should handle zero costs', () => {
      const report = createTestReport({
        hourlyTotal: 0,
        kilometerTotal: 0,
        subtotal: 0,
        discountAmount: 0,
        discountedSubtotal: 0,
        vatAmount: 0,
        grandTotal: 0,
      });
      const html = generateHtmlTemplate(report, []);

      expect(html).toContain('0,00 €');
    });
  });
});
