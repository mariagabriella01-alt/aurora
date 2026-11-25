import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { SunflowerLogo } from './SunflowerLogo';

interface HeaderProps {
  onComposeVent: () => void;
}

const NAV_LINKS = [
  { href: '#desabafar', label: 'Desabafar' },
  { href: '#saude-mental', label: 'Saúde Mental' },
  { href: '#superacao', label: 'Minha Superação' },
  { href: '#espaco-de-deus', label: 'Espaço de Deus' },
  { href: '#motivos', label: 'Motivos para Viver' },
  { href: '#ajuda', label: 'Ajuda Agora' },
];

export function Header({ onComposeVent }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#C9A84C] bg-[#FEF9E6]/95 backdrop-blur-sm">
      <div className="bg-[#5C3A21] border-b border-[#462A16] px-2.5 py-1 text-center text-[10.5px] leading-tight font-medium text-[#FEF5D4] sm:px-4 sm:py-1.5 sm:text-xs sm:leading-snug">
        <span>Oi, você está bem? · </span>
        <span className="font-semibold text-[#F7CA18]">Aurora</span>
        <span> — Um novo começo, uma nova esperança</span>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-6 sm:py-2 lg:gap-6 lg:py-3">
        <a
          href="#inicio"
          className="group inline-flex items-center gap-1.5 shrink-0 sm:gap-2.5"
          aria-label="Aurora — Início"
        >
          <SunflowerLogo className="h-6 w-6 sm:h-10 sm:w-10 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span className="font-editorial text-lg sm:text-3xl font-bold tracking-tight text-[#5C3A21] decoration-[#E09F10] decoration-2 underline underline-offset-4 whitespace-nowrap">
            Aurora
          </span>
        </a>

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium text-[#4A3B2C]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 py-1 transition-colors duration-150 hover:text-[#13382C] hover:underline underline-offset-4 decoration-[#13382C]/50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0 sm:gap-2.5">
          <button
            type="button"
            onClick={onComposeVent}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[#13382C] px-2.5 py-1 text-[11px] font-semibold text-[#FEF9E6] transition-all duration-150 hover:bg-[#0D281F] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer sm:min-h-[40px] sm:px-4 sm:py-2 sm:text-xs"
          >
            Escrever Desabafo
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DFCE91] bg-[#FFFDF4] text-[#5C3A21] transition-transform duration-150 active:scale-[0.96] sm:h-11 sm:w-11 lg:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Menu móvel"
          className="animate-fade-soft border-t border-[#EADCA6] bg-[#FEF9E6] px-3 py-2 sm:px-6 sm:py-3 lg:hidden"
        >
          <div className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[38px] items-center rounded-lg px-2.5 text-[12.5px] font-medium text-[#1C1917] transition-colors hover:bg-[#FAF0CA] active:bg-[#FAF0CA] whitespace-nowrap sm:min-h-[40px] sm:text-[13px]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
