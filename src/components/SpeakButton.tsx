import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

interface SpeakButtonProps {
  id: string;
  text: string;
  label?: string;
  className?: string;
}

export function SpeakButton({
  id,
  text,
  label = 'Ouvir saudação',
  className = '',
}: SpeakButtonProps) {
  const {
    speechOutputSupported,
    loadingSpeechId,
    speakingId,
    prepareAudioForPlayback,
    speak,
    stopSpeaking,
  } = useAccessibility();

  if (!speechOutputSupported) return null;

  const isLoading = loadingSpeechId === id;
  const isSpeaking = speakingId === id;

  const handleClick = () => {
    prepareAudioForPlayback();
    if (isSpeaking || isLoading) {
      stopSpeaking();
      return;
    }
    speak(text, id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSpeaking}
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[36px] sm:px-3 sm:py-1.5 sm:text-xs ${
        isSpeaking
          ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
          : 'border-[#DFCE91] bg-[#FFFDF4] text-[#13382C] hover:border-[#13382C] hover:bg-[#FAF0CA]'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Preparando áudio...</span>
        </>
      ) : isSpeaking ? (
        <>
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
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
