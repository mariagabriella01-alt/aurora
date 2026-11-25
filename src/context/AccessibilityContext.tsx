import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
  const speechOutputSupported = typeof window !== 'undefined' && typeof Audio !== 'undefined';
  const speechInputSupported = isAnyVoiceInputSupported();

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const activeVoiceTagRef = useRef<string | null>(null);
  const speechSeqRef = useRef(0);

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

  const SILENT_WAV_URI =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  const getOrCreatePlayer = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const unlockMobileAudio = useCallback(() => {
    try {
      const player = getOrCreatePlayer();
      if (
        !player.paused &&
        player.currentTime > 0 &&
        player.src &&
        !player.src.startsWith('data:audio/wav')
      ) {
        return;
      }
      player.muted = true;
      player.src = SILENT_WAV_URI;
      const p = player.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          player.pause();
          player.muted = false;
        }).catch(() => {
          player.muted = false;
        });
      } else {
        player.muted = false;
      }
    } catch {
      // Ignore unlock issues
    }
  }, [getOrCreatePlayer]);

  const prepareAudioForPlayback = useCallback(() => {
    unlockMobileAudio();
  }, [unlockMobileAudio]);

  const clearAudioCache = useCallback(() => {
    for (const url of audioCacheRef.current.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore revoke errors
      }
    }
    audioCacheRef.current.clear();
  }, []);

  const stopActiveAudio = useCallback(() => {
    speechSeqRef.current += 1;
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // Ignore audio stop errors
      }
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    stopActiveAudio();
    setSpeakingId(null);
    setSpokenCaption(null);
  }, [stopActiveAudio]);

  const playAudioUrl = useCallback(
    (
      url: string,
      text: string,
      id: string,
      seq: number,
    ): Promise<{ ok: boolean; blocked?: boolean }> => {
      return new Promise((resolve) => {
        if (seq !== speechSeqRef.current) {
          resolve({ ok: false });
          return;
        }
        try {
          const audio = getOrCreatePlayer();
          audio.onended = null;
          audio.onerror = null;
          audio.muted = false;
          audio.playbackRate = 1.0;
          audio.pause();
          audio.src = url;
          audio.currentTime = 0;

          audio.onended = () => {
            if (seq === speechSeqRef.current) {
              setSpeakingId(null);
            }
          };

          audio.onerror = () => {
            if (seq === speechSeqRef.current) {
              setSpeakingId(null);
            }
            resolve({ ok: false });
          };

          setSpeakingId(id);
          setSpokenCaption(text);
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                if (seq !== speechSeqRef.current) {
                  try {
                    audio.pause();
                  } catch {
                    // Ignore
                  }
                  resolve({ ok: false });
                  return;
                }
                resolve({ ok: true });
              })
              .catch((err: unknown) => {
                const name = (err as { name?: string })?.name || '';
                resolve({ ok: false, blocked: name === 'NotAllowedError' });
              });
          } else {
            resolve({ ok: true });
          }
        } catch {
          resolve({ ok: false });
        }
      });
    },
    [getOrCreatePlayer],
  );

  const speak = useCallback(
    (text: string, id = 'global') => {
      const cleanText = text.trim();
      if (!cleanText) return;

      stopActiveAudio();
      const seq = speechSeqRef.current;

      setSpeechError(null);
      setSpeakingId(id);
      setSpokenCaption(cleanText);

      const cachedUrl = audioCacheRef.current.get(cleanText);
      if (cachedUrl) {
        audioCacheRef.current.delete(cleanText);
        audioCacheRef.current.set(cleanText, cachedUrl);
        void playAudioUrl(cachedUrl, cleanText, id, seq).then(({ ok, blocked }) => {
          if (!ok && seq === speechSeqRef.current) {
            setSpeakingId(null);
            if (blocked) {
              setSpeechError('Toque em "Ouvir Sophia" para iniciar a reprodução neste aparelho.');
            } else {
              setSpeechError('Não foi possível reproduzir o áudio neste navegador.');
            }
          }
        });
        return;
      }

      unlockMobileAudio();

      const controller = new AbortController();
      ttsAbortRef.current = controller;

      void (async () => {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ text: cleanText.slice(0, 2200) }),
            signal: controller.signal,
          });

          const contentType = (res.headers.get('content-type') || '').toLowerCase();

          if (!res.ok) {
            let apiError = 'Não foi possível gerar o áudio com a voz da Sophia agora.';
            try {
              const errData = (await res.json()) as { error?: string };
              if (errData?.error) {
                apiError = errData.error;
              }
            } catch {
              if (res.status === 404) {
                apiError =
                  'O serviço de voz (/api/tts) não foi encontrado neste servidor. Verifique a configuração da Vercel.';
              }
            }
            if (seq === speechSeqRef.current && !controller.signal.aborted) {
              setSpeakingId(null);
              setSpeechError(apiError);
            }
            return;
          }

          if (!contentType.includes('audio/')) {
            if (seq === speechSeqRef.current && !controller.signal.aborted) {
              setSpeakingId(null);
              setSpeechError(
                'O servidor não retornou um áudio válido para a voz personalizada. Verifique as rotas /api na Vercel.',
              );
            }
            return;
          }

          const voiceTag = res.headers.get('x-aurora-voice-id');
          if (voiceTag && activeVoiceTagRef.current && activeVoiceTagRef.current !== voiceTag) {
            clearAudioCache();
          }
          if (voiceTag) {
            activeVoiceTagRef.current = voiceTag;
          }

          const blob = await res.blob();
          if (seq !== speechSeqRef.current || controller.signal.aborted) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          if (audioCacheRef.current.size >= 40) {
            const oldest = audioCacheRef.current.entries().next().value as
              | [string, string]
              | undefined;
            if (oldest) {
              URL.revokeObjectURL(oldest[1]);
              audioCacheRef.current.delete(oldest[0]);
            }
          }
          audioCacheRef.current.set(cleanText, objectUrl);

          const { ok, blocked } = await playAudioUrl(objectUrl, cleanText, id, seq);
          if (!ok && seq === speechSeqRef.current) {
            setSpeakingId(null);
            if (blocked) {
              setSpeechError('Toque em "Ouvir Sophia" para iniciar o áudio neste aparelho.');
            } else {
              setSpeechError('Não foi possível reproduzir o áudio gerado neste aparelho.');
            }
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return;
          if (seq === speechSeqRef.current) {
            setSpeakingId(null);
            setSpeechError('Erro de conexão ao gerar a voz personalizada da Sophia.');
          }
        } finally {
          if (ttsAbortRef.current === controller) {
            ttsAbortRef.current = null;
          }
        }
      })();
    },
    [clearAudioCache, playAudioUrl, stopActiveAudio, unlockMobileAudio],
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

      if (
        normalized.includes('ler') ||
        normalized.includes('ouvir') ||
        normalized.includes('falar tudo')
      ) {
        const welcome =
          'Oi, você está bem? Você está na Aurora, um novo começo, uma nova esperança. Aqui você pode desabafar, conversar com a assistente Sophia, acompanhar sua jornada em Minha Superação, respirar com calma, ter um momento com Deus e lembrar motivos para viver.';
        speak(welcome, 'welcome-summary');
        setCommandFeedback('Lendo boas-vindas em voz alta.');
        return;
      }

      if (normalized.includes('desabaf') || normalized.includes('mural') || normalized.includes('escrever')) {
        onComposeVent();
        speak('Abrindo o espaço para você desabafar.', 'nav-vent');
        setCommandFeedback('Indo para Desabafar.');
        return;
      }

      if (
        normalized.includes('assistent') ||
        normalized.includes('sophia') ||
        normalized.includes('sofia') ||
        normalized.includes('convers')
      ) {
        onNavigateSection('assistente');
        speak('Abrindo a conversa com a assistente Sophia.', 'nav-assistant');
        setCommandFeedback('Indo para a Sophia.');
        return;
      }

      if (
        normalized.includes('supera') ||
        normalized.includes('vicio') ||
        normalized.includes('habito') ||
        normalized.includes('recaida')
      ) {
        onNavigateSection('superacao');
        speak('Abrindo o espaço Minha Superação para acompanhar seu progresso.', 'nav-recovery');
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
        speak('Abrindo os cuidados de saúde mental e respiração.', 'nav-mental');
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
        speak('Abrindo o Espaço de Deus, orações e versículos da Bíblia.', 'nav-god');
        setCommandFeedback('Indo para o Espaço de Deus.');
        return;
      }

      if (
        normalized.includes('motivo') ||
        normalized.includes('viver') ||
        normalized.includes('esperanca')
      ) {
        onNavigateSection('motivos');
        speak('Abrindo os motivos para viver e mensagens de esperança.', 'nav-reasons');
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
        speak('Abrindo os telefones de apoio imediato. No Brasil, ligue 188 gratuitamente.', 'nav-help');
        setCommandFeedback('Indo para Ajuda Imediata (188).');
        return;
      }

      setCommandFeedback(
        `Ouvi "${rawTranscript}". Diga: "desabafar", "Sophia", "superação", "saúde mental", "Deus", "motivos" ou "ajuda".`,
      );
    },
    [onComposeVent, onNavigateSection, speak, stopSpeaking],
  );

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

  const startCommandRecorderFallback = useCallback(async () => {
    if (!isMediaRecordingSupported()) {
      setCommandFeedback(
        'O reconhecimento de voz não está disponível neste navegador. Use os botões visuais ou toque em Ouvir guia.',
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
  }, [executeVoiceCommand, prepareAudioForPlayback, startCommandRecorderFallback, stopSpeaking]);

  useEffect(() => {
    return () => {
      commandCancelledRef.current = true;
      try {
        recognitionRef.current?.stop();
        if (commandRecorderRef.current && commandRecorderRef.current.state !== 'inactive') {
          commandRecorderRef.current.stop();
        }
        stopCommandStream();
        stopActiveAudio();
        clearAudioCache();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [clearAudioCache, stopActiveAudio, stopCommandStream]);

  return (
    <AccessibilityContext.Provider
      value={{
        speechOutputSupported,
        speechInputSupported,
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
