import { Loader2, Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  getMicrophoneErrorMessage,
  getSpeechRecognitionConstructor,
  isAnyVoiceInputSupported,
  isLikelyIosDevice,
  isMediaRecordingSupported,
  pickSupportedAudioMimeType,
  transcribeAudioBlob,
  type SpeechRecognitionLike,
} from '../utils/voiceCapture';

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
  const { prepareAudioForPlayback, stopSpeaking } = useAccessibility();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const stopMediaStream = () => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track cleanup error
        }
      }
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignore
      }
      stopMediaStream();
    };
  }, []);

  const startMediaRecordingFallback = async () => {
    if (!isMediaRecordingSupported()) {
      onStatusChange?.(
        'Seu navegador não suporta captura de áudio por microfone. Tente usar Chrome ou Safari atualizado, ou digite sua mensagem.',
      );
      return;
    }

    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onerror = () => {
        stopMediaStream();
        setListening(false);
        setTranscribing(false);
        onStatusChange?.('Não foi possível gravar o áudio neste aparelho. Você pode digitar normalmente.');
      };

      recorder.onstop = async () => {
        stopMediaStream();
        setListening(false);

        if (cancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const effectiveMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: effectiveMime });
        audioChunksRef.current = [];

        if (blob.size < 400) {
          onStatusChange?.('Não ouvi sua fala com clareza. Toque no microfone e tente falar mais perto.');
          return;
        }

        setTranscribing(true);
        onStatusChange?.('Entendendo o que você falou...');
        try {
          const transcript = await transcribeAudioBlob(blob, effectiveMime);
          if (transcript) {
            onTranscript(transcript);
            onStatusChange?.(`Texto capturado por voz: "${transcript}"`);
          } else {
            onStatusChange?.('Não consegui ouvir palavras claras. Tente falar um pouco mais perto do microfone.');
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Não foi possível transcrever sua fala agora. Tente novamente ou digite.';
          onStatusChange?.(message);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setListening(true);
      onStatusChange?.('Gravando sua voz... pode falar e depois toque em "Parar fala".');

      autoStopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 28_000);
    } catch (err) {
      stopMediaStream();
      setListening(false);
      onStatusChange?.(getMicrophoneErrorMessage(err));
    }
  };

  const handleToggle = () => {
    if (transcribing) return;

    // Unlock audio output synchronously on user gesture so mobile Safari/Chrome plays Sophia's spoken reply right after.
    prepareAudioForPlayback();
    stopSpeaking();

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          return;
        }
      } catch {
        // Ignore
      }
      stopMediaStream();
      setListening(false);
      onStatusChange?.(null);
      return;
    }

    if (!isAnyVoiceInputSupported()) {
      onStatusChange?.(
        'Seu navegador não liberou o microfone aqui. Use o Chrome ou Safari atualizado, ou escreva no campo ao lado.',
      );
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    const preferRecorder = isLikelyIosDevice() || !Recognition;

    if (preferRecorder) {
      void startMediaRecordingFallback();
      return;
    }

    try {
      const rec = new Recognition();
      rec.lang = 'pt-BR';
      rec.continuous = false;
      rec.interimResults = false;

      let gotResult = false;

      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
        if (transcript) {
          gotResult = true;
          onTranscript(transcript);
          onStatusChange?.(`Texto capturado por voz: "${transcript}"`);
        }
      };

      rec.onerror = (event) => {
        setListening(false);
        if (
          (event.error === 'service-not-allowed' ||
            event.error === 'audio-capture' ||
            event.error === 'network') &&
          isMediaRecordingSupported()
        ) {
          void startMediaRecordingFallback();
          return;
        }
        if (event.error === 'not-allowed') {
          onStatusChange?.('Permita o microfone no navegador para falar sua mensagem.');
        } else if (event.error === 'no-speech') {
          onStatusChange?.('Não ouvi nenhuma fala. Toque no microfone e fale próximo ao aparelho.');
        } else {
          onStatusChange?.('Não foi possível ouvir sua fala. Tente novamente ou digite sua mensagem.');
        }
      };

      rec.onend = () => {
        setListening(false);
        if (!gotResult && mediaRecorderRef.current?.state !== 'recording') {
          // Keep status feedback if any error occurred
        }
      };

      recognitionRef.current = rec;
      setListening(true);
      onStatusChange?.('Ouvindo sua voz agora... pode falar.');
      rec.start();
    } catch {
      setListening(false);
      if (isMediaRecordingSupported()) {
        void startMediaRecordingFallback();
      } else {
        onStatusChange?.('Não foi possível ativar o microfone neste aparelho.');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={transcribing}
      aria-pressed={listening}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-65 whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[38px] sm:px-3 sm:py-2 sm:text-xs ${
        listening
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#13382C] hover:text-[#13382C]'
      } ${className}`}
    >
      {transcribing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>Entendendo...</span>
        </>
      ) : listening ? (
        <>
          <MicOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>Parar fala</span>
        </>
      ) : (
        <>
          <Mic className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
