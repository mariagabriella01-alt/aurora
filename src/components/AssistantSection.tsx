import { MessageCircleHeart, RotateCcw, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { SpeakButton } from './SpeakButton';
import { VoiceDictationButton } from './VoiceDictationButton';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init-1',
  role: 'model',
  text: 'Oi, você está bem? Eu sou a Clara, sua assistente de acolhimento aqui na Aurora — um novo começo, uma nova esperança. Pode me contar o que está pesando hoje — seja vazio, trabalho demais, bullying na escola, comparação ou qualquer outra dor. Você não precisa enfrentar isso sem ser ouvido(a).',
};

const QUICK_PROMPTS = [
  'Trabalho demais e me sinto exausto(a)',
  'Estou sentindo um vazio por dentro',
  'Sofro bullying na escola e me sinto só',
  'Me comparo muito com os outros',
  'Quero um versículo da Bíblia para ter paz',
];

export function AssistantSection() {
  const { autoReadAssistant, speak } = useAccessibility();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const requestReply = async (historyToSend: ChatMessage[]) => {
    setError(null);
    setLoading(true);
    try {
      const apiMessages = historyToSend
        .filter((m) => m.id !== 'init-1')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };

      if (!res.ok || !data.reply) {
        setError(data.error || 'Não foi possível responder agora. Tente novamente.');
        return;
      }

      const replyId = `m-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: 'model',
          text: data.reply as string,
        },
      ]);

      if (autoReadAssistant) {
        speak(data.reply, replyId);
      }
    } catch {
      setError('Erro de conexão ao falar com a assistente. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    await requestReply(nextHistory);
  };

  const handleRetry = () => {
    if (loading || messages.length === 0) return;
    if (messages[messages.length - 1]?.role !== 'user') return;
    void requestReply(messages);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
    setInput('');
    setVoiceStatus(null);
  };

  return (
    <section id="assistente" className="border-b border-[#EADCA6] bg-[#FEF9E6] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-widest uppercase text-[#13382C]">
              Conversa de apoio por voz ou texto
            </p>
            <h2 className="font-editorial mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
              Converse agora com a nossa assistente de acolhimento
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#57534E]">
              Se preferir não escrever, toque em <strong>Falar por voz</strong> e conte o que está
              sentindo. A resposta também pode ser ouvida em voz alta e acompanhada em texto.
            </p>

            <div className="mt-6">
              <p className="text-xs font-semibold text-[#44403C]">
                Sugestões para começar a conversar:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendMessage(prompt)}
                    className="min-h-[40px] rounded-lg border border-[#DFCE91] bg-[#FFFDF4] px-3 py-2 text-left text-xs font-medium text-[#1C1917] transition-colors hover:border-[#13382C] hover:bg-[#FAF0CA] disabled:opacity-50 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-[#78716C]">
              A assistente oferece escuta acolhedora e orientações gerais, mas não substitui
              psicólogos ou atendimento médico. Em emergência, ligue 188 (CVV).
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="flex flex-col rounded-xl border border-[#EADCA6] bg-[#FFFDF4]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCA6] px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex items-center gap-2.5">
                  <MessageCircleHeart className="h-5 w-5 text-[#13382C]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C1917]">
                      Clara · Assistente de Acolhimento
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DFCE91] bg-white px-3 py-1.5 text-xs font-medium text-[#44403C] hover:bg-[#FAF0CA] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Nova conversa</span>
                </button>
              </div>

              <div ref={scrollRef} className="max-h-[400px] min-h-[260px] space-y-4 overflow-y-auto p-4 sm:p-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line sm:max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-[#13382C] text-[#FEF9E6]'
                          : 'border border-[#EADCA6] bg-[#FDF6DC] text-[#1C1917]'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'model' && (
                      <div className="mt-1.5">
                        <SpeakButton id={msg.id} text={msg.text} label="Ouvir resposta" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl border border-[#EADCA6] bg-[#FDF6DC] px-4 py-3 text-xs text-[#57534E]">
                      Ouvindo você com atenção...
                    </div>
                  </div>
                )}
              </div>

              {voiceStatus && (
                <div
                  aria-live="polite"
                  className="mx-4 mb-2 rounded-lg border border-[#13382C]/25 bg-[#13382C]/5 px-3.5 py-2 text-xs text-[#13382C] sm:mx-5"
                >
                  {voiceStatus}
                </div>
              )}

              {error && (
                <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 sm:mx-5">
                  <span>{error}</span>
                  {messages[messages.length - 1]?.role === 'user' && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRetry}
                      className="min-h-[36px] rounded-md border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2.5 border-t border-[#EADCA6] p-3.5 sm:flex-row sm:items-end sm:p-4"
              >
                <label htmlFor="assistant-input" className="sr-only">
                  Escreva ou fale sua mensagem para a assistente
                </label>
                <textarea
                  id="assistant-input"
                  rows={2}
                  maxLength={1000}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Escreva ou toque em Falar por voz..."
                  className="w-full resize-none rounded-lg border border-[#DFCE91] bg-white px-3.5 py-2.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:flex-1 sm:text-sm"
                />
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <VoiceDictationButton
                    label="Falar por voz"
                    onStatusChange={setVoiceStatus}
                    onTranscript={(spokenText) => {
                      void sendMessage(spokenText);
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || input.trim().length === 0}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#13382C] px-4 py-2.5 text-xs font-semibold text-[#FEF9E6] transition-colors hover:bg-[#0D281F] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer sm:flex-initial"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
