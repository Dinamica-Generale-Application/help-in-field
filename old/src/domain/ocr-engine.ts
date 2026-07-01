/**
 * OCR Engine - Interfaccia astratta per il riconoscimento testo.
 *
 * Permette di switchare tra diversi motori OCR:
 * - ML Kit (React Native, Android/iOS)
 * - Tesseract.js (Web, cross-platform)
 * - Google Cloud Vision (API, opzionale)
 *
 * Il motore viene selezionato automaticamente in base alla piattaforma.
 */

import { Platform } from 'react-native';

// --- Interfacce ---

/** Blocco di testo riconosciuto dal motore OCR */
export interface OcrTextBlock {
  text: string;
  confidence?: number;
}

/** Risultato grezzo del riconoscimento testo */
export interface OcrRawResult {
  rawText: string;
  blocks: OcrTextBlock[];
}

/** Interfaccia che ogni motore OCR deve implementare */
export interface OcrEngine {
  name: string;
  recognize(imageUri: string): Promise<OcrRawResult>;
  isAvailable(): boolean;
}

// --- ML Kit Engine (Nativo) ---

class MlKitEngine implements OcrEngine {
  name = 'ml-kit';

  isAvailable(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  async recognize(imageUri: string): Promise<OcrRawResult> {
    const TextRecognition = (await import('@react-native-ml-kit/text-recognition')).default;
    const result = await TextRecognition.recognize(imageUri);
    const blocks: OcrTextBlock[] = [];
    const rawTextParts: string[] = [];

    if (result && result.blocks) {
      for (const block of result.blocks) {
        rawTextParts.push(block.text);
        if (block.lines) {
          for (const line of block.lines) {
            blocks.push({
              text: line.text,
              confidence: line.confidence ?? block.confidence,
            });
          }
        } else {
          blocks.push({ text: block.text, confidence: block.confidence });
        }
      }
    }

    return { rawText: rawTextParts.join('\n'), blocks };
  }
}

// --- Tesseract.js Engine (Web) ---

class TesseractEngine implements OcrEngine {
  name = 'tesseract';

  isAvailable(): boolean {
    return Platform.OS === 'web';
  }

  async recognize(imageUri: string): Promise<OcrRawResult> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng+ita');
    const result = await worker.recognize(imageUri);
    await worker.terminate();

    const blocks: OcrTextBlock[] = [];

    if (result.data && result.data.lines) {
      for (const line of result.data.lines) {
        blocks.push({
          text: line.text.trim(),
          confidence: line.confidence / 100, // Tesseract 0-100 → 0-1
        });
      }
    }

    return { rawText: result.data?.text ?? '', blocks };
  }
}

// --- Cloud Vision Engine (API, opzionale) ---

class CloudVisionEngine implements OcrEngine {
  name = 'cloud-vision';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async recognize(imageUri: string): Promise<OcrRawResult> {
    const base64Image = await this.imageToBase64(imageUri);

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: base64Image }, features: [{ type: 'TEXT_DETECTION' }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Cloud Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const annotations = data.responses?.[0]?.textAnnotations;

    if (!annotations || annotations.length === 0) {
      return { rawText: '', blocks: [] };
    }

    const rawText = annotations[0].description ?? '';
    const blocks: OcrTextBlock[] = annotations
      .slice(1)
      .map((ann: { description: string }) => ({ text: ann.description, confidence: 0.9 }));

    return { rawText, blocks };
  }

  private async imageToBase64(imageUri: string): Promise<string> {
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const FileSystem = (await import('expo-file-system')).default;
      return FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
    }
  }
}

// --- Factory ---

export interface OcrEngineConfig {
  forceEngine?: 'ml-kit' | 'tesseract' | 'cloud-vision';
  cloudVisionApiKey?: string;
}

export function createOcrEngine(config?: OcrEngineConfig): OcrEngine {
  if (config?.forceEngine) {
    switch (config.forceEngine) {
      case 'ml-kit':
        return new MlKitEngine();
      case 'tesseract':
        return new TesseractEngine();
      case 'cloud-vision':
        if (!config.cloudVisionApiKey) throw new Error('Cloud Vision richiede una API key');
        return new CloudVisionEngine(config.cloudVisionApiKey);
    }
  }

  if (config?.cloudVisionApiKey) return new CloudVisionEngine(config.cloudVisionApiKey);
  if (Platform.OS === 'android' || Platform.OS === 'ios') return new MlKitEngine();
  return new TesseractEngine();
}

// --- Singleton ---

let currentEngine: OcrEngine = createOcrEngine();

export function getOcrEngine(): OcrEngine {
  return currentEngine;
}

export function setOcrEngine(engine: OcrEngine): void {
  currentEngine = engine;
}

export function configureOcrEngine(config: OcrEngineConfig): void {
  currentEngine = createOcrEngine(config);
}
