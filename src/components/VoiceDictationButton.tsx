import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionLike,
} from '../context/AccessibilityContext';

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  label?: string;
  onStatusChange?: (status: string | null) => void;
  className?: string;
}

export function VoiceDictationButton({
  onTranscript,
  label = 'Falar por voz',
  onStatusChange,
  className = '',
}: VoiceDictationButtonProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = getSpeechRecognitionConstructor() !== null;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const handleToggle = () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      setListening(false);
      onStatusChange?.(null);
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      onStatusChange?.('Ditado por voz não disponível neste navegador.');
      return;
    }

    try {
      const rec = new Recognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
        if (transcript) {
          onTranscript(transcript);
          onStatusChange?.(`Texto capturado por voz: "${transcript}"`);
        }
      };

      rec.onerror = (event) => {
        setListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onStatusChange?.('Permita o microfone no navegador para falar sua mensagem.');
        } else {
          onStatusChange?.('Não foi possível ouvir sua fala. Tente falar mais perto do microfone.');
        }
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
      setListening(true);
      onStatusChange?.('Ouvindo sua voz agora... pode falar.');
      rec.start();
    } catch {
      setListening(false);
      onStatusChange?.('Não foi possível ativar o microfone neste aparelho.');
    }
  };

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={listening}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[38px] sm:px-3 ${
        listening
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#13382C] hover:text-[#13382C]'
      } ${className}`}
    >
      {listening ? (
        <>
          <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Parar fala</span>
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
