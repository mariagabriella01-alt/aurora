import { Square, Volume2 } from 'lucide-react';
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
  const { speakingId, speak, stopSpeaking } = useAccessibility();
  const isSpeaking = speakingId === id;

  return (
    <button
      type="button"
      onClick={() => (isSpeaking ? stopSpeaking() : speak(text, id))}
      aria-pressed={isSpeaking}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[32px] sm:px-2.5 sm:py-1 ${
        isSpeaking
          ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
          : 'border-[#DFCE91] bg-[#FFFDF4] text-[#44403C] hover:border-[#13382C] hover:text-[#13382C]'
      } ${className}`}
    >
      {isSpeaking ? (
        <>
          <Square className="h-3 w-3 fill-current" aria-hidden="true" />
          <span>Parar áudio</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
