"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início", exact: true },
  { href: "/estoque", label: "Estoque" },
  { href: "/comprar", label: "Comprar" },
  { href: "/carros", label: "Carros" },
  { href: "/contagem", label: "Contagem" },
  { href: "/servicos", label: "Serviços" },
  { href: "/relatorios", label: "Relatórios" },
];

/**
 * Menu principal. `orientation="vertical"` é a barra lateral fixa (telas
 * maiores); `orientation="horizontal"` é a barra de cima, usada só no
 * celular, onde uma lateral fixa tomaria espaço demais da tela.
 */
export function Nav({
  alertas,
  orientation = "horizontal",
}: {
  alertas: number;
  orientation?: "horizontal" | "vertical";
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav
      className={
        vertical
          ? "flex flex-col gap-1"
          : "flex gap-1 overflow-x-auto"
      }
    >
      {links.map((link) => {
        const ativo = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              vertical ? "flex items-center justify-between" : ""
            } ${
              ativo
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            {link.label}
            {link.href === "/comprar" && alertas > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  ativo
                    ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    : "bg-red-600 text-white"
                }`}
              >
                {alertas}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
