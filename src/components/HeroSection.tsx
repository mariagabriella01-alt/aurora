import { ArrowRight } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import { SpeakButton } from './SpeakButton';
import { SunflowerLogo } from './SunflowerLogo';

interface HeroSectionProps {
  onStartVenting: () => void;
}

const PILLARS = [
  {
    index: '01.',
    title: 'Desabafe sem medo',
    description: 'Coloque para fora o que está pesando no peito, de forma anônima ou com seu nome.',
    href: '#desabafar',
  },
  {
    index: '02.',
    title: 'Cuide da mente e do vazio',
    description: 'Exercícios de respiração, aterramento emocional e diário privado para atravessar a crise.',
    href: '#saude-mental',
  },
  {
    index: '03.',
    title: 'Espaço de Deus',
    description: 'Versículos para dias escuros, orações guiadas e um mural onde outros oram pela sua vida.',
    href: '#espaco-de-deus',
  },
  {
    index: '04.',
    title: 'Motivos para viver',
    description: 'Pequenas e grandes razões reais compartilhadas por quem também decidiu ficar mais um dia.',
    href: '#motivos',
  },
];

export function HeroSection({ onStartVenting }: HeroSectionProps) {
  return (
    <section id="inicio" className="border-b border-[#EADCA6] bg-[#FEF9E6]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-12">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#E5C975] bg-gradient-to-r from-[#FAF0CA] via-[#FFF9DB] to-[#FAF0CA] px-4 py-3 sm:inline-flex">
                <SunflowerLogo className="h-12 w-12 shrink-0" />
                <div>
                  <span className="font-editorial block text-4xl font-bold leading-none tracking-tight text-[#5C3A21] sm:text-5xl">
                    Aurora
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold tracking-widest uppercase text-[#13382C]">
                    Um novo começo, uma nova esperança
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <p className="font-editorial text-2xl font-semibold italic text-[#13382C] sm:text-3xl">
                  Oi, você está bem?
                </p>
                <SpeakButton
                  id="hero-welcome"
                  label="Ouvir boas-vindas"
                  text="Oi, você está bem? Você está no site Aurora: um novo começo, uma nova esperança. Um lugar seguro para esvaziar a dor, acalmar a mente e reencontrar motivos para viver."
                />
              </div>

              <h1 className="font-editorial mt-3 text-[clamp(2rem,3.9vw,3.5rem)] font-medium leading-[1.08] tracking-tight text-[#1C1917] text-balance sm:mt-4">
                Um lugar seguro para esvaziar a dor, acalmar a mente e reencontrar motivos para viver.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-[1.7] text-[#44403C] sm:mt-5">
                Quando o vazio aperta, parece que ninguém entende o silêncio por dentro. Aqui você
                pode desabafar sem julgamentos, conversar com a nossa assistente de apoio, descansar
                na presença de Deus e lembrar por que sua vida importa hoje.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4 sm:mt-8 sm:gap-6">
              <button
                type="button"
                onClick={onStartVenting}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#13382C] px-6 py-3 text-sm font-semibold text-[#FEF9E6] transition-colors duration-150 hover:bg-[#0D281F] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Desabafar agora</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <a
                href="#assistente"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#13382C] underline underline-offset-4 decoration-[#13382C]/50 transition-colors hover:text-[#0D281F] whitespace-nowrap shrink-0"
              >
                Conversar com a assistente
              </a>

              <a
                href="#ajuda"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#5C3A21] underline underline-offset-4 decoration-[#8A5A10]/60 transition-colors hover:text-[#13382C] whitespace-nowrap shrink-0"
              >
                Apoio imediato · Ligue 188 (CVV)
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-64 sm:h-88 lg:h-full min-h-[260px] overflow-hidden rounded-xl border-2 border-[#DFCE91] bg-[#FAF0CA]">
              <ResilientImage
                src="/src/assets/images/hero_sunflower_light_1795536494168.jpg"
                alt="Girassol amarelo iluminado pela luz suave da manhã, simbolizando força, recomeço e esperança"
                fallbackTitle="Um novo começo sob a luz da manhã"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-[#DFCE91] bg-[#DFCE91] sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <a
              key={pillar.index}
              href={pillar.href}
              className="group flex flex-col justify-between bg-[#FFFDF4] p-5 transition-colors duration-150 hover:bg-[#FAF0CA] sm:p-6"
            >
              <div>
                <span className="font-editorial text-lg font-semibold text-[#13382C] tabular-nums">
                  {pillar.index}
                </span>
                <h2 className="font-editorial mt-2 text-2xl font-medium text-[#1C1917] group-hover:text-[#13382C]">
                  {pillar.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#57534E]">
                  {pillar.description}
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#13382C] whitespace-nowrap">
                <span>Acessar espaço</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
