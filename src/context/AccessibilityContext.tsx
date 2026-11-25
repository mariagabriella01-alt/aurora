import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { shopiaVoiceService } from '../services/shopiaVoiceService';
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

export { getSpeechRecognitionConstructor, type SpeechRecognitionLike };

interface AccessibilityContextValue {
  speechOutputSupported: boolean;
  speechInputSupported: boolean;
  loadingSpeechId: string | null;
  speakingId: string | null;
  spokenCaption: string | null;
  speechError: string | null;
  clearSpeechError: () => void;
  autoReadAssistant: boolean;
  setAutoReadAssistant: (val: boolean) => void;
  easyVisualMode: boolean;
  setEasyVisualMode: (val: boolean) => void;
  listeningCommand: boolean;
  lastCommandHeard: string | null;
  commandFeedback: string | null;
  prepareAudioForPlayback: () => void;
  speak: (text: string, id?: string) => void;
  stopSpeaking: () => void;
  startVoiceCommand: () => void;
  stopVoiceCommand: () => void;
  registerMicInterrupt: (id: string, stopFn: () => void) => () => void;
  claimMicrophone: (ownerId: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

interface AccessibilityProviderProps {
  children: ReactNode;
  onNavigateSection: (sectionId: string) => void;
  onComposeVent: () => void;
}

export function AccessibilityProvider({
  children,
  onNavigateSection,
  onComposeVent,
}: AccessibilityProviderProps) {
  const speechOutputSupported = shopiaVoiceService.isSupported();
  const speechInputSupported = isAnyVoiceInputSupported();

  const [loadingSpeechId, setLoadingSpeechId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [spokenCaption, setSpokenCaption] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [autoReadAssistant, setAutoReadAssistant] = useState(true);
  const [easyVisualMode, setEasyVisualMode] = useState(false);

  const [listeningCommand, setListeningCommand] = useState(false);
  const [lastCommandHeard, setLastCommandHeard] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const commandRecorderRef = useRef<MediaRecorder | null>(null);
  const commandStreamRef = useRef<MediaStream | null>(null);
  const commandChunksRef = useRef<Blob[]>([]);
  const commandTimerRef = useRef<number | null>(null);
  const commandCancelledRef = useRef(false);
  const micInterruptHandlersRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    shopiaVoiceService.setCallbacks({
      onLoadingChange: setLoadingSpeechId,
      onSpeakingChange: setSpeakingId,
      onCaptionChange: setSpokenCaption,
      onErrorChange: setSpeechError,
    });
    const handlePageLeave = () => {
      shopiaVoiceService.stop();
    };
    window.addEventListener('pagehide', handlePageLeave);
    window.addEventListener('beforeunload', handlePageLeave);
    return () => {
      window.removeEventListener('pagehide', handlePageLeave);
      window.removeEventListener('beforeunload', handlePageLeave);
      shopiaVoiceService.destroy();
    };
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  const stopCommandStream = useCallback(() => {
    if (commandTimerRef.current !== null) {
      window.clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
    if (commandStreamRef.current) {
      for (const track of commandStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      }
      commandStreamRef.current = null;
    }
  }, []);

  const prepareAudioForPlayback = useCallback(() => {
    shopiaVoiceService.unlockAudio();
  }, []);

  const stopSpeaking = useCallback(() => {
    shopiaVoiceService.stop();
  }, []);

  const speak = useCallback((text: string, id = 'global') => {
    shopiaVoiceService.speak(text, id);
  }, []);

  const registerMicInterrupt = useCallback((id: string, stopFn: () => void) => {
    micInterruptHandlersRef.current.set(id, stopFn);
    return () => {
      micInterruptHandlersRef.current.delete(id);
    };
  }, []);

  const stopVoiceCommand = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    try {
      if (commandRecorderRef.current && commandRecorderRef.current.state === 'recording') {
        commandRecorderRef.current.stop();
        return;
      }
    } catch {
      // Ignore recorder stop errors
    }
    stopCommandStream();
    setListeningCommand(false);
  }, [stopCommandStream]);

  const claimMicrophone = useCallback(
    (ownerId: string) => {
      if (ownerId !== 'voice-command') {
        stopVoiceCommand();
      }
      for (const [id, stopHandler] of micInterruptHandlersRef.current.entries()) {
        if (id !== ownerId) {
          try {
            stopHandler();
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    },
    [stopVoiceCommand],
  );

  const executeVoiceCommand = useCallback(
    (rawTranscript: string) => {
      const normalized = rawTranscript
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      setLastCommandHeard(rawTranscript);

      if (normalized.includes('parar') || normalized.includes('silencio')) {
        stopSpeaking();
        setCommandFeedback('Áudio interrompido.');
        return;
      }

      if (normalized.includes('inicio') || normalized.includes('topo')) {
        onNavigateSection('inicio');
        setCommandFeedback('Indo para o Início.');
        return;
      }

      if (normalized.includes('desabaf') || normalized.includes('mural') || normalized.includes('escrever')) {
        onComposeVent();
        setCommandFeedback('Indo para Desabafar.');
        return;
      }

      if (
        normalized.includes('assistent') ||
        normalized.includes('sophia') ||
        normalized.includes('shopia') ||
        normalized.includes('sofia') ||
        normalized.includes('convers')
      ) {
        onNavigateSection('assistente');
        setCommandFeedback('Indo para a assistente Sophia.');
        return;
      }

      if (
        normalized.includes('supera') ||
        normalized.includes('vicio') ||
        normalized.includes('habito') ||
        normalized.includes('recaida')
      ) {
        onNavigateSection('superacao');
        setCommandFeedback('Indo para Minha Superação.');
        return;
      }

      if (
        normalized.includes('saude') ||
        normalized.includes('respir') ||
        normalized.includes('vazio') ||
        normalized.includes('trabalho') ||
        normalized.includes('bullying') ||
        normalized.includes('comparacao')
      ) {
        onNavigateSection('saude-mental');
        setCommandFeedback('Indo para Saúde Mental.');
        return;
      }

      if (
        normalized.includes('deus') ||
        normalized.includes('oracao') ||
        normalized.includes('orar') ||
        normalized.includes('biblia') ||
        normalized.includes('versiculo')
      ) {
        onNavigateSection('espaco-de-deus');
        setCommandFeedback('Indo para o Espaço de Deus.');
        return;
      }

      if (
        normalized.includes('motivo') ||
        normalized.includes('viver') ||
        normalized.includes('esperanca')
      ) {
        onNavigateSection('motivos');
        setCommandFeedback('Indo para Motivos para Viver.');
        return;
      }

      if (
        normalized.includes('ajuda') ||
        normalized.includes('socorro') ||
        normalized.includes('188') ||
        normalized.includes('cvv')
      ) {
        onNavigateSection('ajuda');
        setCommandFeedback('Indo para Ajuda Imediata (188).');
        return;
      }

      setCommandFeedback(
        `Ouvi "${rawTranscript}". Diga: "desabafar", "Sophia", "superação", "saúde mental", "Deus", "motivos", "ajuda" ou "parar".`,
      );
    },
    [onComposeVent, onNavigateSection, stopSpeaking],
  );

  const startCommandRecorderFallback = useCallback(async () => {
    if (!isMediaRecordingSupported()) {
      setCommandFeedback(
        'O reconhecimento de voz não está disponível neste navegador. Use os botões visuais ou converse por texto com a Sophia.',
      );
      return;
    }

    commandCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      commandStreamRef.current = stream;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      commandChunksRef.current = [];
      commandRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          commandChunksRef.current.push(ev.data);
        }
      };

      recorder.onerror = () => {
        stopCommandStream();
        setListeningCommand(false);
        setCommandFeedback('Não foi possível capturar o comando de voz agora.');
      };

      recorder.onstop = async () => {
        stopCommandStream();
        setListeningCommand(false);

        if (commandCancelledRef.current) {
          commandChunksRef.current = [];
          return;
        }

        const effectiveMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(commandChunksRef.current, { type: effectiveMime });
        commandChunksRef.current = [];

        if (blob.size < 400) {
          setCommandFeedback('Não ouvi nenhum comando. Toque no microfone e fale próximo ao aparelho.');
          return;
        }

        setCommandFeedback('Entendendo seu comando de voz...');
        try {
          const transcript = await transcribeAudioBlob(blob, effectiveMime);
          if (transcript) {
            executeVoiceCommand(transcript);
          } else {
            setCommandFeedback('Não ouvi nenhuma fala clara. Tente falar um pouco mais perto.');
          }
        } catch (err) {
          setCommandFeedback(
            err instanceof Error
              ? err.message
              : 'Não foi possível transcrever o comando de voz agora.',
          );
        }
      };

      recorder.start();
      setCommandFeedback(
        'Ouvindo... diga "Sophia", "desabafar", "superação", "Deus", "motivos" ou "ajuda" e toque em Parar.',
      );
      setListeningCommand(true);

      commandTimerRef.current = window.setTimeout(() => {
        if (commandRecorderRef.current && commandRecorderRef.current.state === 'recording') {
          commandRecorderRef.current.stop();
        }
      }, 8_000);
    } catch (err) {
      stopCommandStream();
      setListeningCommand(false);
      setCommandFeedback(getMicrophoneErrorMessage(err));
    }
  }, [executeVoiceCommand, stopCommandStream]);

  const startVoiceCommand = useCallback(() => {
    claimMicrophone('voice-command');
    prepareAudioForPlayback();
    stopSpeaking();

    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore
    }

    if (!isAnyVoiceInputSupported()) {
      setCommandFeedback(
        'O reconhecimento de voz não está disponível neste navegador. Use os botões visuais grandes ou a leitura em voz alta.',
      );
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (isLikelyIosDevice() || !Recognition) {
      void startCommandRecorderFallback();
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
          executeVoiceCommand(transcript);
        }
      };

      rec.onerror = (event) => {
        setListeningCommand(false);
        if (
          (event.error === 'service-not-allowed' ||
            event.error === 'audio-capture' ||
            event.error === 'network') &&
          isMediaRecordingSupported()
        ) {
          void startCommandRecorderFallback();
          return;
        }
        if (event.error === 'not-allowed') {
          setCommandFeedback('Permita o uso do microfone no navegador para usar comandos de voz.');
        } else if (event.error === 'no-speech') {
          setCommandFeedback('Não ouvi nenhuma fala. Toque no microfone e fale próximo ao aparelho.');
        } else {
          setCommandFeedback('Não foi possível capturar o comando de voz agora.');
        }
      };

      rec.onend = () => {
        setListeningCommand(false);
      };

      recognitionRef.current = rec;
      setCommandFeedback(
        'Pode falar o comando agora: "Sophia", "desabafar", "superação", "Deus", "motivos" ou "ajuda".',
      );
      setListeningCommand(true);
      rec.start();
    } catch {
      setListeningCommand(false);
      if (isMediaRecordingSupported()) {
        void startCommandRecorderFallback();
      } else {
        setCommandFeedback('Não foi possível iniciar o microfone neste navegador.');
      }
    }
  }, [
    claimMicrophone,
    executeVoiceCommand,
    prepareAudioForPlayback,
    startCommandRecorderFallback,
    stopSpeaking,
  ]);

  useEffect(() => {
    return () => {
      commandCancelledRef.current = true;
      try {
        recognitionRef.current?.stop();
        if (commandRecorderRef.current && commandRecorderRef.current.state !== 'inactive') {
          commandRecorderRef.current.stop();
        }
        stopCommandStream();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [stopCommandStream]);

  return (
    <AccessibilityContext.Provider
      value={{
        speechOutputSupported,
        speechInputSupported,
        loadingSpeechId,
        speakingId,
        spokenCaption,
        speechError,
        clearSpeechError,
        autoReadAssistant,
        setAutoReadAssistant,
        easyVisualMode,
        setEasyVisualMode,
        listeningCommand,
        lastCommandHeard,
        commandFeedback,
        prepareAudioForPlayback,
        speak,
        stopSpeaking,
        startVoiceCommand,
        stopVoiceCommand,
        registerMicInterrupt,
        claimMicrophone,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used inside AccessibilityProvider');
  }
  return ctx;
}
