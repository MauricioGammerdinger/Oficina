"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/estoque", label: "Estoque" },
  { href: "/comprar", label: "Comprar" },
  { href: "/carros", label: "Carros" },
  { href: "/contagem", label: "Contagem" },
  { href: "/servicos", label: "Serviços" },
  { href: "/relatorios", label: "Relatórios" },
];

export function Nav({ alertas }: { alertas: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const ativo =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
