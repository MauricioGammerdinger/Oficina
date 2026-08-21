"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ilustração animada da tela de login/cadastro: um carrinho "de
 * personagem" grande, centralizado, que persegue o cursor do mouse e vai
 * trocando de personalidade sozinho (feliz, assustado, apaixonado, com
 * nojo, durão de óculos escuro) — cada troca vem com uma reação/pulinho
 * pra ficar bem vivo. Sem mouse (celular), ele continua balançando
 * sozinho, na suspensão.
 *
 * O rastreio do mouse escreve direto nas variáveis CSS do carrinho (via
 * ref + addEventListener), sem passar por useState — não re-renderiza a
 * árvore de React a cada pixel que o mouse anda. A "profundidade" do
 * deslocamento é calculada a partir do tamanho real do contêiner (medido
 * na hora), então nunca vaza pra fora do quadro, em qualquer tela.
 */

type Expressao = "feliz" | "surpreso" | "apaixonado" | "nojo" | "serio";

const SEQUENCIA: Expressao[] = ["feliz", "surpreso", "apaixonado", "nojo", "serio"];
const TROCA_MS = 2600;

/** Olho normal (redondo, com pupila que acompanha o mouse). */
function OlhoRedondo({ cx, r = 15 }: { cx: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy="49" r={r} fill="white" />
      <circle className="pupila-parallax" cx={cx} cy="49" r={r * 0.45} fill="#1c1917" data-pupila />
    </>
  );
}

/** Olho semicerrado, tipo "─" — cara de nojo. */
function OlhoSemicerrado({ cx }: { cx: number }) {
  return (
    <>
      <path d={`M${cx - 15} 40 L${cx + 15} 35`} stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />
      <path d={`M${cx - 12} 50 Q${cx} 55 ${cx + 12} 50`} stroke="#1c1917" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  );
}

/** Olho de coração — cara de apaixonado. */
function OlhoCoracao({ cx }: { cx: number }) {
  return (
    <path
      d={`M${cx} 58 C${cx - 17} 44, ${cx - 17} 30, ${cx} 40 C${cx + 17} 30, ${cx + 17} 44, ${cx} 58 Z`}
      fill="#f43f5e"
    />
  );
}

/** Rosto (olhos + boca + um "acessório" que reforça a personalidade do
 * momento) de acordo com a expressão atual. */
function Rosto({ expressao }: { expressao: Expressao }) {
  switch (expressao) {
    case "feliz":
      return (
        <>
          <ellipse cx="70" cy="58" rx="10" ry="6.5" fill="#f472b6" opacity="0.55" />
          <ellipse cx="130" cy="58" rx="10" ry="6.5" fill="#f472b6" opacity="0.55" />
          <OlhoRedondo cx={80} />
          <OlhoRedondo cx={120} />
          <path d="M78 63 Q100 78 122 63" stroke="#1c1917" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      );
    case "surpreso":
      return (
        <>
          <path d="M68 26 Q80 17 92 26" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M108 26 Q120 17 132 26" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <OlhoRedondo cx={80} r={17} />
          <OlhoRedondo cx={120} r={17} />
          <ellipse cx="100" cy="66" rx="9" ry="12" fill="#1c1917" />
        </>
      );
    case "apaixonado":
      return (
        <>
          <ellipse cx="70" cy="58" rx="10" ry="6.5" fill="#f472b6" opacity="0.6" />
          <ellipse cx="130" cy="58" rx="10" ry="6.5" fill="#f472b6" opacity="0.6" />
          <OlhoCoracao cx={80} />
          <OlhoCoracao cx={120} />
          <path d="M82 66 Q100 76 118 66" stroke="#1c1917" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      );
    case "nojo":
      return (
        <>
          <path d="M62 32 L78 37" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M84 37 L94 32" stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />
          <OlhoSemicerrado cx={80} />
          <OlhoRedondo cx={120} r={13} />
          <path
            d="M74 64 L86 57 L100 66 L114 57 L126 64"
            stroke="#1c1917"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case "serio":
      return (
        <>
          <path d="M62 40 L138 40" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
          <rect x="62" y="40" width="30" height="19" rx="9" fill="#1c1917" />
          <rect x="108" y="40" width="30" height="19" rx="9" fill="#1c1917" />
          <rect x="67" y="44" width="9" height="6" rx="2.5" fill="white" opacity="0.5" />
          <rect x="113" y="44" width="9" height="6" rx="2.5" fill="white" opacity="0.5" />
          <path d="M80 64 Q100 57 120 63" stroke="#1c1917" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      );
  }
}

function CarroSvg({ expressao }: { expressao: Expressao }) {
  return (
    <svg viewBox="0 0 200 130" className="w-full overflow-visible" aria-hidden>
      <defs>
        <filter id="blur-carro-unico" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Sombra suave e desfocada, em vez de uma elipse sólida */}
      <ellipse
        cx="100"
        cy="106"
        rx="66"
        ry="9"
        fill="#1c1917"
        filter="url(#blur-carro-unico)"
        className="sombra-pulsa"
        opacity="0.2"
      />

      {/* Corpo — dois retângulos bem arredondados da mesma cor, se
          fundindo numa silhueta lisa (sem contorno grosso de desenho). */}
      <rect x="6" y="58" width="188" height="38" rx="19" fill="#f59e0b" />
      <rect x="48" y="20" width="104" height="50" rx="25" fill="#f59e0b" />

      {/* Friso/sombra sutil na base da lataria, só pra dar volume */}
      <rect x="6" y="81" width="188" height="15" rx="7.5" fill="#d97706" opacity="0.35" />

      {/* Vidro */}
      <rect x="62" y="28" width="76" height="32" rx="15" fill="#fcd34d" />

      {/* Brilho/reflexo na lataria */}
      <rect x="16" y="63" width="56" height="8" rx="4" fill="white" opacity="0.35" />

      <Rosto expressao={expressao} />

      {/* Rodas */}
      <circle cx="50" cy="97" r="18" fill="#292524" />
      <circle cx="50" cy="97" r="7.5" fill="#d6d3d1" />
      <circle cx="150" cy="97" r="18" fill="#292524" />
      <circle cx="150" cy="97" r="7.5" fill="#d6d3d1" />
    </svg>
  );
}

export function IlustracaoOficina() {
  const containerRef = useRef<HTMLDivElement>(null);
  const carroRef = useRef<HTMLDivElement>(null);
  const [indiceExpressao, setIndiceExpressao] = useState(0);
  const expressao = SEQUENCIA[indiceExpressao];

  // Troca de personalidade sozinha, de tempos em tempos — a mudança de
  // "key" no wrapper reinicia a animação de reação (o pulinho) a cada vez.
  useEffect(() => {
    const id = setInterval(() => {
      setIndiceExpressao((i) => (i + 1) % SEQUENCIA.length);
    }, TROCA_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const carro = carroRef.current;
    if (!container || !carro) return;

    function aplicar(clientX: number, clientY: number) {
      const rect = container!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // -1..1 em cada eixo, a partir do centro da ilustração
      const dx = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)));

      // Profundidade calculada a partir do tamanho real do contêiner (não
      // um valor fixo em px), pra nunca deixar o carro vazar pra fora do
      // quadro, seja qual for o tamanho da tela.
      const prof = rect.width * 0.14;

      carro!.style.setProperty("--mx", `${dx * prof}px`);
      carro!.style.setProperty("--my", `${dy * prof * 0.75}px`);
      carro!.style.setProperty("--rot", `${dx * 8}deg`);

      const px = dx * 2.4;
      const py = dy * 2.4;
      carro!.querySelectorAll<SVGCircleElement>("[data-pupila]").forEach((p) => {
        p.style.setProperty("--px", `${px}px`);
        p.style.setProperty("--py", `${py}px`);
      });
    }

    function aoMoverMouse(e: MouseEvent) {
      aplicar(e.clientX, e.clientY);
    }
    function aoSair() {
      carro!.style.setProperty("--mx", "0px");
      carro!.style.setProperty("--my", "0px");
      carro!.style.setProperty("--rot", "0deg");
      carro!.querySelectorAll<SVGCircleElement>("[data-pupila]").forEach((p) => {
        p.style.setProperty("--px", "0px");
        p.style.setProperty("--py", "0px");
      });
    }

    window.addEventListener("mousemove", aoMoverMouse);
    window.addEventListener("mouseleave", aoSair);
    return () => {
      window.removeEventListener("mousemove", aoMoverMouse);
      window.removeEventListener("mouseleave", aoSair);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full min-h-72 w-full overflow-hidden">
      {/* Brilhos de "recém-pintado" piscando */}
      <span className="absolute left-[26%] top-[24%] h-2.5 w-2.5 rounded-full bg-white brilho-1" />
      <span className="absolute right-[24%] top-[64%] h-2 w-2 rounded-full bg-white brilho-2" />

      <div
        ref={carroRef}
        className="carro-parallax absolute left-1/2 top-1/2 w-[68%] max-w-80"
      >
        <div key={indiceExpressao} className="reagir">
          <div className="suspensao">
            <CarroSvg expressao={expressao} />
          </div>
        </div>
      </div>
    </div>
  );
}
