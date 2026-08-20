"use client";

import { useState } from "react";

/**
 * Alterna entre claro e escuro, guardando a escolha no localStorage —
 * assim ela lembra na próxima visita, sem precisar de conta nem servidor.
 * A classe "dark" já vem certa antes da página pintar (ver script inline
 * no layout raiz). O estado inicial já lê essa classe direto (sem efeito,
 * pra não disparar um segundo render à toa); o texto só pode divergir do
 * servidor nesse primeiro instante, por isso o suppressHydrationWarning.
 */
export function AlternarTema() {
  const [escuro, setEscuro] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  function alternar() {
    const ligar = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", ligar);
    localStorage.setItem("tema", ligar ? "escuro" : "claro");
    setEscuro(ligar);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      suppressHydrationWarning
      className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      title={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {escuro ? "☀ Modo claro" : "☾ Modo escuro"}
    </button>
  );
}
