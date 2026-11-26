import {
  Award,
  CalendarDays,
  CheckCircle2,
  Flame,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { RecoveryGoal } from '../types';

const STORAGE_KEY = 'aurora_superacao_goals_v1';

interface MilestoneDefinition {
  days: number;
  title: string;
  celebration: string;
}

const MILESTONES: readonly MilestoneDefinition[] = [
  {
    days: 1,
    title: '1 dia',
    celebration: 'Primeiro dia vencido! Você deu o passo mais corajoso escolhendo o seu bem-estar hoje.',
  },
  {
    days: 3,
    title: '3 dias',
    celebration: 'Três dias seguidos de firmeza! Cada hora longe desse hábito fortalece sua confiança.',
  },
  {
    days: 7,
    title: '7 dias',
    celebration: 'Uma semana inteira de vitória! Sete dias provam sua capacidade de atravessar vontades difíceis.',
  },
  {
    days: 15,
    title: '15 dias',
    celebration: 'Quinze dias de constância! Seu esforço silencioso de todos os dias já está mudando sua história.',
  },
  {
    days: 30,
    title: '30 dias',
    celebration: 'Um mês completo de superação! Trinta dias de cuidado, coragem e esperança renovada.',
  },
  {
    days: 60,
    title: '60 dias',
    celebration: 'Sessenta dias de liberdade! Dois meses escolhendo sua paz, sua saúde e o seu futuro.',
  },
  {
    days: 90,
    title: '90 dias',
    celebration: 'Noventa dias de força! Três meses construindo um caminho mais leve e saudável para você.',
  },
  {
    days: 180,
    title: '180 dias',
    celebration: 'Meio ano de superação! Cento e oitenta dias mostram uma transformação real na sua vida.',
  },
  {
    days: 365,
    title: '365 dias',
    celebration: 'Um ano inteiro de vitória! Trezentos e sessenta e cinco dias de coragem e recomeço.',
  },
];

const HABIT_SUGGESTIONS = [
  'Parar de fumar',
  'Abandonar o consumo de álcool',
  'Parar de apostar',
  'Reduzir o uso excessivo de redes sociais',
  'Superar outro hábito prejudicial',
];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateBr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Hoje';
  }
}

function loadGoalsFromStorage(): RecoveryGoal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecoveryGoal =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecoveryGoal).id === 'string' &&
        typeof (item as RecoveryGoal).habitName === 'string' &&
        typeof (item as RecoveryGoal).currentStartedAt === 'string' &&
        Array.isArray((item as RecoveryGoal).history),
    );
  } catch {
    return [];
  }
}

export function MinhaSuperacaoSection() {
  const [goals, setGoals] = useState<RecoveryGoal[]>(() => loadGoalsFromStorage());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [showCreateForm, setShowCreateForm] = useState(() => loadGoalsFromStorage().length === 0);
  const [habitName, setHabitName] = useState('');
  const [startDate, setStartDate] = useState(() => getTodayDateString());
  const [startTime, setStartTime] = useState(() => getCurrentTimeString());
  const [motivation, setMotivation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [relapseTargetId, setRelapseTargetId] = useState<string | null>(null);
  const [relapseNote, setRelapseNote] = useState('');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // Ignore storage quota errors
    }
  }, [goals]);

  const handleCreateGoal = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = habitName.trim();
    if (cleanName.length < 3) {
      setFormError('Escreva ou toque em um objetivo com pelo menos 3 caracteres.');
      return;
    }

    const safeTime = startTime || '00:00';
    const combined = new Date(`${startDate}T${safeTime}:00`);
    const now = Date.now();
    let startTimestamp = combined.getTime();
    if (Number.isNaN(startTimestamp)) {
      startTimestamp = now;
    } else if (startTimestamp > now) {
      // Clamp to current instant if user entered today's date with a slightly future time
      if (startDate === getTodayDateString()) {
        startTimestamp = now;
      } else {
        setFormError('Escolha uma data de início igual ou anterior a hoje.');
        return;
      }
    }

    const startedIso = new Date(startTimestamp).toISOString();
    const initialElapsedMs = Math.max(0, now - startTimestamp);

    const newGoal: RecoveryGoal = {
      id: `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      habitName: cleanName.slice(0, 80),
      motivation: motivation.trim().slice(0, 180) || undefined,
      createdAt: new Date(now).toISOString(),
      currentStartedAt: startedIso,
      bestStreakMs: initialElapsedMs,
      history: [],
    };

    setGoals((prev) => [newGoal, ...prev]);
    setHabitName('');
    setMotivation('');
    setStartDate(getTodayDateString());
    setStartTime(getCurrentTimeString());
    setFormError(null);
    setShowCreateForm(false);
    setNowMs(now);
  };

  const handleConfirmRelapse = (goalId: string) => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal;
        const startMs = new Date(goal.currentStartedAt).getTime();
        const elapsedMs = Math.max(0, now - (Number.isNaN(startMs) ? now : startMs));
        const daysAchieved = Math.floor(elapsedMs / 86_400_000);
        const hoursAchieved = Math.floor((elapsedMs % 86_400_000) / 3_600_000);

        const record = {
          id: `rel-${now.toString(36)}`,
          startedAt: goal.currentStartedAt,
          endedAt: nowIso,
          daysAchieved,
          hoursAchieved,
          note: relapseNote.trim().slice(0, 180) || undefined,
        };

        return {
          ...goal,
          currentStartedAt: nowIso,
          bestStreakMs: Math.max(goal.bestStreakMs, elapsedMs),
          history: [record, ...goal.history],
          lastRelapseMessageAt: nowIso,
        };
      }),
    );
    setRelapseTargetId(null);
    setRelapseNote('');
    setNowMs(now);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setConfirmDeleteId(null);
  };

  return (
    <section id="superacao" className="border-b border-[#EADCA6] bg-[#FFFDF4] py-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10.5px] font-medium tracking-widest uppercase text-[#8A5A10] sm:text-xs">
              Um dia de cada vez · Sem julgamentos
            </p>
            <h2 className="font-editorial mt-1 text-[1.4rem] font-medium leading-[1.18] text-[#1C1917] sm:mt-2 sm:text-4xl text-balance">
              Minha Superação
            </h2>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-[1.55] text-[#57534E] sm:mt-2.5 sm:text-base sm:leading-relaxed">
              Acompanhe sua jornada para deixar vícios ou hábitos que te machucam. Cada hora e cada
              dia vencidos contam — e se houver recaída, recomeçar também é uma vitória.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#EADCA6] bg-[#FEF9E6] px-2.5 py-1.5 text-[10.5px] font-medium text-[#5C3A21] sm:px-3 sm:text-xs">
              <Lock className="h-3.5 w-3.5 text-[#13382C]" aria-hidden="true" />
              <span>Privado · Salvo só neste aparelho</span>
            </span>

            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#13382C] px-3.5 py-2 text-[11.5px] font-semibold text-[#FEF9E6] transition-all duration-150 hover:bg-[#0D281F] active:scale-[0.98] cursor-pointer sm:min-h-[42px] sm:px-4 sm:text-xs"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              <span>{showCreateForm ? 'Fechar formulário' : 'Novo objetivo'}</span>
            </button>
          </div>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreateGoal}
            className="animate-fade-soft mt-4 rounded-2xl border border-[#DFCE91] bg-[#FEF9E6] p-3.5 sm:mt-7 sm:p-6"
          >
            <h3 className="font-editorial text-lg font-medium text-[#1C1917] sm:text-2xl">
              Qual hábito ou vício você quer superar hoje?
            </h3>

            <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3.5 sm:gap-2">
              {HABIT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    if (suggestion === 'Superar outro hábito prejudicial') {
                      setHabitName('');
                    } else {
                      setHabitName(suggestion);
                    }
                    setFormError(null);
                  }}
                  className={`min-h-[32px] rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer sm:min-h-[36px] sm:px-3 sm:text-xs ${
                    habitName === suggestion
                      ? 'border-[#13382C] bg-[#13382C] text-[#FEF9E6]'
                      : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#5C3A21]'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-5">
                <label htmlFor="goal-name" className="block text-xs font-semibold text-[#44403C]">
                  Seu objetivo
                </label>
                <input
                  id="goal-name"
                  type="text"
                  maxLength={80}
                  value={habitName}
                  onChange={(e) => {
                    setHabitName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Ex.: Parar de fumar"
                  className="mt-1 w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-4">
                <div>
                  <label htmlFor="goal-date" className="block text-xs font-semibold text-[#44403C]">
                    Data de início
                  </label>
                  <input
                    id="goal-date"
                    type="date"
                    max={getTodayDateString()}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFormError(null);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DFCE91] bg-white px-2.5 py-2 text-base text-[#1C1917] sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="goal-time" className="block text-xs font-semibold text-[#44403C]">
                    Hora (opcional)
                  </label>
                  <input
                    id="goal-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#DFCE91] bg-white px-2.5 py-2 text-base text-[#1C1917] sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="goal-motivation" className="block text-xs font-semibold text-[#44403C]">
                  Motivo especial (opcional)
                </label>
                <input
                  id="goal-motivation"
                  type="text"
                  maxLength={180}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Ex.: Pela minha saúde e família"
                  className="mt-1 w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-2.5 text-xs font-medium text-red-700">{formError}</p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 sm:mt-4">
              {goals.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="min-h-[38px] rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2 text-xs font-medium text-[#44403C] hover:bg-[#FAF0CA] cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#13382C] px-4 py-2 text-xs font-semibold text-[#FEF9E6] transition-all hover:bg-[#0D281F] active:scale-[0.98] cursor-pointer sm:min-h-[42px]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Começar contagem agora</span>
              </button>
            </div>
          </form>
        )}

        {goals.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#DFCE91] bg-[#FEF9E6]/70 p-4 text-center sm:mt-7 sm:p-8">
            <Award className="mx-auto h-8 w-8 text-[#8A5A10] sm:h-10 sm:w-10" aria-hidden="true" />
            <h3 className="font-editorial mt-2 text-lg font-medium text-[#1C1917] sm:text-2xl">
              Nenhum objetivo adicionado ainda
            </h3>
            <p className="mx-auto mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-[#57534E] sm:text-sm">
              Crie seu primeiro objetivo acima para acompanhar dias e horas de superação e
              conquistar marcos de 1 a 365 dias no seu ritmo.
            </p>
            {!showCreateForm && (
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#13382C] px-4 py-2 text-xs font-semibold text-[#FEF9E6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Adicionar meu primeiro objetivo</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4 sm:mt-7 sm:space-y-6">
            {goals.map((goal) => {
              const startMs = new Date(goal.currentStartedAt).getTime();
              const safeStartMs = Number.isNaN(startMs) ? nowMs : startMs;
              const elapsedMs = Math.max(0, nowMs - safeStartMs);

              const daysClean = Math.floor(elapsedMs / 86_400_000);
              const hoursClean = Math.floor((elapsedMs % 86_400_000) / 3_600_000);
              const minutesClean = Math.floor((elapsedMs % 3_600_000) / 60_000);

              const effectiveBestMs = Math.max(goal.bestStreakMs, elapsedMs);
              const bestDays = Math.floor(effectiveBestMs / 86_400_000);
              const bestHours = Math.floor((effectiveBestMs % 86_400_000) / 3_600_000);

              const unlockedMilestones = MILESTONES.filter((m) => daysClean >= m.days);
              const latestUnlocked =
                unlockedMilestones.length > 0
                  ? unlockedMilestones[unlockedMilestones.length - 1]
                  : null;
              const nextMilestone = MILESTONES.find((m) => daysClean < m.days) || null;
              const prevMilestoneDays = latestUnlocked ? latestUnlocked.days : 0;

              const exactDaysFloat = elapsedMs / 86_400_000;
              const nextProgressPct = nextMilestone
                ? Math.min(
                    100,
                    Math.max(
                      4,
                      Math.round(
                        ((exactDaysFloat - prevMilestoneDays) /
                          Math.max(1, nextMilestone.days - prevMilestoneDays)) *
                          100,
                      ),
                    ),
                  )
                : 100;

              const recentlyRelapsed =
                goal.lastRelapseMessageAt &&
                nowMs - new Date(goal.lastRelapseMessageAt).getTime() < 1000 * 60 * 60 * 12;

              const historyOpen = Boolean(expandedHistoryIds[goal.id]);

              return (
                <article
                  key={goal.id}
                  className="rounded-2xl border border-[#EADCA6] bg-[#FEF9E6] p-3.5 sm:p-6"
                >
                  <div className="flex flex-col gap-3 border-b border-[#EADCA6] pb-3 sm:flex-row sm:items-start sm:justify-between sm:pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-editorial text-xl font-medium text-[#1C1917] sm:text-3xl">
                          {goal.habitName}
                        </h3>
                        {latestUnlocked && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#13382C]/25 bg-[#13382C] px-2 py-0.5 text-[10.5px] font-semibold text-[#FEF9E6] sm:text-xs">
                            <Award className="h-3 w-3 text-[#F7CA18]" aria-hidden="true" />
                            <span>Marco: {latestUnlocked.title}</span>
                          </span>
                        )}
                      </div>
                      {goal.motivation && (
                        <p className="mt-1 text-xs italic text-[#5C3A21] sm:text-sm">
                          Meu motivo: “{goal.motivation}”
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">

                      {confirmDeleteId === goal.id ? (
                        <div className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px]">
                          <span className="font-medium text-red-900">Remover?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="rounded px-1.5 py-0.5 font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-1.5 py-0.5 font-medium text-[#44403C] hover:bg-white cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(goal.id)}
                          aria-label={`Remover objetivo ${goal.habitName}`}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#DFCE91] bg-[#FFFDF4] px-2.5 py-1 text-[11px] font-medium text-[#57534E] hover:border-red-300 hover:text-red-700 cursor-pointer sm:min-h-[38px]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Remover</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contadores principais */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-xl border border-[#13382C]/20 bg-[#13382C] p-2.5 text-[#FEF9E6] sm:p-3.5">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-[#F7CA18] sm:text-[11px]">
                        Tempo atual
                      </p>
                      <p className="font-editorial mt-0.5 text-xl font-semibold leading-tight sm:text-3xl">
                        {daysClean} {daysClean === 1 ? 'dia' : 'dias'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#E6E0C8] sm:text-xs">
                        e {hoursClean} {hoursClean === 1 ? 'hora' : 'horas'}
                        {daysClean === 0 ? ` · ${minutesClean} min` : ''}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-2.5 sm:p-3.5">
                      <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase text-[#8A5A10] sm:text-[11px]">
                        <Flame className="h-3 w-3" aria-hidden="true" />
                        <span>Recorde pessoal</span>
                      </div>
                      <p className="font-editorial mt-0.5 text-xl font-semibold leading-tight text-[#1C1917] sm:text-3xl">
                        {bestDays} {bestDays === 1 ? 'dia' : 'dias'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#57534E] sm:text-xs">
                        {bestHours} {bestHours === 1 ? 'hora' : 'horas'} preservadas
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-2.5 sm:p-3.5">
                      <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase text-[#8A5A10] sm:text-[11px]">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        <span>Data de início</span>
                      </div>
                      <p className="font-editorial mt-0.5 text-lg font-semibold leading-tight text-[#1C1917] sm:text-2xl">
                        {formatDateBr(goal.currentStartedAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#57534E] sm:text-xs">
                        Contagem automática
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-2.5 sm:p-3.5">
                      <div className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase text-[#8A5A10] sm:text-[11px]">
                        <History className="h-3 w-3" aria-hidden="true" />
                        <span>Tentativas</span>
                      </div>
                      <p className="font-editorial mt-0.5 text-xl font-semibold leading-tight text-[#1C1917] sm:text-3xl">
                        {goal.history.length + 1}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#57534E] sm:text-xs">
                        {goal.history.length === 0
                          ? 'Primeira jornada'
                          : `${goal.history.length} ${goal.history.length === 1 ? 'recomeço' : 'recomeços'}`}
                      </p>
                    </div>
                  </div>

                  {/* Mensagem carinhosa pós-recaída */}
                  {recentlyRelapsed && (
                    <div className="animate-fade-soft mt-3 rounded-xl border border-[#DFCE91] bg-[#FAF0CA] p-3 sm:mt-4 sm:p-4">
                      <p className="text-xs font-semibold leading-relaxed text-[#5C3A21] sm:text-sm">
                        “Uma recaída não apaga todo o seu progresso. Recomeçar também é uma forma de
                        vencer.”
                      </p>
                    </div>
                  )}

                  {/* Celebração de conquista recente */}
                  {latestUnlocked && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#13382C]/25 bg-[#13382C]/5 px-3 py-2.5 sm:mt-4 sm:px-4 sm:py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#13382C]" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-[#13382C] sm:text-sm">
                        <strong>Conquista de {latestUnlocked.title}:</strong>{' '}
                        {latestUnlocked.celebration}
                      </p>
                    </div>
                  )}

                  {/* Barra e gráfico visual de progresso e marcos */}
                  <div className="mt-3 rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-3 sm:mt-4 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-semibold text-[#1C1917]">
                        {nextMilestone
                          ? `Próxima conquista: ${nextMilestone.title}`
                          : 'Todas as metas principais de 1 ano alcançadas!'}
                      </span>
                      <span className="text-[11px] font-medium text-[#8A5A10] sm:text-xs">
                        {nextMilestone
                          ? `${nextProgressPct}% rumo a ${nextMilestone.days} dias`
                          : '365+ dias completos'}
                      </span>
                    </div>

                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#EFE4B8] sm:h-3">
                      <div
                        className="h-full rounded-full bg-[#13382C] transition-all duration-500"
                        style={{ width: `${nextProgressPct}%` }}
                      />
                    </div>

                    {/* Gráfico visual das metas: 1, 3, 7, 15, 30, 60, 90, 180, 365 dias */}
                    <div className="mt-3.5 sm:mt-4">
                      <p className="text-[11px] font-medium text-[#57534E] sm:text-xs">
                        Gráfico de conquistas (1 a 365 dias):
                      </p>
                      <div className="mt-2 grid grid-cols-9 items-end gap-1 sm:gap-2">
                        {MILESTONES.map((milestone) => {
                          const unlocked = daysClean >= milestone.days;
                          const pct = Math.min(
                            100,
                            Math.max(8, Math.round((exactDaysFloat / milestone.days) * 100)),
                          );

                          return (
                            <div
                              key={milestone.days}
                              className="flex flex-col items-center gap-1"
                              title={`${milestone.title}: ${
                                unlocked ? 'Conquistado!' : `${pct}% do caminho`
                              }`}
                            >
                              <div className="flex h-14 w-full items-end overflow-hidden rounded-md border border-[#EADCA6] bg-[#FEF9E6] p-0.5 sm:h-20">
                                <div
                                  className={`w-full rounded-sm transition-all duration-500 ${
                                    unlocked ? 'bg-[#13382C]' : 'bg-[#D6B148]'
                                  }`}
                                  style={{ height: `${unlocked ? 100 : pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-[9.5px] font-semibold sm:text-[11px] ${
                                  unlocked ? 'text-[#13382C]' : 'text-[#78716C]'
                                }`}
                              >
                                {milestone.days}d
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Marcos detalhados */}
                    <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {MILESTONES.map((milestone) => {
                        const unlocked = daysClean >= milestone.days;
                        return (
                          <span
                            key={milestone.days}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-medium sm:px-2.5 sm:text-xs ${
                              unlocked
                                ? 'border-[#13382C]/30 bg-[#13382C]/10 text-[#13382C]'
                                : 'border-[#EADCA6] bg-[#FEF9E6] text-[#78716C]'
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 ${
                                unlocked ? 'text-[#13382C]' : 'text-[#C9B97E]'
                              }`}
                              aria-hidden="true"
                            />
                            <span>{milestone.title}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recaída + Histórico */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRelapseTargetId((prev) => (prev === goal.id ? null : goal.id));
                        setRelapseNote('');
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DFCE91] bg-white px-3 py-1.5 text-[11px] font-medium text-[#5C3A21] hover:bg-[#FAF0CA] cursor-pointer sm:min-h-[40px] sm:px-3.5 sm:text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Registrar recaída</span>
                    </button>

                    {goal.history.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryIds((prev) => ({
                            ...prev,
                            [goal.id]: !prev[goal.id],
                          }))
                        }
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#EADCA6] bg-[#FFFDF4] px-3 py-1.5 text-[11px] font-medium text-[#44403C] hover:bg-[#FAF0CA] cursor-pointer sm:min-h-[40px] sm:px-3.5 sm:text-xs"
                      >
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {historyOpen
                            ? 'Ocultar histórico'
                            : `Histórico (${goal.history.length})`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Confirmação gentil de recaída */}
                  {relapseTargetId === goal.id && (
                    <div className="animate-fade-soft mt-3 rounded-xl border border-[#DFCE91] bg-[#FFFDF4] p-3 sm:mt-4 sm:p-4">
                      <p className="text-xs font-semibold text-[#5C3A21] sm:text-sm">
                        Registrar recaída e recomeçar com acolhimento
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[#57534E] sm:text-xs">
                        Uma recaída não apaga todo o seu progresso. Seu recorde de {bestDays} dia(s)
                        continuará salvo e esta tentativa entrará no histórico.
                      </p>
                      <label htmlFor={`relapse-note-${goal.id}`} className="sr-only">
                        Observação opcional sobre o que sentiu
                      </label>
                      <input
                        id={`relapse-note-${goal.id}`}
                        type="text"
                        maxLength={180}
                        value={relapseNote}
                        onChange={(e) => setRelapseNote(e.target.value)}
                        placeholder="Se quiser, anote o gatilho para se cuidar melhor (opcional)..."
                        className="mt-2 w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                      />
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmRelapse(goal.id)}
                          className="min-h-[36px] rounded-lg bg-[#5C3A21] px-3.5 py-1.5 text-xs font-semibold text-[#FEF9E6] hover:bg-[#462A16] cursor-pointer"
                        >
                          Confirmar e recomeçar hoje
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelapseTargetId(null)}
                          className="min-h-[36px] rounded-lg border border-[#DFCE91] bg-white px-3 py-1.5 text-xs font-medium text-[#44403C] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Histórico de tentativas */}
                  {historyOpen && goal.history.length > 0 && (
                    <div className="animate-fade-soft mt-3 rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-3 sm:mt-4 sm:p-4">
                      <p className="text-xs font-semibold text-[#1C1917] sm:text-sm">
                        Histórico de tentativas anteriores
                      </p>
                      <ul className="mt-2 space-y-2">
                        {goal.history.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-lg border border-[#EADCA6] bg-[#FEF9E6] px-3 py-2 text-xs text-[#44403C]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-semibold text-[#13382C]">
                                {entry.daysAchieved} {entry.daysAchieved === 1 ? 'dia' : 'dias'} e{' '}
                                {entry.hoursAchieved}h conquistados
                              </span>
                              <span className="text-[11px] text-[#78716C]">
                                {formatDateBr(entry.startedAt)} até {formatDateBr(entry.endedAt)}
                              </span>
                            </div>
                            {entry.note && (
                              <p className="mt-1 text-[11.5px] italic text-[#57534E]">
                                “{entry.note}”
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Aviso de saúde e segurança */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#EADCA6] bg-[#FAF0CA]/70 p-3 text-[11.5px] leading-relaxed text-[#4A3B2C] sm:mt-6 sm:p-4 sm:text-xs">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5A10]" aria-hidden="true" />
          <p>
            <strong>Cuidado com a sua saúde:</strong> A Aurora oferece apoio emocional e
            acompanhamento de hábitos, mas não substitui médicos ou psicólogos.
            Em casos de dependência de álcool, medicamentos ou outras substâncias químicas,{' '}
            <strong>nunca interrompa o uso de forma abrupta sem orientação médica</strong> — procure
            uma UBS, CAPS AD ou profissional de saúde para uma travessia segura.
          </p>
        </div>
      </div>
    </section>
  );
}
