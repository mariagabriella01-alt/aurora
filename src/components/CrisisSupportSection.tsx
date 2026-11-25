import { PhoneCall, ShieldCheck } from 'lucide-react';

export function CrisisSupportSection() {
  return (
    <section id="ajuda" className="border-b border-[#EADCA6] bg-[#FFFDF4] py-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-3.5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-[#57534E] sm:text-xs">
              05 · Ajuda imediata e profissional
            </p>
            <h2 className="font-editorial mt-1.5 text-2xl font-medium text-[#1C1917] sm:mt-2 sm:text-4xl text-balance">
              Se a dor estiver insuportável agora, peça ajuda humana imediata
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#57534E] sm:mt-4 sm:text-sm">
              Este site é um espaço de acolhimento emocional, fé e comunidade, mas não substitui
              atendimento psicológico ou psiquiátrico presencial. Você merece cuidado profissional e
              apoio real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-7">
            <div className="flex flex-col justify-between rounded-xl border border-[#0D281F] bg-[#13382C] p-4 text-[#FEF9E6] sm:p-6">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#F7CA18] sm:text-xs">
                  <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                  <span>Brasil · 24 horas e gratuito</span>
                </div>
                <h3 className="font-editorial mt-2 text-2xl font-semibold tabular-nums sm:mt-3 sm:text-3xl">
                  CVV — Ligue 188
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#E7F0ED] sm:mt-2 sm:text-sm">
                  O Centro de Valorização da Vida oferece apoio emocional e prevenção do suicídio com
                  total sigilo, por telefone (188) ou chat em{' '}
                  <a
                    href="https://cvv.org.br"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 font-semibold text-[#F7CA18]"
                  >
                    cvv.org.br
                  </a>
                  .
                </p>
              </div>
              <a
                href="tel:188"
                className="mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#FEF9E6] px-4 py-2 text-xs font-semibold text-[#13382C] transition-all duration-150 hover:bg-[#FAF0CA] active:scale-[0.98] sm:min-h-[44px] sm:py-2.5"
              >
                <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span>Ligar 188 agora</span>
              </a>
            </div>

            <div className="rounded-xl border border-[#EADCA6] bg-[#FEF9E6] p-4 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#13382C] sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span>Rede pública e psicoterapia</span>
              </div>
              <h3 className="font-editorial mt-2 text-xl font-medium text-[#1C1917] sm:mt-3 sm:text-2xl">
                CAPS (SUS) e SAMU 192
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#57534E] sm:mt-2 sm:text-sm">
                Em emergências médicas ou risco imediato, ligue para o SAMU <strong>192</strong> ou
                procure o <strong>CAPS</strong> (Centro de Atenção Psicossocial) mais próximo de
                você gratuitamente pelo SUS. Para terapia contínua, busque psicólogos com registro
                ativo no CRP.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
