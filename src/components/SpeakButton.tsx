import { Loader2, Square, Volume2 } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

interface SpeakButtonProps {
  text: string;
  id: string;
  label?: string;
  className?: string;
}

export function SpeakButton({
  text,
  id,
  label = 'Ouvir',
  className = '',
}: SpeakButtonProps) {
  const { loadingSpeechId, speakingId, speak, stopSpeaking } = useAccessibility();
  const isLoading = loadingSpeechId === id;
  const isSpeaking = speakingId === id;
  const isActive = isLoading || isSpeaking;

  return (
    <button
      type="button"
      onClick={() => (isActive ? stopSpeaking() : speak(text, id))}
      aria-pressed={isActive}
      aria-busy={isLoading}
      className={`inline-flex min-h-[34px] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[32px] sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${
        isActive
          ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
          : 'border-[#DFCE91] bg-[#FFFDF4] text-[#44403C] hover:border-[#13382C] hover:text-[#13382C]'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>Carregando voz...</span>
        </>
      ) : isSpeaking ? (
        <>
          <Square className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" aria-hidden="true" />
          <span>Parar áudio</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
