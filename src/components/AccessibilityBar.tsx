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
      <div className="mx-auto max-w-6xl px-3.5 py-2.5 sm:px-6 sm:py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => (listeningCommand ? stopVoiceCommand() : startVoiceCommand())}
              aria-pressed={listeningCommand}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs ${
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
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DFCE91] bg-[#FFFDF4] px-2.5 py-1.5 text-[11px] font-semibold text-[#1C1917] transition-all duration-150 hover:border-[#13382C] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:px-3.5 sm:py-2 sm:text-xs"
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
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:px-3.5 sm:py-2 sm:text-xs ${
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
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:px-3.5 sm:py-2 sm:text-xs ${
                easyVisualMode
                  ? 'border-[#5C3A21] bg-[#5C3A21] text-[#FEF9E6]'
                  : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#5C3A21]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Modo visual por ícones e Libras</span>
            </button>
          </div>

          <p className="text-[11px] leading-snug text-[#57534E] sm:text-xs">
            Para surdos: legendas visuais ativas e tradutor em Libras no canto da tela.
          </p>
        </div>

        {(commandFeedback || lastCommandHeard || spokenCaption) && (
          <div
            aria-live="polite"
            className="animate-fade-soft mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EADCA6] bg-[#FFFDF4] px-3 py-2 text-[11px] text-[#1C1917] sm:mt-3 sm:px-3.5 sm:text-xs"
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
          <div className="animate-fade-soft mt-3 rounded-xl border border-[#DFCE91] bg-[#FFFDF4] p-3.5 sm:mt-4 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-[#EADCA6] sm:gap-2 sm:pb-3">
              <p className="text-xs font-semibold text-[#1C1917] sm:text-sm">
                Toque em um ícone para ir direto — ou fale pelo microfone
              </p>
              <p className="text-[11px] text-[#57534E] sm:text-xs">
                Cada botão possui ícone visual claro e leitura em voz alta.
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 sm:mt-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
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
                    className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#EADCA6] bg-[#FEF9E6] px-2 py-3 text-center transition-all duration-150 hover:border-[#13382C] hover:bg-[#13382C]/5 active:scale-[0.97] cursor-pointer sm:min-h-[88px] sm:gap-2 sm:px-3 sm:py-4"
                  >
                    <Icon className="h-5 w-5 text-[#13382C] sm:h-7 sm:w-7" aria-hidden="true" />
                    <span className="text-xs font-semibold text-[#1C1917] sm:text-sm">{tile.label}</span>
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
