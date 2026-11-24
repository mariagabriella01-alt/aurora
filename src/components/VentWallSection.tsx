import { Heart, Lock, MessageCircle, PhoneCall, Send, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { Vent, VentCategory } from '../types';
import { formatRelativeTimePt } from '../utils/formatters';
import { SpeakButton } from './SpeakButton';
import { VoiceDictationButton } from './VoiceDictationButton';

interface VentWallSectionProps {
  vents: Vent[];
  loading: boolean;
  focusTrigger: number;
  selectedTopicRequest?: { category: VentCategory; trigger: number } | null;
  onVentCreated: (vent: Vent) => void;
  onVentUpdated: (vent: Vent) => void;
}

const CATEGORIES: readonly VentCategory[] = [
  'Vazio interior',
  'Trabalho demais',
  'Bullying na escola',
  'Comparação',
  'Ansiedade',
  'Solidão',
  'Cansaço de viver',
  'Recomeço',
];

interface PrivateVent {
  id: string;
  category: VentCategory;
  content: string;
  createdAt: string;
}

const PRIVATE_VENTS_KEY = 'abrigo_private_vents_v1';

const CRISIS_KEYWORDS = [
  'suicid',
  'morrer',
  'me matar',
  'me machucar',
  'acabar com tudo',
  'nao quero mais viver',
  'desistir da vida',
  'desistir de viver',
  'nao aguento mais viver',
  'sumir para sempre',
];

function containsDistressSignal(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CRISIS_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function VentWallSection({
  vents,
  loading,
  focusTrigger,
  selectedTopicRequest,
  onVentCreated,
  onVentUpdated,
}: VentWallSectionProps) {
  const [filter, setFilter] = useState<'Todos' | VentCategory>('Todos');
  const [mode, setMode] = useState<'community' | 'private'>('community');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<VentCategory>('Vazio interior');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCrisisCare, setShowCrisisCare] = useState(false);

  const [privateVents, setPrivateVents] = useState<PrivateVent[]>(() => {
    try {
      const saved = localStorage.getItem(PRIVATE_VENTS_KEY);
      return saved ? (JSON.parse(saved) as PrivateVent[]) : [];
    } catch {
      return [];
    }
  });

  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [embracedIds, setEmbracedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (focusTrigger > 0) {
      const el = document.getElementById('vent-textarea');
      el?.focus();
    }
  }, [focusTrigger]);

  useEffect(() => {
    if (selectedTopicRequest && selectedTopicRequest.trigger > 0) {
      setCategory(selectedTopicRequest.category);
      setFilter(selectedTopicRequest.category);
      const el = document.getElementById('vent-textarea');
      el?.focus();
    }
  }, [selectedTopicRequest]);

  const savePrivateVents = (items: PrivateVent[]) => {
    setPrivateVents(items);
    try {
      localStorage.setItem(PRIVATE_VENTS_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors gracefully
    }
  };

  const handleSubmitVent = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmed = content.trim();
    if (trimmed.length < 8) {
      setFeedback({
        type: 'error',
        text: 'Escreva um pouco mais sobre o que você está sentindo (mínimo 8 caracteres).',
      });
      return;
    }

    const distressDetected = containsDistressSignal(trimmed);
    setShowCrisisCare(distressDetected);

    if (mode === 'private') {
      const item: PrivateVent = {
        id: `priv-${Date.now()}`,
        category,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      savePrivateVents([item, ...privateVents]);
      setContent('');
      setFeedback({
        type: 'success',
        text: 'Seu desabafo foi guardado apenas neste navegador. Que colocar isso para fora traga alívio ao seu coração.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: author.trim() || 'Anônimo',
          category,
          content: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Não foi possível enviar agora.' });
        return;
      }
      onVentCreated(data as Vent);
      setContent('');
      setAuthor('');
      setFeedback({
        type: 'success',
        text: 'Seu desabafo foi publicado com carinho. Você não precisa carregar esse peso sozinho(a).',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Houve um erro de conexão ao publicar. Você também pode salvar como desabafo privado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmbrace = async (ventId: string) => {
    if (embracedIds[ventId]) return;
    setEmbracedIds((prev) => ({ ...prev, [ventId]: true }));
    try {
      const res = await fetch(`/api/vents/${ventId}/embrace`, { method: 'POST' });
      if (res.ok) {
        const updated = (await res.json()) as Vent;
        onVentUpdated(updated);
      }
    } catch {
      // Keep UI gentle if offline
    }
  };

  const handleReplySubmit = async (e: FormEvent, ventId: string) => {
    e.preventDefault();
    if (replyContent.trim().length < 4) return;

    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/vents/${ventId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: replyAuthor.trim() || 'Alguém que se importa',
          content: replyContent.trim(),
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Vent;
        onVentUpdated(updated);
        setReplyContent('');
        setReplyAuthor('');
        setOpenReplyId(null);
      }
    } finally {
      setReplySubmitting(false);
    }
  };

  const filteredVents =
    filter === 'Todos' ? vents : vents.filter((v) => v.category === filter);

  return (
    <section id="desabafar" className="border-b border-[#EADCA6] bg-[#FEF9E6] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest uppercase text-[#57534E]">
            01 · Escuta e acolhimento humano
          </p>
          <h2 className="font-editorial mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
            Coloque para fora o que está doendo — e ajude quem precisa ser ouvido
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#57534E]">
            Às vezes o vazio diminui quando ganha palavras. Escreva para a comunidade receber apoio
            ou guarde apenas para você em uma carta privada.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 lg:grid-cols-12 lg:gap-10">
          {/* Composer */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSubmitVent}
              className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#EADCA6] pb-4">
                <h3 className="font-editorial text-2xl font-medium text-[#1C1917]">
                  Escrever desabafo
                </h3>
              </div>

              <div className="mt-4 flex rounded-lg bg-[#FAF0CA] p-1">
                <button
                  type="button"
                  onClick={() => setMode('community')}
                  className={`min-h-[40px] flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'community'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Compartilhar no mural
                </button>
                <button
                  type="button"
                  onClick={() => setMode('private')}
                  className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    mode === 'private'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Só para mim</span>
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="vent-category"
                    className="block text-xs font-semibold text-[#44403C]"
                  >
                    O que mais descreve esse momento?
                  </label>
                  <select
                    id="vent-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VentCategory)}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] sm:text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {mode === 'community' && (
                  <div>
                    <label
                      htmlFor="vent-author"
                      className="block text-xs font-semibold text-[#44403C]"
                    >
                      Como prefere ser chamado(a)? (opcional)
                    </label>
                    <input
                      id="vent-author"
                      type="text"
                      maxLength={40}
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Ex.: Anônimo, Maria, Um coração cansado"
                      className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                    />
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="vent-textarea"
                      className="block text-xs font-semibold text-[#44403C]"
                    >
                      Seu desabafo
                    </label>
                    <VoiceDictationButton
                      label="Falar desabafo"
                      onTranscript={(spoken) =>
                        setContent((prev) => (prev ? `${prev} ${spoken}` : spoken))
                      }
                    />
                  </div>
                  <textarea
                    id="vent-textarea"
                    rows={5}
                    maxLength={1200}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva ou toque em Falar desabafo para contar o que está sentindo..."
                    className="mt-1.5 w-full rounded-lg border border-[#DFCE91] bg-white px-3.5 py-3 text-base leading-relaxed text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                  />
                  <p className="mt-1 text-right text-xs text-[#78716C] tabular-nums">
                    {content.length}/1200
                  </p>
                </div>

                {feedback && (
                  <p
                    role="status"
                    className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${
                      feedback.type === 'success'
                        ? 'border-[#13382C]/25 bg-[#13382C]/5 text-[#13382C]'
                        : 'border-red-300 bg-red-50 text-red-800'
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}

                {showCrisisCare && (
                  <div
                    role="note"
                    className="rounded-lg border border-[#8A5A10]/35 bg-[#FDF3CF] p-4 text-xs leading-relaxed text-[#44403C]"
                  >
                    <p className="font-semibold text-[#1C1917]">
                      Se a dor estiver pesada demais agora, você não precisa passar por isso só.
                    </p>
                    <p className="mt-1">
                      O CVV atende gratuitamente 24 horas por dia em todo o Brasil, com sigilo total
                      por telefone ou chat.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href="tel:188"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#5C3A21] px-3.5 py-2 font-semibold text-[#FEF9E6] hover:bg-[#462A16]"
                      >
                        <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ligar 188 (CVV)</span>
                      </a>
                      <a
                        href="#ajuda"
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2 font-semibold text-[#1C1917] hover:bg-[#FAF0CA]"
                      >
                        Ver canais de apoio
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#13382C] px-5 py-3 text-sm font-semibold text-[#FEF9E6] transition-colors duration-150 hover:bg-[#0D281F] disabled:opacity-60 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {submitting
                      ? 'Enviando...'
                      : mode === 'private'
                        ? 'Guardar em meu espaço privado'
                        : 'Publicar desabafo com segurança'}
                  </span>
                </button>
              </div>
            </form>

            {privateVents.length > 0 && (
              <div className="mt-6 rounded-xl border border-[#EADCA6] bg-[#FAF0CA] p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-editorial text-xl font-medium text-[#1C1917]">
                    Seus desabafos privados
                  </h4>
                  <span className="text-xs text-[#57534E] tabular-nums">
                    {privateVents.length} {privateVents.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#57534E]">
                  Visíveis apenas neste dispositivo. Quando quiser soltar o peso, você pode apagá-los.
                </p>
                <div className="mt-4 space-y-3">
                  {privateVents.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#EADCA6] bg-[#FFFDF4] p-4"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
                        <span>
                          {item.category} · {formatRelativeTimePt(item.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            savePrivateVents(privateVents.filter((p) => p.id !== item.id))
                          }
                          aria-label="Soltar e remover desabafo privado"
                          className="inline-flex min-h-[36px] items-center gap-1 text-xs font-medium text-[#57534E] hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Soltar</span>
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#292524]">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Community Feed */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#FAF0CA] p-1.5">
              {(['Todos', ...CATEGORIES] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-5">
              {loading ? (
                <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-8 text-center text-sm text-[#57534E]">
                  Carregando desabafos da comunidade...
                </div>
              ) : filteredVents.length === 0 ? (
                <div className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-8 text-center text-sm text-[#57534E]">
                  Ainda não há desabafos nessa categoria. Se quiser, você pode ser a primeira pessoa a escrever.
                </div>
              ) : (
                filteredVents.map((vent) => (
                  <article
                    key={vent.id}
                    className="rounded-xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                      <span className="font-semibold text-[#13382C]">{vent.author}</span>
                      <span aria-hidden="true">·</span>
                      <span>{vent.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTimePt(vent.createdAt)}</span>
                    </div>

                    <p className="mt-3 text-[15px] leading-[1.7] text-[#1C1917]">
                      {vent.content}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#F4E9BF] pt-4 sm:gap-5">
                      <button
                        type="button"
                        onClick={() => handleEmbrace(vent.id)}
                        className={`inline-flex min-h-[38px] items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          embracedIds[vent.id]
                            ? 'text-[#13382C]'
                            : 'text-[#57534E] hover:text-[#13382C]'
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${embracedIds[vent.id] ? 'fill-[#13382C]' : ''}`}
                          aria-hidden="true"
                        />
                        <span className="tabular-nums">
                          {embracedIds[vent.id] ? 'Acolhimento enviado' : 'Enviar acolhimento'} ({vent.embraces})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenReplyId((prev) => (prev === vent.id ? null : vent.id))
                        }
                        className="inline-flex min-h-[38px] items-center gap-2 text-xs font-semibold text-[#57534E] transition-colors hover:text-[#1C1917] whitespace-nowrap cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        <span className="tabular-nums">
                          Apoiar com palavras ({vent.replies.length})
                        </span>
                      </button>

                      <SpeakButton
                        id={`vent-read-${vent.id}`}
                        label="Ouvir desabafo"
                        text={`${vent.author} sobre ${vent.category}: ${vent.content}`}
                      />
                    </div>

                    {vent.replies.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-[#F4E9BF] pt-4">
                        {vent.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg bg-[#FAF0CA] px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-[#57534E]">
                              <span className="font-semibold text-[#1C1917]">{reply.author}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatRelativeTimePt(reply.createdAt)}</span>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#292524]">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {openReplyId === vent.id && (
                      <form
                        onSubmit={(e) => handleReplySubmit(e, vent.id)}
                        className="mt-4 space-y-3 border-t border-[#F4E9BF] pt-4"
                      >
                        <input
                          type="text"
                          maxLength={40}
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                          placeholder="Seu nome ou apelido (opcional)"
                          className="min-h-[42px] w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-xs"
                        />
                        <textarea
                          rows={2}
                          maxLength={600}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Escreva uma palavra gentil para ajudar essa pessoa hoje..."
                          className="w-full rounded-lg border border-[#DFCE91] bg-white px-3 py-2 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:text-sm"
                        />
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setOpenReplyId(null)}
                            className="min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={replySubmitting || replyContent.trim().length < 4}
                            className="min-h-[40px] rounded-lg bg-[#13382C] px-4 py-2 text-xs font-semibold text-[#FEF9E6] hover:bg-[#0D281F] disabled:opacity-50 cursor-pointer"
                          >
                            {replySubmitting ? 'Enviando...' : 'Enviar apoio'}
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
