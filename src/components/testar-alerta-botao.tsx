"use client";

import { useState, useTransition } from "react";
import { testarAlertaAgora } from "@/app/actions";

/**
 * Dispara o e-mail de teste e mostra o resultado na hora, sem precisar
 * esperar a tarefa agendada do dia seguinte pra saber se ficou certo.
 */
export function TestarAlertaBotao() {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="botao-claro"
        disabled={pendente}
        onClick={() => {
          setMensagem(null);
          iniciar(async () => {
            const resultado = await testarAlertaAgora();
            setMensagem(
              resultado.enviado
                ? "E-mail de teste enviado — confira a caixa de entrada."
                : `Não enviou: ${resultado.motivo}`
            );
          });
        }}
      >
        {pendente ? "Enviando..." : "Testar agora"}
      </button>
      {mensagem && (
        <p className="text-sm text-neutral-600" role="status">
          {mensagem}
        </p>
      )}
    </div>
  );
}
