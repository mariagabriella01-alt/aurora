import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface AccessibilityContextValue {
  speechOutputSupported: boolean;
  speechInputSupported: boolean;
  speakingId: string | null;
  spokenCaption: string | null;
  autoReadAssistant: boolean;
  setAutoReadAssistant: (val: boolean) => void;
  easyVisualMode: boolean;
  setEasyVisualMode: (val: boolean) => void;
  listeningCommand: boolean;
  lastCommandHeard: string | null;
  commandFeedback: string | null;
  speak: (text: string, id?: string) => void;
  stopSpeaking: () => void;
  startVoiceCommand: () => void;
  stopVoiceCommand: () => void;
}

const KNOWN_FEMALE_PT_KEYWORDS = [
  'francisca',
  'thalita',
  'maria',
  'heloisa',
  'luciana',
  'fernanda',
  'vitoria',
  'vitória',
  'camila',
  'leticia',
  'letícia',
  'isabela',
  'clara',
  'joana',
  'catarina',
  'ines',
  'inês',
  'raquel',
  'google português do brasil',
  'google portugues do brasil',
  'pt-br-x-afs',
  'pt-br-x-pte',
  'female',
  'feminina',
  'mulher',
];

const KNOWN_MALE_PT_KEYWORDS = [
  'daniel',
  'antonio',
  'antónio',
  'felipe',
  'thiago',
  'tiago',
  'ricardo',
  'gabriel',
  'cristiano',
  'duarte',
  'humberto',
  'julio',
  'júlio',
  'nicolau',
  'male',
  'masculin',
  'pt-br-x-ptd',
  'pt-br-x-ptm',
];

function selectFemalePortugueseVoice(voices: SpeechSynthesisVoice[]): {
  voice: SpeechSynthesisVoice | null;
  isExplicitlyFemale: boolean;
} {
  if (!voices || voices.length === 0) {
    return { voice: null, isExplicitlyFemale: false };
  }

  const ptVoices = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('pt'));
  if (ptVoices.length === 0) {
    return { voice: null, isExplicitlyFemale: false };
  }

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  let bestIsFemale = false;

  for (const voice of ptVoices) {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();

    const isFemale = KNOWN_FEMALE_PT_KEYWORDS.some((kw) => name.includes(kw));
    const isMale = KNOWN_MALE_PT_KEYWORDS.some((kw) => name.includes(kw));

    let score = 0;
    if (lang === 'pt-br') score += 40;
    else if (lang.startsWith('pt-br')) score += 30;
    else if (lang.startsWith('pt')) score += 10;

    if (isFemale) score += 100;
    if (isMale) score -= 120;

    if (name.includes('natural') || name.includes('neural') || name.includes('online') || name.includes('enhanced') || name.includes('premium')) {
      score += 25;
    }

    if (name.includes('google')) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
      bestIsFemale = isFemale && !isMale;
    }
  }

  return { voice: bestVoice, isExplicitlyFemale: bestIsFemale };
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
  const speechOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechInputSupported = getSpeechRecognitionConstructor() !== null;

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [spokenCaption, setSpokenCaption] = useState<string | null>(null);
  const [autoReadAssistant, setAutoReadAssistant] = useState(true);
  const [easyVisualMode, setEasyVisualMode] = useState(false);

  const [listeningCommand, setListeningCommand] = useState(false);
  const [lastCommandHeard, setLastCommandHeard] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const speechSeqRef = useRef(0);

  useEffect(() => {
    if (!speechOutputSupported) return;

    const refreshVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list.length > 0) {
          voicesRef.current = list;
        }
      } catch {
        // Ignore voice enumeration errors
      }
    };

    refreshVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
    };
  }, [speechOutputSupported]);

  const SILENT_WAV_URI =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  const getOrCreatePlayer = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const unlockMobileAudio = useCallback(() => {
    try {
      const player = getOrCreatePlayer();
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

  const stopActiveAudio = useCallback(() => {
    speechSeqRef.current += 1;
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      } catch {
        // Ignore audio stop errors
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    stopActiveAudio();
    setSpeakingId(null);
    setSpokenCaption(null);
  }, [stopActiveAudio]);

  const speakWithBrowserFallback = useCallback(
    (text: string, id: string, seq: number) => {
      if (seq !== speechSeqRef.current) return;
      if (!speechOutputSupported) {
        setSpeakingId(null);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.94;

        const liveVoices = window.speechSynthesis.getVoices();
        const availableVoices = liveVoices.length > 0 ? liveVoices : voicesRef.current;
        const { voice: femaleVoice, isExplicitlyFemale } =
          selectFemalePortugueseVoice(availableVoices);

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
        utterance.pitch = isExplicitlyFemale ? 1.03 : 1.1;

        utterance.onstart = () => {
          if (seq !== speechSeqRef.current) return;
          setSpeakingId(id);
          setSpokenCaption(text);
        };
        utterance.onend = () => {
          if (seq !== speechSeqRef.current) return;
          setSpeakingId(null);
        };
        utterance.onerror = () => {
          if (seq !== speechSeqRef.current) return;
          setSpeakingId(null);
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        if (seq === speechSeqRef.current) {
          setSpeakingId(null);
        }
      }
    },
    [speechOutputSupported],
  );

  const playAudioUrl = useCallback(
    (url: string, text: string, id: string, seq: number): Promise<boolean> => {
      return new Promise((resolve) => {
        if (seq !== speechSeqRef.current) {
          resolve(false);
          return;
        }
        try {
          const audio = getOrCreatePlayer();
          audio.muted = false;
          audio.pause();
          audio.src = url;
          audio.currentTime = 0;

          audio.onended = () => {
            if (seq === speechSeqRef.current) {
              setSpeakingId(null);
            }
          };

          audio.onerror = () => {
            resolve(false);
          };

          setSpeakingId(id);
          setSpokenCaption(text);
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => resolve(true)).catch(() => resolve(false));
          } else {
            resolve(true);
          }
        } catch {
          resolve(false);
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

      setSpeakingId(id);
      setSpokenCaption(cleanText);

      const cachedUrl = audioCacheRef.current.get(cleanText);
      if (cachedUrl) {
        audioCacheRef.current.delete(cleanText);
        audioCacheRef.current.set(cleanText, cachedUrl);
        void playAudioUrl(cachedUrl, cleanText, id, seq).then((ok) => {
          if (!ok && seq === speechSeqRef.current) {
            speakWithBrowserFallback(cleanText, id, seq);
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
            body: JSON.stringify({ text: cleanText.slice(0, 2200) }),
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`TTS HTTP ${res.status}`);
          }

          const blob = await res.blob();
          if (seq !== speechSeqRef.current || controller.signal.aborted) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          if (audioCacheRef.current.size >= 25) {
            const oldest = audioCacheRef.current.entries().next().value as
              | [string, string]
              | undefined;
            if (oldest) {
              URL.revokeObjectURL(oldest[1]);
              audioCacheRef.current.delete(oldest[0]);
            }
          }
          audioCacheRef.current.set(cleanText, objectUrl);

          const ok = await playAudioUrl(objectUrl, cleanText, id, seq);
          if (!ok && seq === speechSeqRef.current) {
            speakWithBrowserFallback(cleanText, id, seq);
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return;
          if (seq === speechSeqRef.current) {
            speakWithBrowserFallback(cleanText, id, seq);
          }
        } finally {
          if (ttsAbortRef.current === controller) {
            ttsAbortRef.current = null;
          }
        }
      })();
    },
    [playAudioUrl, speakWithBrowserFallback, stopActiveAudio, unlockMobileAudio],
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
          'Oi, você está bem? Você está na Aurora, um novo começo, uma nova esperança. Aqui você pode desabafar, conversar com a assistente Clara, respirar com calma, ter um momento com Deus e lembrar motivos para viver.';
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
        normalized.includes('clara') ||
        normalized.includes('convers')
      ) {
        onNavigateSection('assistente');
        speak('Abrindo a conversa com a assistente Clara.', 'nav-assistant');
        setCommandFeedback('Indo para a Assistente.');
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
        `Ouvi "${rawTranscript}". Diga: "desabafar", "assistente", "saúde mental", "Deus", "motivos" ou "ajuda".`,
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
    setListeningCommand(false);
  }, []);

  const startVoiceCommand = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setCommandFeedback(
        'O reconhecimento de voz não está disponível neste navegador. Use os botões visuais grandes ou a leitura em voz alta.',
      );
      return;
    }

    stopSpeaking();

    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore
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
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
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
      setCommandFeedback('Pode falar o comando agora: "desabafar", "assistente", "Deus", "motivos" ou "ajuda".');
      setListeningCommand(true);
      rec.start();
    } catch {
      setListeningCommand(false);
      setCommandFeedback('Não foi possível iniciar o microfone neste navegador.');
    }
  }, [executeVoiceCommand, stopSpeaking]);

  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      try {
        recognitionRef.current?.stop();
        stopActiveAudio();
        for (const url of cache.values()) {
          URL.revokeObjectURL(url);
        }
        cache.clear();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [stopActiveAudio]);

  return (
    <AccessibilityContext.Provider
      value={{
        speechOutputSupported,
        speechInputSupported,
        speakingId,
        spokenCaption,
        autoReadAssistant,
        setAutoReadAssistant,
        easyVisualMode,
        setEasyVisualMode,
        listeningCommand,
        lastCommandHeard,
        commandFeedback,
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
