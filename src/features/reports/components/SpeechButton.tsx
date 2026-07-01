import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface SpeechButtonProps {
  /** Callback when final text is recognized — text is appended to description */
  onResult: (text: string) => void;
  /** Callback to lift interim text up to parent for real-time display */
  onInterimChange?: (text: string) => void;
}

/**
 * Mic button for speech-to-text.
 * Hidden if the browser doesn't support Web Speech API (graceful degradation).
 * Red background during recording; MicOff icon to indicate "stop".
 */
export function SpeechButton({ onResult, onInterimChange }: SpeechButtonProps) {
  const { isSupported, isListening, interimText, start, stop, error } =
    useSpeechToText({ onResult });

  // Lift interim text changes to parent
  const prevInterimRef = useRef(interimText);
  useEffect(() => {
    if (onInterimChange && interimText !== prevInterimRef.current) {
      prevInterimRef.current = interimText;
      onInterimChange(interimText);
    }
  }, [interimText, onInterimChange]);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] h-11 w-11 rounded-md border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          isListening
            ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
            : 'border-input bg-background text-foreground hover:bg-accent'
        }`}
        aria-label={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
        title={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
