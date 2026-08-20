import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle da Oficina",
  description: "Estoque e checklist de carros",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a19",
};

// Aplica o tema salvo antes da página pintar, pra não dar aquele flash de
// tela escura e depois clara. Roda antes de qualquer coisa do React.
// Padrão é sempre claro — só fica escuro se ela mesma escolheu isso antes
// (não segue a preferência do celular/PC).
const scriptTema = `
  try {
    var escuro = localStorage.getItem("tema") === "escuro";
    document.documentElement.classList.toggle("dark", escuro);
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
