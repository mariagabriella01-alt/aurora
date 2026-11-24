import { BookText, Check, Copy, Feather, HandHeart, Lock, Pause, Play, RotateCcw, Send, Trash2, Volume2, VolumeX } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Prayer, PrayerIntention } from '../types';
import { formatRelativeTimePt } from '../utils/formatters';
import { ResilientImage } from './ResilientImage';
import { SpeakButton } from './SpeakButton';
import { VoiceDictationButton } from './VoiceDictationButton';

interface GodSpaceSectionProps {
  prayers: Prayer[];
  onPrayerCreated: (prayer: Prayer) => void;
  onPrayerUpdated: (prayer: Prayer) => void;
}

interface SpiritualState {
  id: string;
  label: string;
  reference: string;
  verse: string;
  reflection: string;
  prayer: string;
}

interface DevotionalStep {
  number: string;
  title: string;
  guidance: string;
  scripture: string;
}

interface LetterToGod {
  id: string;
  content: string;
  createdAt: string;
}

const SPIRITUAL_STATES: SpiritualState[] = [
  {
    id: 'vazio',
    label: 'Quando há vazio',
    reference: 'Salmos 34:18',
    verse: '“Perto está o Senhor dos que têm o coração quebrantado e salva os de espírito oprimido.”',
    reflection:
      'Deus não exige que você chegue até Ele com alegria ensaiada. Ele se aproxima exatamente quando não sobra força alguma dentro do peito.',
    prayer:
      'Senhor, Tu vês o silêncio que eu não sei explicar. Entra neste vazio com a Tua paz e sustenta o meu coração hoje.',
  },
  {
    id: 'medo',
    label: 'Quando o medo aperta',
    reference: 'Isaías 41:10',
    verse: '“Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.”',
    reflection:
      'A fé não apaga a existência dos dias difíceis, mas garante que você nunca atravessa a tempestade sem companhia divina.',
    prayer:
      'Pai, acalma os pensamentos que me assustam. Segura a minha mão e me ensina a descansar no Teu cuidado neste instante.',
  },
  {
    id: 'cansaco',
    label: 'Quando faltam forças',
    reference: 'Mateus 11:28',
    verse: '“Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.”',
    reflection:
      'Jesus não ofereceu uma cobrança pesada para quem está exausto — Ele ofereceu colo, descanso e alívio real para a alma cansada.',
    prayer:
      'Jesus, eu entrego o peso que tenho carregado sozinho(a). Recebo o Teu descanso e peço fôlego novo para continuar.',
  },
  {
    id: 'noite',
    label: 'Quando a noite é longa',
    reference: 'Lamentações 3:22-23',
    verse: '“As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã.”',
    reflection:
      'Cada novo amanhecer carrega uma graça nova que ainda não foi usada. O que doeu ontem não precisa definir o seu amanhã.',
    prayer:
      'Deus de misericórdia, guarda o meu sono e renova a minha esperança antes mesmo de o sol nascer novamente.',
  },
];

const DEVOTIONAL_STEPS: DevotionalStep[] = [
  {
    number: '01.',
    title: 'Silenciar diante de Deus',
    guidance:
      'Respire fundo e solte os ombros. Você não precisa usar palavras difíceis nem esconder como realmente se sente. Deus já conhece o seu coração e recebe você em paz.',
    scripture: '“Aquietai-vos e sabei que eu sou Deus.” — Salmos 46:10',
  },
  {
    number: '02.',
    title: 'Entregar o peso e o vazio',
    guidance:
      'Coloque diante dEle o que mais tem doído: a solidão, o cansaço, a culpa ou a falta de sentido. Entregue mentalmente ou escreva na sua carta privada ao lado.',
    scripture: '“Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.” — 1 Pedro 5:7',
  },
  {
    number: '03.',
    title: 'Receber paz e descanso',
    guidance:
      'Permaneça em silêncio por alguns instantes, deixando que a promessa de Deus alcance os lugares mais cansados da sua mente.',
    scripture: '“Deixo-vos a paz, a minha paz vos dou; não se turbe o vosso coração.” — João 14:27',
  },
  {
    number: '04.',
    title: 'Sair com um passo de esperança',
    guidance:
      'Agradeça por estar vivo(a) neste instante. Peça força apenas para as próximas horas de hoje, confiando que você não caminha só.',
    scripture: '“O Senhor é o meu pastor; nada me faltará.” — Salmos 23:1',
  },
];

const MOMENT_DURATIONS = [
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

const INTENTIONS: readonly PrayerIntention[] = [
  'Pedido de oração',
  'Palavra de paz',
  'Gratidão',
];

type VerseTopic =
  | 'Todos'
  | 'Para o vazio'
  | 'Ansiedade e medo'
  | 'Bullying e rejeição'
  | 'Trabalho e descanso'
  | 'Esperança';

interface BibleVerseItem {
  id: string;
  reference: string;
  topic: Exclude<VerseTopic, 'Todos'>;
  text: string;
}

const VERSE_TOPICS: readonly VerseTopic[] = [
  'Todos',
  'Para o vazio',
  'Ansiedade e medo',
  'Bullying e rejeição',
  'Trabalho e descanso',
  'Esperança',
];

const BIBLE_VERSES: BibleVerseItem[] = [
  {
    id: 'v-1',
    reference: 'Filipenses 4:6-7',
    topic: 'Ansiedade e medo',
    text: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará o vosso coração e a vossa mente.',
  },
  {
    id: 'v-2',
    reference: 'Salmos 139:14',
    topic: 'Bullying e rejeição',
    text: 'Eu te louvo porque de modo assombroso e tão maravilhoso fui formado; as tuas obras são admiráveis, e a minha alma o sabe muito bem.',
  },
  {
    id: 'v-3',
    reference: 'Salmos 27:10',
    topic: 'Bullying e rejeição',
    text: 'Porque, se meu pai e minha mãe me desampararem, o Senhor me acolherá.',
  },
  {
    id: 'v-4',
    reference: 'Salmos 127:2',
    topic: 'Trabalho e descanso',
    text: 'Inútil vos será levantar de madrugada, repousar tarde, comer o pão que penosamente granjeastes; aos seus amados ele o dá enquanto dormem.',
  },
  {
    id: 'v-5',
    reference: 'Eclesiastes 4:6',
    topic: 'Trabalho e descanso',
    text: 'Melhor é um punhado de descanso do que ambas as mãos cheias de trabalho e correr atrás do vento.',
  },
  {
    id: 'v-6',
    reference: 'Salmos 42:11',
    topic: 'Para o vazio',
    text: 'Por que estás abatida, ó minha alma? Por que te perturbas dentro de mim? Espera em Deus, pois ainda o louvarei, a ele, meu auxílio e Deus meu.',
  },
  {
    id: 'v-7',
    reference: 'Isaías 43:2',
    topic: 'Para o vazio',
    text: 'Quando passares pelas águas, eu serei contigo; quando pelos rios, eles não te submergirão; quando passares pelo fogo, não te queimarás.',
  },
  {
    id: 'v-8',
    reference: '2 Coríntios 12:9',
    topic: 'Esperança',
    text: 'A minha graça te basta, porque o poder se aperfeiçoa na fraqueza.',
  },
  {
    id: 'v-9',
    reference: 'Jeremias 29:11',
    topic: 'Esperança',
    text: 'Eu é que sei que pensamentos tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que desejais.',
  },
  {
    id: 'v-10',
    reference: 'Josué 1:9',
    topic: 'Ansiedade e medo',
    text: 'Não to mandei eu? Sê forte e corajoso; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares.',
  },
];

const LETTERS_TO_GOD_KEY = 'abrigo_letters_to_god_v1';

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function GodSpaceSection({
  prayers,
  onPrayerCreated,
  onPrayerUpdated,
}: GodSpaceSectionProps) {
  const [activeStateId, setActiveStateId] = useState<string>('vazio');
  const [author, setAuthor] = useState('');
  const [intention, setIntention] = useState<PrayerIntention>('Pedido de oração');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Record<string, boolean>>({});

  // Momento com Deus interactive sanctuary state
  const [selectedDuration, setSelectedDuration] = useState(180);
  const [momentSecondsLeft, setMomentSecondsLeft] = useState(180);
  const [momentRunning, setMomentRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Private letter to God
  const [letterText, setLetterText] = useState('');
  const [letterSavedMsg, setLetterSavedMsg] = useState<string | null>(null);
  const [lettersToGod, setLettersToGod] = useState<LetterToGod[]>(() => {
    try {
      const saved = localStorage.getItem(LETTERS_TO_GOD_KEY);
      return saved ? (JSON.parse(saved) as LetterToGod[]) : [];
    } catch {
      return [];
    }
  });

  // Bible verses filter & copy state
  const [verseFilter, setVerseFilter] = useState<VerseTopic>('Todos');
  const [copiedVerseId, setCopiedVerseId] = useState<string | null>(null);

  const activeWord =
    SPIRITUAL_STATES.find((s) => s.id === activeStateId) || SPIRITUAL_STATES[0];

  const filteredVerses =
    verseFilter === 'Todos'
      ? BIBLE_VERSES
      : BIBLE_VERSES.filter((v) => v.topic === verseFilter);

  const handleCopyVerse = async (verse: BibleVerseItem) => {
    try {
      await navigator.clipboard.writeText(`“${verse.text}” — ${verse.reference}`);
      setCopiedVerseId(verse.id);
      window.setTimeout(() => setCopiedVerseId(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  useEffect(() => {
    if (!momentRunning) return;
    const interval = window.setInterval(() => {
      setMomentSecondsLeft((prev) => {
        if (prev <= 1) {
          setMomentRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [momentRunning]);

  useEffect(() => {
    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const toggleAmbientSound = () => {
    try {
      if (ambientPlaying) {
        if (gainNodeRef.current && audioCtxRef.current) {
          gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.25);
        }
        setAmbientPlaying(false);
        return;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;

        // Warm, soft major-9th contemplative drone pad (very low volume)
        const frequencies = [174.61, 220.0, 261.63, 329.63]; // F3, A3, C4, E4
        frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          oscGain.gain.value = 0.015;
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
        });

        masterGain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        gainNodeRef.current = masterGain;
      }

      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0.65, audioCtxRef.current.currentTime, 0.5);
      }
      setAmbientPlaying(true);
    } catch {
      setAmbientPlaying(false);
    }
  };

  const handleSelectDuration = (secs: number) => {
    setMomentRunning(false);
    setSelectedDuration(secs);
    setMomentSecondsLeft(secs);
  };

  const handleSaveLetter = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = letterText.trim();
    if (trimmed.length < 4) return;
    const entry: LetterToGod = {
      id: `god-${Date.now()}`,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...lettersToGod];
    setLettersToGod(next);
    try {
      localStorage.setItem(LETTERS_TO_GOD_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    setLetterText('');
    setLetterSavedMsg('Sua conversa com Deus foi guardada com sigilo neste espaço.');
  };

  const handleDeleteLetter = (id: string) => {
    const next = lettersToGod.filter((item) => item.id !== id);
    setLettersToGod(next);
    try {
      localStorage.setItem(LETTERS_TO_GOD_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleSubmitPrayer = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmed = content.trim();
    if (trimmed.length < 6) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: author.trim() || 'Anônimo',
          intention,
          content: trimmed,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onPrayerCreated(data as Prayer);
        setContent('');
        setAuthor('');
        setFeedback('Sua oração foi recebida no mural. Outras pessoas já podem orar com você.');
      } else {
        setFeedback(data.error || 'Não foi possível enviar sua oração.');
      }
    } catch {
      setFeedback('Erro de conexão ao enviar sua oração.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrayFor = async (id: string) => {
    if (prayedIds[id]) return;
    setPrayedIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/prayers/${id}/pray`, { method: 'POST' });
      if (res.ok) {
        const updated = (await res.json()) as Prayer;
        onPrayerUpdated(updated);
      }
    } catch {
      // Fail quietly if offline
    }
  };

  return (
    <section id="espaco-de-deus" className="border-b border-[#EADCA6] bg-[#FEF9E6] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-10">
          <div className="lg:col-span-5">
            <div className="h-64 sm:h-88 lg:h-full min-h-[260px] overflow-hidden rounded-xl border border-[#EADCA6] bg-[#FAF0CA]">
              <ResilientImage
                src="/src/assets/images/god_space_light_1795530096820.jpg"
                alt="Escrituras abertas sobre mesa de madeira sob luz dourada suave da manhã ao lado de flores de camomila"
                fallbackTitle="Espaço de Deus · Paz para a alma"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-[#8A5A10]">
                03 · Espaço de Deus
              </p>
              <h2 className="font-editorial mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
                Descanso espiritual, palavra viva e oração para quem busca paz
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[#57534E]">
                Um refúgio sereno para lembrar que você é amado(a) por Deus mesmo nos dias em que
                não consegue explicar sua própria dor.
              </p>

              <div className="mt-6 flex flex-wrap gap-1.5 rounded-lg bg-[#FAF0CA] p-1.5">
                {SPIRITUAL_STATES.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => setActiveStateId(state.id)}
                    className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeStateId === state.id
                        ? 'bg-white text-[#1C1917] shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    {state.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wider uppercase text-[#8A5A10]">
                  {activeWord.reference}
                </p>
                <SpeakButton
                  id={`god-word-${activeWord.id}`}
                  label="Ouvir palavra"
                  text={`${activeWord.reference}. ${activeWord.verse}. ${activeWord.reflection}. Oração: ${activeWord.prayer}`}
                />
              </div>
              <blockquote className="font-editorial mt-3 text-2xl italic leading-snug text-[#1C1917] sm:text-[26px]">
                {activeWord.verse}
              </blockquote>
              <p className="mt-4 text-sm leading-relaxed text-[#44403C]">
                {activeWord.reflection}
              </p>
              <div className="mt-5 border-t border-[#F4E9BF] pt-4">
                <p className="text-xs font-semibold text-[#13382C]">Oração breve para este momento</p>
                <p className="mt-1 text-sm italic leading-relaxed text-[#292524]">
                  {activeWord.prayer}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Momento a Sós com Deus */}
        <div className="mt-10 rounded-2xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:mt-12 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EADCA6] pb-5">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-widest uppercase text-[#8A5A10]">
                Momento com Deus
              </p>
              <h3 className="font-editorial mt-1.5 text-2xl font-medium text-[#1C1917] sm:text-3xl text-balance">
                Reserve alguns minutos em silêncio e conversa sincera com Deus
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
                Um tempo guiado para desligar o barulho lá fora, entregar o que pesa no coração e
                ouvir paz por dentro.
              </p>
            </div>

            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <button
                type="button"
                onClick={toggleAmbientSound}
                aria-pressed={ambientPlaying}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  ambientPlaying
                    ? 'border-[#8A5A10] bg-[#8A5A10]/10 text-[#8A5A10]'
                    : 'border-[#DFCE91] bg-white text-[#44403C] hover:bg-[#FAF0CA]'
                }`}
              >
                {ambientPlaying ? (
                  <>
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>Som de paz ligado</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                    <span>Ouvir som suave de paz</span>
                  </>
                )}
              </button>
              {ambientPlaying && (
                <p className="text-[11px] font-medium text-[#8A5A10]" aria-live="polite">
                  Legenda visual: melodia suave de paz tocando continuamente.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Guided Devotional Steps & Quiet Timer */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#FAF0CA] p-1">
                    {MOMENT_DURATIONS.map((item) => (
                      <button
                        key={item.seconds}
                        type="button"
                        onClick={() => handleSelectDuration(item.seconds)}
                        className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          selectedDuration === item.seconds
                            ? 'bg-white text-[#1C1917] shadow-xs'
                            : 'text-[#57534E] hover:text-[#1C1917]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-editorial text-3xl font-semibold text-[#1C1917] tabular-nums">
                      {formatClock(momentSecondsLeft)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (momentSecondsLeft === 0) {
                          setMomentSecondsLeft(selectedDuration);
                        }
                        setMomentRunning((prev) => !prev);
                      }}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#8A5A10] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#72490B] whitespace-nowrap cursor-pointer"
                    >
                      {momentRunning ? (
                        <>
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Iniciar momento</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectDuration(selectedDuration)}
                      aria-label="Reiniciar tempo de oração"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DFCE91] bg-white text-[#44403C] hover:bg-[#FAF0CA] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {momentSecondsLeft === 0 && (
                  <p className="mt-4 rounded-lg border border-[#8A5A10]/25 bg-[#8A5A10]/8 px-4 py-2.5 text-xs font-medium text-[#72490B]">
                    Tempo concluído. Leve essa paz com você para o restante do seu dia.
                  </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DEVOTIONAL_STEPS.map((step, index) => (
                    <button
                      key={step.number}
                      type="button"
                      onClick={() => setActiveStepIndex(index)}
                      className={`min-h-[58px] rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        activeStepIndex === index
                          ? 'border-[#8A5A10] bg-[#FAF0CA] text-[#1C1917]'
                          : 'border-[#EADCA6] bg-[#FEF9E6] text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      <span className="font-editorial block text-base font-semibold text-[#8A5A10] tabular-nums">
                        {step.number}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold">
                        {step.title}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-[#FEF9E6] p-5 sm:p-6">
                  <h4 className="font-editorial text-2xl font-medium text-[#1C1917]">
                    {DEVOTIONAL_STEPS[activeStepIndex].number} {DEVOTIONAL_STEPS[activeStepIndex].title}
                  </h4>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#44403C]">
                    {DEVOTIONAL_STEPS[activeStepIndex].guidance}
                  </p>
                  <p className="font-editorial mt-4 border-t border-[#EADCA6] pt-3 text-lg italic text-[#8A5A10]">
                    {DEVOTIONAL_STEPS[activeStepIndex].scripture}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
                  className="min-h-[40px] font-semibold text-[#57534E] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                >
                  Passo anterior
                </button>
                <button
                  type="button"
                  disabled={activeStepIndex === DEVOTIONAL_STEPS.length - 1}
                  onClick={() =>
                    setActiveStepIndex((i) => Math.min(DEVOTIONAL_STEPS.length - 1, i + 1))
                  }
                  className="min-h-[40px] font-semibold text-[#8A5A10] hover:text-[#72490B] disabled:opacity-40 cursor-pointer"
                >
                  Próximo passo
                </button>
              </div>
            </div>

            {/* Private Letter to God */}
            <div className="rounded-xl border border-[#EADCA6] bg-[#FEF9E6] p-5 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A5A10]">
                  <Feather className="h-4 w-4" aria-hidden="true" />
                  <span>Conversa particular com Deus</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#57534E]">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  <span>Só você lê</span>
                </span>
              </div>

              <form onSubmit={handleSaveLetter} className="mt-3 space-y-3">
                <label htmlFor="letter-to-god" className="sr-only">
                  Escreva sua conversa particular com Deus
                </label>
                <textarea
                  id="letter-to-god"
                  rows={5}
                  maxLength={900}
                  value={letterText}
                  onChange={(e) => {
                    setLetterText(e.target.value);
                    if (letterSavedMsg) setLetterSavedMsg(null);
                  }}
                  placeholder="Escreva como se estivesse conversando com Deus agora. Fale das suas dores, dúvidas, pedidos ou agradecimentos..."
                  className="w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base leading-relaxed text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />

                {letterSavedMsg && (
                  <p role="status" className="text-xs font-medium text-[#13382C]">
                    {letterSavedMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={letterText.trim().length < 4}
                  className="min-h-[44px] w-full rounded-lg border border-[#8A5A10] bg-white px-4 py-2 text-xs font-semibold text-[#8A5A10] transition-colors hover:bg-[#8A5A10] hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  Guardar minha conversa com Deus
                </button>
              </form>

              {lettersToGod.length > 0 && (
                <div className="mt-4 max-h-44 space-y-2 overflow-y-auto border-t border-[#EADCA6] pt-3">
                  {lettersToGod.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-white px-3.5 py-2.5 border border-[#EADCA6]"
                    >
                      <div>
                        <p className="text-[11px] text-[#78716C]">
                          {formatRelativeTimePt(item.createdAt)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#292524]">
                          {item.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLetter(item.id)}
                        aria-label="Apagar conversa com Deus"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[#78716C] hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Biblioteca de Versículos da Bíblia */}
        <div className="mt-10 rounded-2xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:mt-12 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EADCA6] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8A5A10]">
                <BookText className="h-4 w-4" aria-hidden="true" />
                <span>Versículos da Bíblia</span>
              </div>
              <h3 className="font-editorial mt-1.5 text-2xl font-medium text-[#1C1917] sm:text-3xl">
                Palavras das Escrituras para ler, guardar e compartilhar
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-lg bg-[#FAF0CA] p-1">
              {VERSE_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setVerseFilter(topic)}
                  className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    verseFilter === topic
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVerses.map((verse) => {
              const isCopied = copiedVerseId === verse.id;
              return (
                <article
                  key={verse.id}
                  className="flex flex-col justify-between rounded-xl border border-[#EADCA6] bg-[#FEF9E6] p-5"
                >
                  <div>
                    <p className="text-xs text-[#57534E]">
                      <span className="font-semibold text-[#8A5A10]">{verse.reference}</span> ·{' '}
                      <span>{verse.topic}</span>
                    </p>
                    <blockquote className="font-editorial mt-2.5 text-xl italic leading-snug text-[#1C1917]">
                      “{verse.text}”
                    </blockquote>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#EADCA6] pt-3">
                    <button
                      type="button"
                      onClick={() => void handleCopyVerse(verse)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold text-[#57534E] transition-colors hover:text-[#8A5A10] whitespace-nowrap cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#13382C]" aria-hidden="true" />
                          <span className="text-[#13382C]">Versículo copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copiar versículo</span>
                        </>
                      )}
                    </button>

                    <SpeakButton
                      id={`verse-${verse.id}`}
                      label="Ouvir versículo"
                      text={`${verse.reference}. ${verse.text}`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Mural de Orações */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:mt-12 lg:grid-cols-12">
          <form
            onSubmit={handleSubmitPrayer}
            className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6 lg:col-span-5"
          >
            <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
              Deixar um pedido de oração ou gratidão
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#57534E]">
              Compartilhe pelo que você gostaria que outras pessoas orassem por você hoje.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="prayer-intention" className="block text-xs font-semibold text-[#44403C]">
                  Tipo de registro
                </label>
                <select
                  id="prayer-intention"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value as PrayerIntention)}
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] sm:text-sm"
                >
                  {INTENTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="prayer-author" className="block text-xs font-semibold text-[#44403C]">
                  Seu nome ou iniciais (opcional)
                </label>
                <input
                  id="prayer-author"
                  type="text"
                  maxLength={40}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex.: Anônimo, Ana, L.M."
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="prayer-content" className="block text-xs font-semibold text-[#44403C]">
                    Sua oração
                  </label>
                  <VoiceDictationButton
                    label="Falar oração"
                    onTranscript={(spoken) =>
                      setContent((prev) => (prev ? `${prev} ${spoken}` : spoken))
                    }
                  />
                </div>
                <textarea
                  id="prayer-content"
                  rows={3}
                  maxLength={600}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva ou fale seu pedido de oração, agradecimento ou palavra de consolo..."
                  className="mt-1.5 w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />
              </div>

              {feedback && (
                <p role="status" className="text-xs font-medium text-[#13382C]">
                  {feedback}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || content.trim().length < 6}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#8A5A10] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#72490B] disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{submitting ? 'Enviando...' : 'Compartilhar no altar de oração'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
                Orações da comunidade
              </h3>
              <span className="text-xs text-[#57534E] tabular-nums">
                {prayers.length} {prayers.length === 1 ? 'oração' : 'orações'}
              </span>
            </div>

            {prayers.map((prayer) => (
              <article
                key={prayer.id}
                className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                  <span className="font-semibold text-[#8A5A10]">{prayer.author}</span>
                  <span aria-hidden="true">·</span>
                  <span>{prayer.intention}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeTimePt(prayer.createdAt)}</span>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-[#1C1917]">{prayer.content}</p>
                <div className="mt-4 border-t border-[#F4E9BF] pt-3">
                  <button
                    type="button"
                    onClick={() => handlePrayFor(prayer.id)}
                    className={`inline-flex min-h-[38px] items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      prayedIds[prayer.id]
                        ? 'text-[#8A5A10]'
                        : 'text-[#57534E] hover:text-[#8A5A10]'
                    }`}
                  >
                    <HandHeart className="h-4 w-4" aria-hidden="true" />
                    <span className="tabular-nums">
                      {prayedIds[prayer.id] ? 'Você está orando por esta vida' : 'Orar por essa vida'} ({prayer.prayingCount})
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
