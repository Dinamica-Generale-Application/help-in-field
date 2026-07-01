import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Check if the browser supports the Web Speech API.
 */
function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return (win.SpeechRecognition || win.webkitSpeechRecognition || null) as
    | (new () => SpeechRecognition)
    | null;
}

export interface UseSpeechToTextOptions {
  /** Callback invoked with final transcribed text */
  onResult: (text: string) => void;
  /** Language for recognition (default: 'it-IT') */
  lang?: string;
}

export interface UseSpeechToTextReturn {
  /** Whether the browser supports Web Speech API */
  isSupported: boolean;
  /** Whether recognition is currently active */
  isListening: boolean;
  /** Interim (partial) transcription text */
  interimText: string;
  /** Start speech recognition */
  start: () => void;
  /** Stop speech recognition */
  stop: () => void;
  /** Last error message, if any */
  error: string | null;
}

/**
 * Hook wrapping the Web Speech API for speech-to-text.
 * Language defaults to it-IT.
 * Handles start/stop/interim/final/error states.
 */
export function useSpeechToText({
  onResult,
  lang = 'it-IT',
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const [isSupported] = useState(() => getSpeechRecognitionConstructor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  // Keep the callback ref up to date
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const start = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setError(null);
    setInterimText('');

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result) {
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
      }

      setInterimText(interim);

      if (final) {
        onResultRef.current(final);
        setInterimText('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are not critical errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      setError(`Errore riconoscimento vocale: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    start,
    stop,
    error,
  };
}
