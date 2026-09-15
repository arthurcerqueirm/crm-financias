import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minhas Finanças",
  description: "CRM pessoal de finanças — controle de gastos, receitas e patrimônio",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1017" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Aplica o tema salvo (claro/escuro) antes da primeira pintura da página —
// sem isto, o app sempre nasceria escuro por um instante e só trocaria para
// claro depois que o JavaScript da página hidratasse, um flash visível a
// cada carregamento para quem escolheu o tema claro. beforeInteractive
// injeta este script no HTML inicial e garante que ele roda antes de
// qualquer outro código da página.
const SCRIPT_TEMA = `
try {
  var t = localStorage.getItem('tema');
  if (t === 'claro') document.documentElement.setAttribute('data-theme', 'light');
  else if (t === 'escuro') document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <Script id="tema-inicial" strategy="beforeInteractive">
          {SCRIPT_TEMA}
        </Script>
        {children}
      </body>
    </html>
  );
}
