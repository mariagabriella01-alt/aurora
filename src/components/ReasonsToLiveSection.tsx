import { Bookmark, RefreshCw, Sun } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { ReasonTheme, ReasonToLive } from '../types';
import { formatRelativeTimePt } from '../utils/formatters';
import { ResilientImage } from './ResilientImage';
import { SpeakButton } from './SpeakButton';

interface ReasonsToLiveSectionProps {
  reasons: ReasonToLive[];
  onReasonCreated: (reason: ReasonToLive) => void;
  onReasonUpdated: (reason: ReasonToLive) => void;
}

const DAILY_ANCHORS = [
  'A versão sua de daqui a alguns meses ainda vai agradecer por você não ter desistido nesta semana difícil.',
  'Existem músicas que você ainda não ouviu, cafés em manhãs tranquilas e risadas sinceras esperando pelo seu futuro.',
  'Mesmo quando você sente que não faz diferença, a sua presença transforma a história de quem cruza o seu caminho.',
  'Deus ainda escreve capítulos novos justamente nas páginas que achávamos que tinham terminado.',
  'Um dia de cada vez já é vitória suficiente. Hoje você não precisa resolver tudo — só permanecer vivo e cuidado.',
  'Alguém que ainda vai conhecer você precisa exatamente do abraço e da empatia que só quem já sentiu dor consegue oferecer.',
];

const THEMES: readonly ReasonTheme[] = [
  'Pequenos gestos',
  'Pessoas e laços',
  'Fé e propósito',
  'Amanhã',
];

const SAVED_ANCHORS_KEY = 'abrigo_saved_anchors_v1';

export function ReasonsToLiveSection({
  reasons,
  onReasonCreated,
  onReasonUpdated,
}: ReasonsToLiveSectionProps) {
  const [anchorIndex, setAnchorIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'all' | 'saved'>('all');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_ANCHORS_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [author, setAuthor] = useState('');
  const [theme, setTheme] = useState<ReasonTheme>('Amanhã');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleSaveLocal = async (reason: ReasonToLive) => {
    const alreadySaved = savedIds.includes(reason.id);
    const next = alreadySaved
      ? savedIds.filter((id) => id !== reason.id)
      : [...savedIds, reason.id];

    setSavedIds(next);
    try {
      localStorage.setItem(SAVED_ANCHORS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage error
    }

    if (!alreadySaved) {
      try {
        const res = await fetch(`/api/reasons/${reason.id}/heart`, { method: 'POST' });
        if (res.ok) {
          const updated = (await res.json()) as ReasonToLive;
          onReasonUpdated(updated);
        }
      } catch {
        // Keep local save working offline
      }
    }
  };

  const handleCreateReason = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 6) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: author.trim() || 'Anônimo',
          theme,
          content: trimmed,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as ReasonToLive;
        onReasonCreated(created);
        setContent('');
        setAuthor('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayedReasons =
    viewMode === 'saved'
      ? reasons.filter((r) => savedIds.includes(r.id))
      : reasons;

  return (
    <section id="motivos" className="border-b border-[#EADCA6] bg-[#FDF6DC] py-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-3.5 sm:px-6">
        {/* Scenic Sunrise Anchor */}
        <div className="relative overflow-hidden rounded-2xl border border-[#EADCA6] bg-[#1C1917]">
          <div className="h-44 w-full sm:h-80">
            <ResilientImage
              src="/src/assets/images/reasons_sunrise_horizon_1795530097407.jpg"
              alt="Amanhecer sereno sobre lago calmo e colinas com neblina dourada"
              fallbackTitle="O sol sempre volta a nascer"
              className="h-full w-full object-cover opacity-85"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/55 to-[#1C1917]/20"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-10">
            <p className="text-[11px] font-medium tracking-widest uppercase text-[#F6E2A8] sm:text-xs">
              04 · Motivos para viver
            </p>
            <h2 className="font-editorial mt-1 max-w-2xl text-xl font-medium leading-tight text-white sm:mt-2 sm:text-4xl text-balance">
              Pequenas e grandes razões para continuar aqui hoje
            </h2>
          </div>
        </div>

        {/* Daily Hope Spotlight */}
        <div className="mt-5 rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-4 sm:mt-8 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#13382C] sm:text-xs">
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              <span>Lembrete de esperança para hoje</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SpeakButton
                id="daily-hope-anchor"
                label="Ouvir lembrete"
                text={DAILY_ANCHORS[anchorIndex]}
              />
              <button
                type="button"
                onClick={() => setAnchorIndex((prev) => (prev + 1) % DAILY_ANCHORS.length)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DFCE91] bg-white px-3 py-1 text-[11px] font-semibold text-[#1C1917] transition-colors hover:bg-[#FAF0CA] cursor-pointer sm:min-h-[38px] sm:px-3.5 sm:py-1.5 sm:text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ler outro motivo</span>
              </button>
            </div>
          </div>
          <p className="font-editorial mt-3 text-xl leading-snug text-[#1C1917] sm:mt-4 sm:text-3xl">
            “{DAILY_ANCHORS[anchorIndex]}”
          </p>
        </div>

        {/* Mural + Personal Anchor Box */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-10 sm:gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleCreateReason}
            className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-4 sm:p-6 lg:col-span-5"
          >
            <h3 className="font-editorial text-xl font-medium text-[#1C1917] sm:text-2xl">
              Compartilhar um motivo para viver
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#57534E] sm:mt-1.5">
              O que faz você continuar nos dias difíceis? Sua resposta pode ser a luz que alguém
              procura hoje.
            </p>

            <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
              <div>
                <label htmlFor="reason-theme" className="block text-xs font-semibold text-[#44403C]">
                  Tema
                </label>
                <select
                  id="reason-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ReasonTheme)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] sm:mt-1.5 sm:min-h-[44px] sm:px-3.5 sm:py-2.5 sm:text-sm"
                >
                  {THEMES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reason-author" className="block text-xs font-semibold text-[#44403C]">
                  Seu nome ou apelido (opcional)
                </label>
                <input
                  id="reason-author"
                  type="text"
                  maxLength={40}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex.: Anônimo, Júlia, Alguém em paz"
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:mt-1.5 sm:min-h-[44px] sm:px-3.5 sm:py-2.5 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="reason-content" className="block text-xs font-semibold text-[#44403C]">
                  Motivo para continuar
                </label>
                <textarea
                  id="reason-content"
                  rows={3}
                  maxLength={400}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ex.: Ver minha família sorrir, sentir o sol da manhã, realizar um sonho..."
                  className="mt-1 w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:mt-1.5 sm:px-3.5 sm:py-2.5 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || content.trim().length < 6}
                className="min-h-[42px] w-full rounded-lg bg-[#13382C] px-4 py-2 text-xs font-semibold text-[#FEF9E6] transition-all duration-150 hover:bg-[#0D281F] active:scale-[0.98] disabled:opacity-50 cursor-pointer sm:min-h-[44px] sm:px-5 sm:py-2.5"
              >
                {submitting ? 'Publicando...' : 'Adicionar ao mural da esperança'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              <div className="flex w-full rounded-lg bg-[#FAF0CA] p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`min-h-[36px] flex-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer sm:min-h-[38px] sm:flex-initial sm:px-3.5 sm:py-1.5 sm:text-xs ${
                    viewMode === 'all'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Mural coletivo ({reasons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('saved')}
                  className={`min-h-[36px] flex-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer sm:min-h-[38px] sm:flex-initial sm:px-3.5 sm:py-1.5 sm:text-xs ${
                    viewMode === 'saved'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Minha caixa de âncoras ({savedIds.length})
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:mt-5 sm:grid-cols-2 sm:gap-4">
              {displayedReasons.length === 0 ? (
                <div className="col-span-full rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-6 text-center text-sm text-[#57534E] sm:p-8">
                  Você ainda não guardou nenhum motivo na sua caixa. Clique em “Guardar âncora” nos cartões que tocarem seu coração.
                </div>
              ) : (
                displayedReasons.map((reason) => {
                  const isSaved = savedIds.includes(reason.id);
                  return (
                    <article
                      key={reason.id}
                      className="flex flex-col justify-between rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-4 sm:p-5"
                    >
                      <div>
                        <p className="text-[11px] text-[#57534E] sm:text-xs">
                          <span className="font-semibold text-[#13382C]">{reason.theme}</span> ·{' '}
                          {reason.author} · {formatRelativeTimePt(reason.createdAt)}
                        </p>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-[#1C1917] sm:mt-3 sm:text-sm">
                          {reason.content}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-[#F4E9BF] pt-3">
                        <button
                          type="button"
                          onClick={() => toggleSaveLocal(reason)}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            isSaved ? 'text-[#13382C]' : 'text-[#57534E] hover:text-[#13382C]'
                          }`}
                        >
                          <Bookmark
                            className={`h-3.5 w-3.5 ${isSaved ? 'fill-[#13382C]' : ''}`}
                            aria-hidden="true"
                          />
                          <span className="tabular-nums">
                            {isSaved ? 'Guardado na sua caixa' : 'Guardar âncora'} ({reason.savedCount})
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
