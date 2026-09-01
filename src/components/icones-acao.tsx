/**
 * Ícones pequenos (16px) pra dar identidade visual às ações secundárias em
 * forma de link (arquivar, remover, trocar de perfil, sair...), que antes
 * eram só texto sublinhado. Mesmo estilo de traço do menu principal
 * (nav.tsx), só que num arquivo à parte porque esses aparecem em botões
 * espalhados pelo app, não só no menu.
 */

type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconeLixo({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconeTrocar({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M17 2.5 21 6l-4 3.5" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 21.5 3 18l4-3.5" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function IconeSair({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconeSeta({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
