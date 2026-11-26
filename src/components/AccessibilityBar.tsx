import {
  Award,
  Brain,
  Eye,
  HeartHandshake,
  Mic,
  MicOff,
  PhoneCall,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

interface AccessibilityBarProps {
  onNavigateSection: (id: string) => void;
  onComposeVent: () => void;
}

export function AccessibilityBar({ onNavigateSection, onComposeVent }: AccessibilityBarProps) {
  const {
    easyVisualMode,
    setEasyVisualMode,
    listeningCommand,
    lastCommandHeard,
    commandFeedback,
    startVoiceCommand,
    stopVoiceCommand,
  } = useAccessibility();

  const visualTiles = [
    {
      label: 'Desabafar',
      icon: HeartHandshake,
      action: onComposeVent,
    },
    {
      label: 'Superação',
      icon: Award,
      action: () => onNavigateSection('superacao'),
    },
    {
      label: 'Respirar',
      icon: Brain,
      action: () => onNavigateSection('saude-mental'),
    },
    {
      label: 'Deus',
      icon: Sparkles,
      action: () => onNavigateSection('espaco-de-deus'),
    },
    {
      label: 'Viver',
      icon: Sun,
      action: () => onNavigateSection('motivos'),
    },
    {
      label: 'Ligar 188',
      icon: PhoneCall,
      action: () => onNavigateSection('ajuda'),
    },
  ];

  return (
    <section
      aria-label="Acessibilidade por voz, ícones e Libras"
      className="border-b border-[#EADCA6] bg-[#FAF0CA]"
    >
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-3.5">
        <div className="flex flex-col items-center justify-between gap-1.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start sm:gap-2">
            <button
              type="button"
              data-mic-control="true"
              onClick={() => (listeningCommand ? stopVoiceCommand() : startVoiceCommand())}
              aria-pressed={listeningCommand}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs ${
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
              onClick={() => setEasyVisualMode(!easyVisualMode)}
              aria-pressed={easyVisualMode}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[42px] sm:px-3.5 sm:py-2 sm:text-xs ${
                easyVisualMode
                  ? 'border-[#5C3A21] bg-[#5C3A21] text-[#FEF9E6]'
                  : 'border-[#DFCE91] bg-[#FFFDF4] text-[#1C1917] hover:border-[#5C3A21]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Modo visual por ícones e Libras</span>
            </button>
          </div>

          <p className="text-center text-[10.5px] leading-snug text-[#57534E] sm:text-left sm:text-xs">
            Para surdos: legendas visuais ativas e tradutor em Libras no canto da tela.
          </p>
        </div>

        {(commandFeedback || lastCommandHeard) && (
          <div
            aria-live="polite"
            className="animate-fade-soft mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EADCA6] bg-[#FFFDF4] px-3 py-1.5 text-[11px] text-[#1C1917] sm:mt-3 sm:px-3.5 sm:py-2 sm:text-xs"
          >
            <div>
              {commandFeedback && (
                <span className="font-medium text-[#13382C]">{commandFeedback}</span>
              )}
            </div>
          </div>
        )}

        {easyVisualMode && (
          <div className="animate-fade-soft mt-2.5 rounded-xl border border-[#DFCE91] bg-[#FFFDF4] p-3 sm:mt-4 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#EADCA6] pb-2 sm:gap-2 sm:pb-3">
              <p className="text-[11.5px] font-semibold text-[#1C1917] sm:text-sm">
                Toque em um ícone para ir direto — ou fale pelo microfone
              </p>
              <p className="text-[10.5px] text-[#57534E] sm:text-xs">
                Cada botão possui ícone visual claro para navegar com facilidade.
              </p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
              {visualTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={tile.action}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-[#EADCA6] bg-[#FEF9E6] px-1.5 py-2.5 text-center transition-all duration-150 hover:border-[#13382C] hover:bg-[#13382C]/5 active:scale-[0.97] cursor-pointer sm:min-h-[88px] sm:gap-2 sm:px-3 sm:py-4"
                  >
                    <Icon className="h-4.5 w-4.5 text-[#13382C] sm:h-7 sm:w-7" aria-hidden="true" />
                    <span className="text-[11px] font-semibold text-[#1C1917] sm:text-sm">{tile.label}</span>
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
