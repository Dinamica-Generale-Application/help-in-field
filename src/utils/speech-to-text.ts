/**
 * Speech-to-Text utility — cross-platform.
 *
 * - Nativo (Android/iOS): usa expo-speech-recognition
 * - Web: usa Web Speech API (SpeechRecognition)
 *
 * Esporta una interfaccia unificata per la dettatura vocale.
 */

import { Platform } from 'react-native';

// --- Interfaccia ---

export interface SpeechCallbacks {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

let _callbacks: SpeechCallbacks | null = null;
let _webRecognition: unknown | null = null;

/**
 * Request microphone permission for speech recognition.
 */
export async function requestSpeechPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Web Speech API: permission is requested implicitly when starting.
    // We can check if the API exists.
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    return Boolean(SpeechRecognition);
  }

  // Native: use expo-speech-recognition
  const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

/**
 * Start listening for speech input in Italian.
 */
export function startListening(callbacks: SpeechCallbacks): void {
  _callbacks = callbacks;

  if (Platform.OS === 'web') {
    startWebSpeech(callbacks);
  } else {
    startNativeSpeech(callbacks);
  }
}

/**
 * Stop listening for speech input.
 */
export function stopListening(): void {
  if (Platform.OS === 'web') {
    stopWebSpeech();
  } else {
    stopNativeSpeech();
  }
  _callbacks = null;
}

/**
 * Check if speech recognition is available on this platform.
 */
export function isSpeechAvailable(): boolean {
  if (Platform.OS === 'web') {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    return Boolean(SpeechRecognition);
  }
  // Native: always available if expo-speech-recognition is installed
  return true;
}

// --- Web Speech API implementation ---

function startWebSpeech(callbacks: SpeechCallbacks): void {
  const SpeechRecognitionClass =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    callbacks.onError?.('Speech recognition non supportato su questo browser.');
    return;
  }

  const recognition = new (SpeechRecognitionClass as new () => SpeechRecognition)();
  recognition.lang = 'it-IT';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  // Capture callbacks in closure to avoid null reference
  const onResult = callbacks.onResult;
  const onError = callbacks.onError;
  const onEnd = callbacks.onEnd;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError?.(event.error);
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.start();
  _webRecognition = recognition;
}

function stopWebSpeech(): void {
  if (_webRecognition) {
    (
      _webRecognition as { stop: () => void }
    ).stop();
    _webRecognition = null;
  }
}

// --- Native (expo-speech-recognition) implementation ---

async function startNativeSpeech(callbacks: SpeechCallbacks): Promise<void> {
  const { ExpoSpeechRecognitionModule, addSpeechRecognitionListener } = await import(
    'expo-speech-recognition'
  );

  addSpeechRecognitionListener('result', (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0].transcript;
      callbacks.onResult(transcript, event.isFinal);
    }
  });

  addSpeechRecognitionListener('error', (event) => {
    callbacks.onError?.(event.error);
  });

  addSpeechRecognitionListener('end', () => {
    callbacks.onEnd?.();
  });

  ExpoSpeechRecognitionModule.start({
    lang: 'it-IT',
    interimResults: true,
    maxAlternatives: 1,
  });
}

function stopNativeSpeech(): void {
  import('expo-speech-recognition').then(({ ExpoSpeechRecognitionModule }) => {
    ExpoSpeechRecognitionModule.stop();
  });
}
