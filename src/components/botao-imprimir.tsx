"use client";

/**
 * Botão simples que aciona a impressão do navegador. Escondido no papel
 * (print:hidden é aplicado onde ele é usado) — só serve pra disparar.
 */
export function BotaoImprimir({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="botao-claro"
    >
      {children}
    </button>
  );
}
