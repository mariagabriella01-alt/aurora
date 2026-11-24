import { PhoneCall, ShieldCheck } from 'lucide-react';

export function CrisisSupportSection() {
  return (
    <section id="ajuda" className="border-b border-[#EADCA6] bg-[#FFFDF4] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-widest uppercase text-[#57534E]">
              05 · Ajuda imediata e profissional
            </p>
            <h2 className="font-editorial mt-2 text-3xl font-medium text-[#1C1917] sm:text-4xl text-balance">
              Se a dor estiver insuportável agora, peça ajuda humana imediata
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#57534E]">
              Este site é um espaço de acolhimento emocional, fé e comunidade, mas não substitui
              atendimento psicológico ou psiquiátrico presencial. Você merece cuidado profissional e
              apoio real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
            <div className="flex flex-col justify-between rounded-xl border border-[#0D281F] bg-[#13382C] p-6 text-[#FEF9E6]">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F7CA18]">
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                  <span>Brasil · 24 horas e gratuito</span>
                </div>
                <h3 className="font-editorial mt-3 text-3xl font-semibold tabular-nums">
                  CVV — Ligue 188
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#E7F0ED]">
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
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#FEF9E6] px-4 py-2.5 text-xs font-semibold text-[#13382C] transition-colors hover:bg-[#FAF0CA]"
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                <span>Ligar 188 agora</span>
              </a>
            </div>

            <div className="rounded-xl border border-[#EADCA6] bg-[#FEF9E6] p-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#13382C]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Rede pública e psicoterapia</span>
              </div>
              <h3 className="font-editorial mt-3 text-2xl font-medium text-[#1C1917]">
                CAPS (SUS) e SAMU 192
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#57534E]">
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
