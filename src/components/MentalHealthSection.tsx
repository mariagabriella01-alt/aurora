import { ArrowRight, BookOpen, Check, MessageSquareHeart, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { PrivateJournalEntry, VentCategory } from '../types';
import { formatRelativeTimePt } from '../utils/formatters';

interface MentalHealthSectionProps {
  onVentAboutTopic: (category: VentCategory) => void;
}

interface ConversationTopic {
  id: string;
  label: string;
  ventCategory: VentCategory;
  moodLabel: string;
  headline: string;
  validation: string;
  questions: string[];
  gentleStep: string;
}

const CONVERSATION_TOPICS: ConversationTopic[] = [
  {
    id: 'trabalho',
    label: 'Trabalho demais',
    ventCategory: 'Trabalho demais',
    moodLabel: 'Exausto',
    headline: 'Quando o excesso de trabalho ou estudo rouba a sua paz',
    validation:
      'Viver no limite da produtividade faz o corpo entrar em alerta constante. Sentir culpa ao descansar não significa preguiça — é sinal de que você está carregando mais peso do que um ser humano suporta sozinho.',
    questions: [
      'O que eu estou tentando provar ou evitar quando não me permito parar?',
      'Qual tarefa de hoje pode esperar até amanhã sem que o mundo acabe?',
      'Se alguém que eu amo estivesse exausto assim, o que eu diria para essa pessoa?',
    ],
    gentleStep:
      'Passo possível hoje: escolha um horário exato para fechar telas de trabalho/estudo por pelo menos 40 minutos e faça algo sem meta nenhuma.',
  },
  {
    id: 'vazio',
    label: 'Vazio',
    ventCategory: 'Vazio interior',
    moodLabel: 'Vazio',
    headline: 'Quando tudo por dentro parece silencioso, distante ou sem cor',
    validation:
      'O vazio emocional costuma ser um mecanismo de defesa: depois de muita dor, pressão ou solidão, a mente diminui a intensidade dos sentimentos para evitar que você sofra ainda mais.',
    questions: [
      'Desde quando comecei a me sentir desconectado(a) das coisas que antes faziam sentido?',
      'Estou guardando alguma tristeza antiga que nunca tive espaço seguro para chorar?',
      'Que pequeno cuidado físico (água, sol, banho, conversa) eu ainda consigo fazer hoje?',
    ],
    gentleStep:
      'Passo possível hoje: não espere sentir vontade para se cuidar — faça o mínimo gentil por você e converse com alguém de confiança.',
  },
  {
    id: 'bullying',
    label: 'Bullying na escola',
    ventCategory: 'Bullying na escola',
    moodLabel: 'Sensível',
    headline: 'Quando humilhações, apelidos ou exclusão ferem quem você é',
    validation:
      'Ninguém merece ser diminuído, rido ou isolado na escola. O bullying fala exclusivamente sobre a crueldade ou o limite de quem pratica — nunca sobre o seu valor, sua inteligência ou o seu jeito de existir.',
    questions: [
      'Que palavras injustas disseram sobre mim que eu acabei acreditando sem perceber?',
      'Quem na minha família, escola ou coordenação pode me ouvir e me proteger agora?',
      'O que eu mais gosto em mim longe do olhar de quem me machuca?',
    ],
    gentleStep:
      'Passo possível hoje: anote o que aconteceu com datas e conte para um adulto de confiança ou psicólogo escolar. Você não precisa enfrentar isso calado(a).',
  },
  {
    id: 'comparacao',
    label: 'Comparação',
    ventCategory: 'Comparação',
    moodLabel: 'Ansioso',
    headline: 'Quando a vida dos outros faz você se sentir atrasado(a) ou insuficiente',
    validation:
      'Redes sociais e círculos ao redor mostram apenas conquistas editadas, nunca as noites difíceis, medos e bastidores de ninguém. Comparar sua dor real com a vitrine dos outros é uma conta injusta.',
    questions: [
      'Depois de olhar o perfil de quem eu saio me sentindo menor e mais cansado(a)?',
      'Se ninguém estivesse olhando, o que realmente me traria paz na minha própria história?',
      'Que pequeno avanço eu já tive nos últimos meses que estou ignorando hoje?',
    ],
    gentleStep:
      'Passo possível hoje: silencie por alguns dias perfis que disparam ansiedade e volte sua atenção para um passo real do seu próprio caminho.',
  },
];

type BreathPhase = 'inhale' | 'hold' | 'exhale';

const PHASE_CONFIG: Record<BreathPhase, { label: string; seconds: number; next: BreathPhase; hint: string }> = {
  inhale: {
    label: 'Inspire devagar pelo nariz',
    seconds: 4,
    next: 'hold',
    hint: 'Deixe o ar encher os pulmões suavemente.',
  },
  hold: {
    label: 'Segure com calma',
    seconds: 7,
    next: 'exhale',
    hint: 'Relaxe os ombros enquanto o corpo desacelera.',
  },
  exhale: {
    label: 'Expire pela boca bem devagar',
    seconds: 8,
    next: 'inhale',
    hint: 'Solte a tensão acumulada no peito.',
  },
};

const GROUNDING_STEPS = [
  {
    count: '5',
    title: '5 coisas que você consegue ver agora',
    prompt: 'Observe detalhes simples ao seu redor: a luz na parede, uma xícara, a cor de um tecido.',
  },
  {
    count: '4',
    title: '4 coisas que você pode tocar',
    prompt: 'Sinta a textura da sua roupa, a firmeza da cadeira ou os pés tocando o chão.',
  },
  {
    count: '3',
    title: '3 sons que chegam aos seus ouvidos',
    prompt: 'Perceba sons distantes ou próximos — sua própria respiração, o vento, um ruído suave.',
  },
  {
    count: '2',
    title: '2 aromas ou sensações no ar',
    prompt: 'Note a temperatura do ambiente no rosto ou algum cheiro sutil por perto.',
  },
  {
    count: '1',
    title: '1 verdade gentil sobre você hoje',
    prompt: 'Exemplo: "Eu sobrevivi a dias muito difíceis até aqui, e não preciso resolver a vida inteira hoje."',
  },
];

const MOODS = ['Vazio', 'Exausto', 'Ansioso', 'Sensível', 'Mais calmo'] as const;
const JOURNAL_STORAGE_KEY = 'abrigo_mental_journal_v1';

export function MentalHealthSection({ onVentAboutTopic }: MentalHealthSectionProps) {
  // Conversation topic guide state
  const [activeTopicId, setActiveTopicId] = useState<string>('trabalho');

  // Breathing 4-7-8 state
  const [breathingActive, setBreathingActive] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(PHASE_CONFIG.inhale.seconds);
  const [cycles, setCycles] = useState(0);

  // Grounding checklist state
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Private mental health journal
  const [selectedMood, setSelectedMood] = useState<string>('Vazio');
  const [journalNote, setJournalNote] = useState('');
  const [entries, setEntries] = useState<PrivateJournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as PrivateJournalEntry[]) : [];
    } catch {
      return [];
    }
  });

  const activeTopic =
    CONVERSATION_TOPICS.find((t) => t.id === activeTopicId) || CONVERSATION_TOPICS[0];

  const handleUsePromptInJournal = (question: string) => {
    setSelectedMood(activeTopic.moodLabel);
    setJournalNote(`${question}\n`);
    const el = document.getElementById('journal-note');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  };

  useEffect(() => {
    if (!breathingActive) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhase((currentPhase) => {
          const nextPhase = PHASE_CONFIG[currentPhase].next;
          if (currentPhase === 'exhale') {
            setCycles((c) => c + 1);
          }
          setSecondsLeft(PHASE_CONFIG[nextPhase].seconds);
          return nextPhase;
        });
        return 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breathingActive]);

  const resetBreathing = () => {
    setBreathingActive(false);
    setPhase('inhale');
    setSecondsLeft(PHASE_CONFIG.inhale.seconds);
    setCycles(0);
  };

  const toggleGroundingStep = (count: string) => {
    setCompletedSteps((prev) => ({ ...prev, [count]: !prev[count] }));
  };

  const saveEntries = (next: PrivateJournalEntry[]) => {
    setEntries(next);
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota issues
    }
  };

  const handleSaveJournal = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = journalNote.trim();
    if (trimmed.length < 4) return;
    const newEntry: PrivateJournalEntry = {
      id: `j-${Date.now()}`,
      mood: selectedMood,
      note: trimmed,
      createdAt: new Date().toISOString(),
    };
    saveEntries([newEntry, ...entries]);
    setJournalNote('');
  };

  const circleScale =
    !breathingActive
      ? 'scale-95'
      : phase === 'inhale'
        ? 'scale-110'
        : phase === 'hold'
          ? 'scale-110'
          : 'scale-85';

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <section id="saude-mental" className="border-b border-[#EADCA6] bg-[#FDF6DC] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#57534E]">
            02 · Cuidado com a saúde mental e o vazio
          </p>
          <h2 className="font-editorial mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
            Ferramentas de psicologia para atravessar momentos de vazio e sobrecarga
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#57534E]">
            O vazio emocional não significa que você quebrou por dentro; muitas vezes é o sistema
            nervoso exausto pedindo pausa. Escolha um tema para conversar e refletir ou use os
            exercícios práticos abaixo no seu ritmo.
          </p>
        </div>

        {/* Temas para conversar e se acolher */}
        <div className="mt-8 rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:mt-10 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EADCA6] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#13382C]">
                <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
                <span>Sobre o que você precisa conversar hoje?</span>
              </div>
              <h3 className="font-editorial mt-1.5 text-2xl font-medium text-[#1C1917] sm:text-3xl">
                Guias para colocar em palavras o que está pesando
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-lg bg-[#FAF0CA] p-1">
              {CONVERSATION_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTopicId === topic.id
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between lg:col-span-6">
              <div>
                <h4 className="font-editorial text-2xl font-medium text-[#1C1917]">
                  {activeTopic.headline}
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-[#44403C]">
                  {activeTopic.validation}
                </p>
                <p className="mt-4 rounded-lg bg-[#FAF0CA] px-4 py-3 text-xs leading-relaxed text-[#13382C] font-medium">
                  {activeTopic.gentleStep}
                </p>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => onVentAboutTopic(activeTopic.ventCategory)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#13382C] px-4 py-2.5 text-xs font-semibold text-[#FEF9E6] transition-colors hover:bg-[#0D281F] whitespace-nowrap cursor-pointer"
                >
                  <span>Desabafar sobre {activeTopic.label.toLowerCase()}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <p className="text-xs font-semibold text-[#57534E]">
                Perguntas para conversar consigo mesmo(a) — clique para responder no seu diário privado:
              </p>
              <div className="mt-3 space-y-2.5">
                {activeTopic.questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleUsePromptInJournal(question)}
                    className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg border border-[#EADCA6] bg-[#FEF9E6] px-4 py-3 text-left text-sm text-[#1C1917] transition-colors hover:border-[#13382C]/40 hover:bg-[#FAF0CA] cursor-pointer"
                  >
                    <span>{question}</span>
                    <span className="shrink-0 text-xs font-semibold text-[#13382C] whitespace-nowrap">
                      Responder
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Respiração 4-7-8 */}
          <div className="flex flex-col justify-between rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
                  Respiração guiada 4-7-8
                </h3>
                <span className="text-xs text-[#57534E] tabular-nums">
                  {cycles} {cycles === 1 ? 'ciclo' : 'ciclos'}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#57534E]">
                Ajuda a reduzir batimentos acelerados, crises de ansiedade e sensação de aperto no peito.
              </p>

              <div className="my-8 flex flex-col items-center justify-center py-4">
                <div
                  className={`flex h-44 w-44 items-center justify-center rounded-full border border-[#13382C]/35 bg-[#13382C]/10 transition-transform duration-1000 ease-out ${circleScale}`}
                >
                  <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#13382C] text-[#FEF9E6]">
                    <span className="font-editorial text-4xl font-semibold tabular-nums">
                      {secondsLeft}s
                    </span>
                    <span className="mt-1 text-[11px] font-medium opacity-90">
                      {phase === 'inhale'
                        ? 'Inspirar'
                        : phase === 'hold'
                          ? 'Segurar'
                          : 'Expirar'}
                    </span>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm font-semibold text-[#1C1917]">
                  {PHASE_CONFIG[phase].label}
                </p>
                <p className="mt-1 text-center text-xs text-[#57534E]">
                  {PHASE_CONFIG[phase].hint}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#EADCA6] pt-4">
              <button
                type="button"
                onClick={() => setBreathingActive((prev) => !prev)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#13382C] px-4 py-2.5 text-xs font-semibold text-[#FEF9E6] transition-colors hover:bg-[#0D281F] cursor-pointer"
              >
                {breathingActive ? (
                  <>
                    <Pause className="h-4 w-4" aria-hidden="true" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    <span>Iniciar respiração</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetBreathing}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#DFCE91] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1917] transition-colors hover:bg-[#FAF0CA] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Aterramento 5-4-3-2-1 */}
          <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EADCA6] pb-4">
              <div>
                <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
                  Aterramento 5-4-3-2-1 para o vazio
                </h3>
                <p className="mt-1 text-sm text-[#57534E]">
                  Quando a mente parecer distante ou desconectada da realidade, marque cada passo com calma.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#13382C] tabular-nums">
                {completedCount}/5 concluídos
              </span>
            </div>

            <div className="mt-5 divide-y divide-[#F4E9BF]">
              {GROUNDING_STEPS.map((step) => {
                const done = Boolean(completedSteps[step.count]);
                return (
                  <button
                    key={step.count}
                    type="button"
                    onClick={() => toggleGroundingStep(step.count)}
                    className="flex min-h-[56px] w-full items-start gap-4 py-3.5 text-left transition-colors hover:bg-[#FAF0CA]/45 cursor-pointer"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                        done
                          ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
                          : 'border-[#DFCE91] bg-white text-[#1C1917]'
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.count}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          done ? 'text-[#57534E] line-through' : 'text-[#1C1917]'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#57534E]">
                        {step.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {completedCount === 5 && (
              <p className="mt-4 rounded-lg border border-[#13382C]/25 bg-[#13382C]/5 px-4 py-3 text-xs leading-relaxed text-[#13382C]">
                Você voltou para o momento presente. Não precisa carregar o ano inteiro hoje — apenas este próximo passo.
              </p>
            )}
          </div>
        </div>

        {/* Psychoeducation & Private Journal */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6 lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#13382C]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Entendendo o vazio</span>
            </div>
            <h3 className="font-editorial mt-2 text-2xl font-medium text-[#1C1917]">
              Por que às vezes não sentimos nada, nem tristeza nem alegria?
            </h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#44403C]">
              <p>
                Na psicologia, a sensação de <strong>vazio interior</strong> costuma surgir quando
                suportamos estresse, solidão ou dor emocional por tempo demais. Para se proteger,
                a mente abaixa o volume de todas as emoções.
              </p>
              <p>
                Sentir esse anestesiamento não faz de você uma pessoa fraca ou sem propósito. É um
                sinal de que você precisa de acolhimento, rotina gentil, vínculo humano e, quando
                possível, acompanhamento psicológico profissional.
              </p>
              <p className="font-medium text-[#1C1917]">
                Três cuidados simples para hoje: beba um copo de água, abra a janela para entrar
                luz natural e converse com alguém de confiança.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCA6] pb-4">
              <div>
                <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
                  Meu diário privado da mente
                </h3>
                <p className="mt-1 text-xs text-[#57534E]">
                  Fica salvo apenas neste navegador para você acompanhar seus sentimentos com honestidade.
                </p>
              </div>
              <span className="text-xs text-[#57534E] tabular-nums">
                {entries.length} {entries.length === 1 ? 'anotação' : 'anotações'}
              </span>
            </div>

            <form onSubmit={handleSaveJournal} className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-[#44403C]">
                  Como está o seu coração agora?
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setSelectedMood(mood)}
                      className={`min-h-[38px] rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        selectedMood === mood
                          ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
                          : 'border-[#DFCE91] bg-white text-[#44403C] hover:bg-[#FAF0CA]'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="journal-note" className="sr-only">
                  Escreva em seu diário privado
                </label>
                <textarea
                  id="journal-note"
                  rows={3}
                  maxLength={600}
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder="O que despertou esse sentimento hoje? Do que você precisa agora?"
                  className="w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={journalNote.trim().length < 4}
                  className="min-h-[42px] w-full rounded-lg bg-[#13382C] px-4 py-2 text-xs font-semibold text-[#FEF9E6] transition-colors hover:bg-[#0D281F] disabled:opacity-50 cursor-pointer sm:w-auto"
                >
                  Salvar anotação privada
                </button>
              </div>
            </form>

            {entries.length > 0 && (
              <div className="mt-5 max-h-56 space-y-2.5 overflow-y-auto border-t border-[#F4E9BF] pt-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-4 rounded-lg bg-[#FAF0CA] px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-[#57534E]">
                        <span className="font-semibold text-[#13382C]">{entry.mood}</span> ·{' '}
                        {formatRelativeTimePt(entry.createdAt)}
                      </p>
                      <p className="mt-1 text-sm text-[#292524]">{entry.note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveEntries(entries.filter((item) => item.id !== entry.id))}
                      aria-label="Apagar anotação privada"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[#78716C] hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
