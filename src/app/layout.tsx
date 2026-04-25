import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Preventivatore Metodo Cantiere",
  description: "Strumento interno per la composizione di preventivi Metodo Cantiere",
};

/**
 * Script no-flash: legge la preferenza tema da localStorage (o cade
 * sulla preferenza di sistema) e la applica PRIMA che React idrati.
 * Senza questo script si vedrebbe un flash del tema light quando l'utente
 * ha scelto dark.
 */
const themeNoFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('mc-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
