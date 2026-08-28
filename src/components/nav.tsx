"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}[] = [
  { href: "/", label: "Início", exact: true, icon: "inicio" },
  { href: "/estoque", label: "Estoque", icon: "estoque" },
  { href: "/comprar", label: "Comprar", icon: "comprar" },
  { href: "/carros", label: "Carros", icon: "carros" },
  { href: "/contagem", label: "Contagem", icon: "contagem" },
  { href: "/servicos", label: "Serviços", icon: "servicos" },
  { href: "/relatorios", label: "Relatórios", icon: "relatorios" },
  { href: "/historico", label: "Histórico", icon: "historico" },
  { href: "/perfis", label: "Perfis", icon: "perfis" },
];

/**
 * Ícones simples (linha única, sem biblioteca externa) — só pra dar uma
 * âncora visual rápida no menu. Antes era só texto corrido, o que obriga
 * a ler palavra por palavra pra achar a tela certa.
 */
function Icone({ nome, className }: { nome: string; className?: string }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (nome) {
    case "inicio":
      return (
        <svg {...props}>
          <path d="M3 9.5 12 3l9 6.5" />
          <path d="M5.5 8.5V20a1 1 0 0 0 1 1H9v-6h6v6h2.5a1 1 0 0 0 1-1V8.5" />
        </svg>
      );
    case "estoque":
      return (
        <svg {...props}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "comprar":
      return (
        <svg {...props}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M1.5 2h2.5l2.7 13.4a2 2 0 0 0 2 1.6h9a2 2 0 0 0 2-1.6L22 7H5.5" />
        </svg>
      );
    case "carros":
      return (
        <svg {...props}>
          <path d="M5 11 6.3 6.9A2 2 0 0 1 8.2 5.5h7.6a2 2 0 0 1 1.9 1.4L19 11" />
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <circle cx="7.5" cy="17.5" r="1.3" />
          <circle cx="16.5" cy="17.5" r="1.3" />
        </svg>
      );
    case "contagem":
      return (
        <svg {...props}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
          <path d="M9 13l2 2 4-4" />
        </svg>
      );
    case "servicos":
      return (
        <svg {...props}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2.6 18.4l3 3L12.3 14.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2Z" />
        </svg>
      );
    case "relatorios":
      return (
        <svg {...props}>
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="12" y1="20" x2="12" y2="8" />
          <line x1="18" y1="20" x2="18" y2="4" />
        </svg>
      );
    case "admin":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M4.5 20.2c1.1-3.3 4-5.2 7.5-5.2s6.4 1.9 7.5 5.2" />
        </svg>
      );
    case "historico":
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 2.6-6.3" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3.5 3.5" />
        </svg>
      );
    case "perfis":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c0.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
          <circle cx="17" cy="7.5" r="2.3" />
          <path d="M16 14.5c2.3 0.4 4 2 4.5 4.5" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Menu principal. `orientation="vertical"` é a barra lateral fixa (telas
 * maiores); `orientation="horizontal"` é a barra de cima, usada só no
 * celular, onde uma lateral fixa tomaria espaço demais da tela.
 */
export function Nav({
  alertas,
  orientation = "horizontal",
  mostrarAdmin = false,
}: {
  alertas: number;
  orientation?: "horizontal" | "vertical";
  mostrarAdmin?: boolean;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";
  const todosLinks = mostrarAdmin
    ? [...links, { href: "/admin", label: "Usuários", icon: "admin" }]
    : links;

  return (
    <nav className={vertical ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto"}>
      {todosLinks.map((link) => {
        const ativo = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              vertical ? "justify-between" : "gap-1.5"
            } ${
              ativo
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Icone nome={link.icon} className="h-4 w-4 shrink-0" />
              {link.label}
            </span>
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
