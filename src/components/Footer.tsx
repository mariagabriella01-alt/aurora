import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { SpeakButton } from './SpeakButton';
import { SunflowerLogo } from './SunflowerLogo';

const SHARED_APP_URL = 'https://ais-pre-wslxfozirwnrd2ujbjfb7u-928246110793.us-east1.run.app';

const CREATOR_STORY =
  'Por que eu criei a Aurora: Eu criei a Aurora porque acredito que ninguém merece sofrer, porque se sentir sozinho é a pior sensação do mundo. Coloquei o espaço de Deus porque Deus sempre esteve com vocês e nunca nos abandonou. A Aurora foi criada para ajudar — essa ideia nasceu porque eu sempre ajudei as pessoas e quero continuar assim. Não se esqueçam: vocês não estão sós. Deus está com vocês e eu também. Beijos da criadora, Maria Gabriella dos Santos Silva. Você consegue, você não está sozinho.';

function getShareUrl(): string {
  if (typeof window === 'undefined') return SHARED_APP_URL;
  const { origin, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('ais-dev-')) {
    return SHARED_APP_URL;
  }
  return origin || SHARED_APP_URL;
}

export function Footer() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareData = {
      title: 'Aurora — Um novo começo, uma nova esperança',
      text: 'Oi, você está bem? Conheça a Aurora: um espaço acolhedor para desabafar, cuidar da saúde mental, encontrar versículos, momentos com Deus e motivos para viver.',
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User cancelled or share sheet unavailable — fall back to clipboard copy
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 3000);
        }
      } catch {
        setCopied(false);
      }
    }
  };

  return (
    <footer className="bg-[#FEF9E6] py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 grid grid-cols-1 gap-8 rounded-2xl border border-[#EADCA6] bg-[#FFFDF4] p-5 sm:p-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-widest uppercase text-[#8A5A10]">
                Por que eu criei a Aurora
              </p>
              <SpeakButton
                id="creator-letter"
                label="Ouvir mensagem da criadora"
                text={CREATOR_STORY}
              />
            </div>

            <p className="mt-4 text-base leading-[1.75] text-[#292524]">
              Eu criei a Aurora porque acredito que ninguém merece sofrer — porque se sentir
              sozinha é a pior sensação do mundo. Coloquei o espaço de Deus porque Deus sempre
              esteve com vocês e nunca nos abandonou. A Aurora foi criada para ajudar; essa ideia
              nasceu porque eu sempre ajudei as pessoas e quero continuar assim.
            </p>
            <p className="mt-3 text-base leading-[1.75] text-[#292524]">
              Não se esqueçam: vocês não estão sós. Deus está com vocês, e eu também.
            </p>
            <p className="font-editorial mt-4 text-xl italic text-[#13382C]">
              Beijos da criadora: Maria Gabriella dos Santos Silva
            </p>
          </div>

          <div className="border-t border-[#EADCA6] pt-6 text-left lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 lg:text-center">
            <p className="font-editorial text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
              Você consegue, você não está sozinho.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#57534E]">
              Respire fundo, dê um passo pequeno hoje e lembre-se de que sempre existe cuidado e
              recomeço esperando por você.
            </p>

            <div className="mt-6 flex flex-col items-start gap-2 lg:items-center">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#13382C] px-4 py-2.5 text-xs font-semibold text-[#FEF9E6] transition-colors duration-150 hover:bg-[#0D281F] cursor-pointer sm:w-auto"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Link da Aurora copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    <span>Compartilhar a Aurora com alguém</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#78716C] break-all">{SHARED_APP_URL}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 border-t border-[#EADCA6] pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <SunflowerLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="font-editorial text-2xl font-bold text-[#5C3A21]">Aurora</p>
              <p className="text-xs text-[#57534E]">
                Um novo começo, uma nova esperança. Sua vida tem valor hoje.
              </p>
            </div>
          </div>

          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#57534E]">
            <a href="#desabafar" className="py-1.5 hover:text-[#1C1917]">
              Desabafar
            </a>
            <a href="#assistente" className="py-1.5 hover:text-[#1C1917]">
              Assistente
            </a>
            <a href="#saude-mental" className="py-1.5 hover:text-[#1C1917]">
              Saúde Mental
            </a>
            <a href="#espaco-de-deus" className="py-1.5 hover:text-[#1C1917]">
              Espaço de Deus
            </a>
            <a href="#motivos" className="py-1.5 hover:text-[#1C1917]">
              Motivos para Viver
            </a>
            <a href="#ajuda" className="py-1.5 hover:text-[#1C1917]">
              CVV 188
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
