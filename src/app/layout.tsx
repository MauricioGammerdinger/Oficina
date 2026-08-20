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
// tela clara e depois escura. Roda antes de qualquer coisa do React.
const scriptTema = `
  try {
    var tema = localStorage.getItem("tema");
    var escuro = tema ? tema === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches;
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
