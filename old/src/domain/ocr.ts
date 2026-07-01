/**
 * OCR Module — Riconoscimento seriale e codice prodotto.
 *
 * Cross-platform:
 * - Nativo (Android/iOS): ML Kit via @react-native-ml-kit/text-recognition
 * - Web: Tesseract.js
 *
 * Il motore OCR è selezionato automaticamente dalla piattaforma tramite ocr-engine.ts.
 * La logica di estrazione pattern (regex) è condivisa.
 */

import { getOcrEngine, type OcrTextBlock } from './ocr-engine';

// --- Interfaces ---

export interface OcrResult {
  success: boolean;
  serialNumber: string | null;
  model: string | null;
  confidence: number;
  rawText: string;
  needsVerification?: boolean;
  message?: string;
}

export interface OcrModule {
  recognizeSerialNumber(imageUri: string): Promise<OcrResult>;
}

// --- Constants ---

// Pattern seriale: cifra + Z + lettera + almeno 3 alfanumerici (es. 2ZV125NF, 1ZZ533DE)
const SERIAL_NUMBER_PATTERN = /[0-9]Z[A-Z][A-Z0-9]{3,}/;
// Pattern alternativo: cerca dopo "SN:" o "S/N:"
const SERIAL_LABEL_PATTERN = /(?:SN|S\/N)\s*[:.]?\s*([A-Z0-9]{5,})/i;
// Pattern modello: 3 cifre + trattino + 4 cifre (es. 969-0406, 999-1503)
const MODEL_PATTERN = /[0-9]{3}-[0-9]{4}/;
// Pattern alternativo modello: cerca dopo "Cod:" o "Mod."
const MODEL_LABEL_PATTERN = /(?:Cod|Mod)\s*[.:]\s*([0-9]{3}-[0-9]{4})/i;

const OCR_TIMEOUT_MS = 15_000;
const CONFIDENCE_THRESHOLD = 0.5;
const MAX_RETRIES = 3;

// --- Implementation ---

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('OCR_TIMEOUT'));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Cerca il seriale nel testo usando pattern multipli.
 */
function extractSerialNumber(
  fullText: string,
  blocks: OcrTextBlock[]
): { serialNumber: string; confidence: number } | null {
  // Strategia 1: Cerca pattern diretto nei blocchi
  for (const block of blocks) {
    const match = block.text.match(SERIAL_NUMBER_PATTERN);
    if (match) {
      return { serialNumber: match[0], confidence: block.confidence ?? 0.8 };
    }
  }

  // Strategia 2: Cerca dopo label "SN:" nel testo completo
  const labelMatch = fullText.match(SERIAL_LABEL_PATTERN);
  if (labelMatch && labelMatch[1]) {
    return { serialNumber: labelMatch[1], confidence: 0.7 };
  }

  // Strategia 3: Cerca il pattern nel testo completo (senza spazi)
  const cleanText = fullText.replace(/\s+/g, ' ');
  const directMatch = cleanText.match(SERIAL_NUMBER_PATTERN);
  if (directMatch) {
    return { serialNumber: directMatch[0], confidence: 0.6 };
  }

  return null;
}

/**
 * Cerca il modello nel testo usando pattern multipli.
 */
function extractModel(
  fullText: string,
  blocks: OcrTextBlock[]
): { model: string; confidence: number } | null {
  // Strategia 1: Cerca pattern diretto nei blocchi
  for (const block of blocks) {
    const match = block.text.match(MODEL_PATTERN);
    if (match) {
      return { model: match[0], confidence: block.confidence ?? 0.8 };
    }
  }

  // Strategia 2: Cerca dopo label "Cod:" o "Mod."
  const labelMatch = fullText.match(MODEL_LABEL_PATTERN);
  if (labelMatch && labelMatch[1]) {
    return { model: labelMatch[1], confidence: 0.7 };
  }

  // Strategia 3: Cerca nel testo completo
  const directMatch = fullText.match(MODEL_PATTERN);
  if (directMatch) {
    return { model: directMatch[0], confidence: 0.6 };
  }

  return null;
}

/**
 * Esegue un singolo tentativo di riconoscimento usando il motore corrente.
 */
async function attemptRecognition(
  imageUri: string
): Promise<{ rawText: string; blocks: OcrTextBlock[] }> {
  const engine = getOcrEngine();
  const result = await withTimeout(engine.recognize(imageUri), OCR_TIMEOUT_MS);
  return result;
}

/**
 * Riconosce seriale e modello con retry automatico.
 */
export async function recognizeSerialNumber(imageUri: string): Promise<OcrResult> {
  let bestSerial: { serialNumber: string; confidence: number } | null = null;
  let bestModel: { model: string; confidence: number } | null = null;
  let lastRawText = '';
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { rawText, blocks } = await attemptRecognition(imageUri);
      lastRawText = rawText;

      if (!bestSerial) {
        const serial = extractSerialNumber(rawText, blocks);
        if (serial) bestSerial = serial;
      }

      if (!bestModel) {
        const model = extractModel(rawText, blocks);
        if (model) bestModel = model;
      }

      if (bestSerial && bestModel) break;
      if (attempt === MAX_RETRIES) break;

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'OCR_TIMEOUT') {
        lastError = 'Tempo scaduto';
      } else {
        lastError = error instanceof Error ? error.message : 'Errore sconosciuto';
      }
      if (attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (!bestSerial && !bestModel) {
    return {
      success: false,
      serialNumber: null,
      model: null,
      confidence: 0,
      rawText: lastRawText,
      needsVerification: false,
      message: lastError
        ? `Riconoscimento fallito: ${lastError}. Inserisci i valori manualmente.`
        : 'Nessun codice riconosciuto dopo 3 tentativi. Inserisci i valori manualmente.',
    };
  }

  const confidence = Math.max(bestSerial?.confidence ?? 0, bestModel?.confidence ?? 0);
  const needsVerification = confidence < CONFIDENCE_THRESHOLD;

  let message: string | undefined;
  if (needsVerification) {
    message = 'Riconoscimento incerto: verifica i valori.';
  } else if (!bestSerial && bestModel) {
    message = `Modello riconosciuto: ${bestModel.model}. Seriale non trovato, inseriscilo manualmente.`;
  } else if (bestSerial && !bestModel) {
    message = `Seriale riconosciuto: ${bestSerial.serialNumber}. Modello non trovato, inseriscilo manualmente.`;
  }

  return {
    success: true,
    serialNumber: bestSerial?.serialNumber ?? null,
    model: bestModel?.model ?? null,
    confidence,
    rawText: lastRawText,
    needsVerification,
    message,
  };
}

export const ocrModule: OcrModule = {
  recognizeSerialNumber,
};
