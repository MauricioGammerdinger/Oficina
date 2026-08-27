"use client";

import { useState, useSyncExternalStore } from "react";

// A classe "dark" não muda sozinha (só o clique deste botão muda), então
// não tem nenhum evento externo pra assinar aqui.
const semInscricao = () => () => {};

/**
 * Alterna entre claro e escuro, guardando a escolha no localStorage —
 * assim ela lembra na próxima visita, sem precisar de conta nem servidor.
 * A classe "dark" já vem certa antes da página pintar (ver script inline
 * no layout raiz), então não tem "flash" de tela errada na cor de fundo.
 *
 * O texto do botão é outra história: o servidor não tem acesso ao
 * localStorage, então sempre manda "Modo escuro" no HTML, não importa o
 * tema real. O useSyncExternalStore abaixo existe exatamente pra esse
 * caso — ler algo só disponível no navegador sem dar warning de
 * hidratação, e corrigir automaticamente assim que monta no cliente (sem
 * precisar de um clique pra acertar o texto).
 */
export function AlternarTema() {
  const escuroNoDom = useSyncExternalStore(
    semInscricao,
    () => document.documentElement.classList.contains("dark"),
    () => false // valor no servidor: sempre "claro"
  );
  // Só existe pra dar feedback imediato no clique, sem esperar o próximo
  // render ler o DOM de novo. `null` = "confia no que leu do DOM".
  const [clicado, setClicado] = useState<boolean | null>(null);
  const escuro = clicado ?? escuroNoDom;

  function alternar() {
    const ligar = !escuro;
    document.documentElement.classList.toggle("dark", ligar);
    localStorage.setItem("tema", ligar ? "escuro" : "claro");
    setClicado(ligar);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      title={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {escuro ? "☀ Modo claro" : "☾ Modo escuro"}
    </button>
  );
}
