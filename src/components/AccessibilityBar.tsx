import {
  Brain,
  Ear,
  Eye,
  HeartHandshake,
  MessageCircleHeart,
  Mic,
  MicOff,
  PhoneCall,
  Sparkles,
  Square,
  Sun,
  Volume2,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

interface AccessibilityBarProps {
  onNavigateSection: (id: string) => void;
  onComposeVent: () => void;
}

export function AccessibilityBar({ onNavigateSection, onComposeVent }: AccessibilityBarProps) {
  const {
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
  } = useAccessibility();

  const visualTiles = [
    {
      label: 'Desabafar',
      spoken: 'Abrir espaço para desabafar falando ou escrevendo.',
      icon: HeartHandshake,
      action: onComposeVent,
    },
    {
      label: 'Conversar',
      spoken: 'Conversar por voz ou texto com a assistente Clara.',
      icon: MessageCircleHeart,
      action: () => onNavigateSection('assistente'),
    },
    {
      label: 'Respirar',
      spoken: 'Fazer exercício visual de respiração e acalmar a mente.',
      icon: Brain,
      action: () => onNavigateSection('saude-mental'),
    },
    {
      label: 'Deus',
      spoken: 'Abrir espaço de Deus, orações e versículos da Bíblia.',
      icon: Sparkles,
      action: () => onNavigateSection('espaco-de-deus'),
    },
    {
      label: 'Viver',
      spoken: 'Ver motivos para viver e mensagens de esperança.',
      icon: Sun,
      action: () => onNavigateSection('motivos'),
    },
    {
      label: 'Ligar 188',
      spoken: 'Ver telefone gratuito 188 para apoio imediato.',
      icon: PhoneCall,
      action: () => onNavigateSection('ajuda'),
    },
  ];

  return (
    <section
      aria-label="Acessibilidade por voz, áudio, ícones e Libras"
      className="border-b border-[#EADCA6] bg-[#FAF0CA]"
    >
      <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (listeningCommand ? stopVoiceCommand() : startVoiceCommand())}
              aria-pressed={listeningCommand}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                listeningCommand
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-[#13382C] bg-[#13382C] text-[#FEF9E6] hover:bg-[#0D281F]'
              }`}
            >
              {listeningCommand ? (
                <>
                  <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ouvindo comando... (Parar)</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Comando de voz</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (speakingId === 'page-guide') {
                  stopSpeaking();
                } else {
                  speak(
                    'Oi, você está bem? Você está na Aurora, um novo começo, uma nova esperança. Toque no botão verde Comando de voz e diga desabafar, assistente, saúde mental, Deus, motivos ou ajuda. Você consegue, você não está sozinho.',
                    'page-guide',
                  );
                }
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-[#DFCE91] bg-[#FFFDF4] px-3.5 py-2 text-xs font-semibold text-[#1C1917] transition-colors hover:border-[#13382C] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {speakingId === 'page-guide' ? (
                <>
                  <Square className="h-3 w-3 fill-current text-[#13382C]" aria-hidden="true" />
                  <span>Parar voz</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#13382C]" aria-hidden="true" />
                  <span>Ouvir guia</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAutoReadAssistant(!autoReadAssistant)}
              aria-pressed={autoReadAssistant}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoReadAssistant
                  ? 'border-[#13382C]/40 bg-[#13382C]/10 text-[#13382C]'
                  : 'border-[#DFCE91] bg-[#FFFDF4] text-[#57534E]'
              }`}
            >
              <Ear className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Leitura automática: {autoReadAssistant ? 'Ligada' : 'Desligada'}</span>
            </button>

            <button
              type="button"
              onClick={() => setEasyVisualMode(!easyVisualMode)}
              aria-pressed={easyVisualMode}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                easyVisualMode
                  ? 'border-[#5C3A21] bg-[#5C3A21] text-[#FEF9E6]'
                  : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#5C3A21]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Modo visual por ícones e Libras</span>
            </button>
          </div>

          <p className="text-xs text-[#57534E]">
            Para surdos: legendas visuais ativas e tradutor em Libras no canto da tela.
          </p>
        </div>

        {(commandFeedback || lastCommandHeard || spokenCaption) && (
          <div
            aria-live="polite"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EADCA6] bg-[#FFFDF4] px-3.5 py-2 text-xs text-[#1C1917]"
          >
            <div>
              {commandFeedback && <span className="font-medium text-[#13382C]">{commandFeedback}</span>}
              {!commandFeedback && spokenCaption && (
                <span>
                  <strong className="font-semibold text-[#13382C]">Legenda em áudio:</strong>{' '}
                  {spokenCaption.slice(0, 180)}
                  {spokenCaption.length > 180 ? '...' : ''}
                </span>
              )}
            </div>
            {speakingId && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="font-semibold text-[#5C3A21] underline underline-offset-2 cursor-pointer"
              >
                Silenciar voz
              </button>
            )}
          </div>
        )}

        {easyVisualMode && (
          <div className="mt-4 rounded-xl border border-[#DFCE91] bg-[#FFFDF4] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EADCA6]">
              <p className="text-sm font-semibold text-[#1C1917]">
                Toque em um ícone para ir direto — ou fale pelo microfone
              </p>
              <p className="text-xs text-[#57534E]">
                Cada botão possui ícone visual claro e leitura em voz alta.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {visualTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={() => {
                      speak(tile.spoken, `tile-${tile.label}`);
                      tile.action();
                    }}
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-[#EADCA6] bg-[#FEF9E6] px-3 py-4 text-center transition-colors hover:border-[#13382C] hover:bg-[#13382C]/5 cursor-pointer"
                  >
                    <Icon className="h-7 w-7 text-[#13382C]" aria-hidden="true" />
                    <span className="text-sm font-semibold text-[#1C1917]">{tile.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
