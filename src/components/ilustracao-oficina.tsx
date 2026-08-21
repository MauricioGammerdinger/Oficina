/**
 * Ilustração animada da tela de login/cadastro — um carrinho sendo pintado,
 * com gotas de tinta flutuando ao redor. Puramente CSS (ver .flutuar-* em
 * globals.css), sem JavaScript nem biblioteca externa, então funciona igual
 * em qualquer navegador e não pesa nada.
 */
export function IlustracaoOficina() {
  return (
    <div className="relative flex h-full min-h-64 w-full items-center justify-center overflow-hidden">
      {/* Gotas de tinta flutuando, nas cores que já usam nos avisos do site */}
      <div className="absolute left-[14%] top-[18%] h-8 w-8 rounded-full bg-amber-400/80 flutuar-1" />
      <div className="absolute right-[18%] top-[26%] h-5 w-5 rounded-full bg-red-400/80 flutuar-2" />
      <div className="absolute left-[22%] bottom-[22%] h-4 w-4 rounded-full bg-blue-400/80 flutuar-3" />
      <div className="absolute right-[14%] bottom-[16%] h-7 w-7 rounded-full bg-emerald-400/80 flutuar-4" />
      <div className="absolute right-[30%] top-[12%] h-3 w-3 rounded-full bg-neutral-900/20 flutuar-2 dark:bg-white/20" />

      {/* Carrinho, com o "brilho" de recém-pintado */}
      <svg
        viewBox="0 0 200 120"
        className="h-36 w-56 flutuar-1"
        style={{ animationDuration: "7s" }}
        aria-hidden
      >
        <ellipse cx="100" cy="102" rx="70" ry="7" fill="currentColor" className="text-neutral-900/10 dark:text-white/10" />
        <path
          d="M22 78 L34 46a10 10 0 0 1 9-6h20l14-18a10 10 0 0 1 8-4h30a10 10 0 0 1 8 4l14 18h16a10 10 0 0 1 9 6l12 32Z"
          fill="#f59e0b"
          stroke="#78350f"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M70 40 L82 22a6 6 0 0 1 5-2.5h26a6 6 0 0 1 5 2.5l12 18Z"
          fill="#fde68a"
          fillOpacity="0.55"
        />
        <rect x="22" y="78" width="156" height="16" rx="8" fill="#78350f" fillOpacity="0.25" />
        <circle cx="58" cy="96" r="14" fill="#292524" />
        <circle cx="58" cy="96" r="5" fill="#a8a29e" />
        <circle cx="142" cy="96" r="14" fill="#292524" />
        <circle cx="142" cy="96" r="5" fill="#a8a29e" />
      </svg>
    </div>
  );
}
