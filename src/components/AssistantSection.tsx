import { MessageCircleHeart, RotateCcw, Send } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import type { SophiaPromptRequest } from '../types';
import { SpeakButton } from './SpeakButton';
import { VoiceDictationButton } from './VoiceDictationButton';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AssistantSectionProps {
  externalPromptRequest?: SophiaPromptRequest | null;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init-1',
  role: 'model',
  text: 'Oi, você está bem? Eu sou a Sophia, sua assistente virtual de acolhimento aqui na Aurora — um novo começo, uma nova esperança. Pode me contar o que está pesando hoje — seja vazio, trabalho demais, bullying na escola, comparação, superação de algum vício ou qualquer outra dor. Você não precisa enfrentar isso sem ser ouvido(a).',
};

const QUICK_PROMPTS = [
  'Trabalho demais e me sinto exausto(a)',
  'Estou sentindo um vazio por dentro',
  'Quero força para superar um vício ou hábito',
  'Sofro bullying na escola e me sinto só',
  'Me comparo muito com os outros',
  'Quero um versículo da Bíblia para ter paz',
];

export function AssistantSection({ externalPromptRequest }: AssistantSectionProps) {
  const { autoReadAssistant, clearSpeechError, prepareAudioForPlayback, speak, speechError, stopSpeaking } =
    useAccessibility();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([INITIAL_MESSAGE]);
  const loadingRef = useRef(false);
  const lastHandledTriggerRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const requestReply = useCallback(
    async (
      historyToSend: ChatMessage[],
      recoveryContext?: SophiaPromptRequest['recoveryContext'],
    ) => {
      setError(null);
      setLoading(true);
      loadingRef.current = true;
      try {
        const apiMessages = historyToSend
          .filter((m) => m.id !== 'init-1')
          .map((m) => ({ role: m.role, text: m.text }));

        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            recoveryContext,
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
        setError('Erro de conexão ao falar com a Sophia. Tente novamente em instantes.');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [autoReadAssistant, speak],
  );

  const sendMessage = useCallback(
    async (
      textToSend: string,
      recoveryContext?: SophiaPromptRequest['recoveryContext'],
    ) => {
      const trimmed = textToSend.trim();
      if (!trimmed || loadingRef.current) return;

      if (autoReadAssistant) {
        prepareAudioForPlayback();
      }

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
      };
      const nextHistory = [...messagesRef.current, userMsg];
      messagesRef.current = nextHistory;
      setMessages(nextHistory);
      setInput('');
      await requestReply(nextHistory, recoveryContext);
    },
    [autoReadAssistant, prepareAudioForPlayback, requestReply],
  );

  useEffect(() => {
    if (!externalPromptRequest) return;
    if (externalPromptRequest.trigger <= lastHandledTriggerRef.current) return;
    lastHandledTriggerRef.current = externalPromptRequest.trigger;
    void sendMessage(externalPromptRequest.prompt, externalPromptRequest.recoveryContext);
  }, [externalPromptRequest, sendMessage]);

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
    stopSpeaking();
    const resetList = [INITIAL_MESSAGE];
    messagesRef.current = resetList;
    setMessages(resetList);
    setError(null);
    setInput('');
    setVoiceStatus(null);
  };

  return (
    <section id="assistente" className="border-b border-[#EADCA6] bg-[#FEF9E6] py-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="text-center sm:text-left lg:col-span-5">
            <p className="text-[10.5px] font-medium tracking-widest uppercase text-[#13382C] sm:text-xs">
              Conversa de apoio por voz ou texto
            </p>
            <h2 className="font-editorial mt-1 text-[1.35rem] font-medium leading-[1.2] text-[#1C1917] sm:mt-2 sm:text-4xl text-balance">
              Converse agora com a Sophia, sua assistente de acolhimento
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-[#57534E] sm:mt-3 sm:text-base sm:leading-relaxed">
              Funciona no celular e no computador: se preferir não escrever, toque em{' '}
              <strong>Falar por voz</strong> e conte o que está sentindo. A resposta da Sophia
              também pode ser ouvida em voz calma e acompanhada em texto.
            </p>

            <div className="mt-3.5 sm:mt-6">
              <p className="text-[11.5px] font-semibold text-[#44403C] sm:text-xs">
                Sugestões para começar a conversar com a Sophia:
              </p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 sm:mt-2.5 sm:justify-start sm:gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendMessage(prompt)}
                    className="min-h-[34px] rounded-lg border border-[#DFCE91] bg-[#FFFDF4] px-2.5 py-1 text-left text-[11px] font-medium text-[#1C1917] transition-all duration-150 hover:border-[#13382C] hover:bg-[#FAF0CA] active:scale-[0.98] disabled:opacity-50 cursor-pointer sm:min-h-[40px] sm:px-3 sm:py-2 sm:text-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-[#78716C] sm:mt-6 sm:text-xs">
              A Sophia é uma assistente virtual de escuta acolhedora e não substitui psicólogos ou
              atendimento médico. Em emergência, ligue 188 (CVV).
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="flex flex-col rounded-xl border border-[#EADCA6] bg-[#FFFDF4]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EADCA6] px-3 py-2.5 sm:px-5 sm:py-4">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <MessageCircleHeart className="h-4 w-4 text-[#13382C] sm:h-5 sm:w-5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-[#1C1917] sm:text-sm">
                      Sophia · Assistente de Acolhimento
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#DFCE91] bg-white px-2 py-1 text-[11px] font-medium text-[#44403C] hover:bg-[#FAF0CA] cursor-pointer sm:min-h-[38px] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                  <span>Nova conversa</span>
                </button>
              </div>

              <div ref={scrollRef} className="max-h-[280px] min-h-[175px] space-y-2.5 overflow-y-auto p-3 sm:max-h-[400px] sm:min-h-[260px] sm:space-y-4 sm:p-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#13382C] text-[#FEF9E6]'
                          : 'border border-[#EADCA6] bg-[#FDF6DC] text-[#1C1917]'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'model' && (
                      <div className="mt-1 sm:mt-1.5">
                        <SpeakButton id={msg.id} text={msg.text} label="Ouvir Sophia" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl border border-[#EADCA6] bg-[#FDF6DC] px-3 py-2 text-xs text-[#57534E] sm:px-4 sm:py-3">
                      Sophia está ouvindo você com atenção...
                    </div>
                  </div>
                )}
              </div>

              {voiceStatus && (
                <div
                  aria-live="polite"
                  className="mx-3 mb-2 rounded-lg border border-[#13382C]/25 bg-[#13382C]/5 px-2.5 py-1.5 text-[11px] text-[#13382C] sm:mx-5 sm:px-3.5 sm:py-2 sm:text-xs"
                >
                  {voiceStatus}
                </div>
              )}

              {speechError && !error && (
                <div
                  aria-live="polite"
                  className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800 sm:mx-5 sm:mb-3 sm:px-3.5 sm:py-2.5 sm:text-xs"
                >
                  <span>{speechError}</span>
                  <button
                    type="button"
                    onClick={clearSpeechError}
                    className="font-semibold text-red-900 underline underline-offset-2 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {error && (
                <div className="mx-3 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800 sm:mx-5 sm:mb-3 sm:px-3.5 sm:py-2.5 sm:text-xs">
                  <span>{error}</span>
                  {messages[messages.length - 1]?.role === 'user' && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRetry}
                      className="min-h-[32px] rounded-md border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 cursor-pointer sm:min-h-[36px]"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-1.5 border-t border-[#EADCA6] p-2.5 sm:flex-row sm:items-end sm:gap-2.5 sm:p-4"
              >
                <label htmlFor="assistant-input" className="sr-only">
                  Escreva ou fale sua mensagem para a Sophia
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
                  placeholder="Escreva para a Sophia ou toque em Falar por voz..."
                  className="w-full resize-none rounded-lg border border-[#DFCE91] bg-white px-2.5 py-1.5 text-base text-[#1C1917] placeholder:text-[#A8A29E] sm:flex-1 sm:px-3.5 sm:py-2.5 sm:text-sm"
                />
                <div className="flex items-center justify-end gap-1.5 shrink-0 sm:gap-2">
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
                    className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#13382C] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#FEF9E6] transition-all duration-150 hover:bg-[#0D281F] active:scale-[0.98] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[44px] sm:flex-initial sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs"
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
