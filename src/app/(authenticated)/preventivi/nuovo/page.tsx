"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { QuoteEditor } from "@/components/QuoteEditor";

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
      <div className="inline-flex items-center gap-2">
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

// Quando si clicca "Nuovo preventivo" con il QuoteEditor già montato (stesso URL,
// oppure router-cache di Next che ripristina la pagina precedente), lo stato del form
// non si azzera. Per garantire un reset affidabile leggiamo un token "?n=" dalla URL e
// lo usiamo come `key` del QuoteEditor: ad ogni nuovo click il token cambia e React
// rimonta il componente, riportando totali, voci e sconti allo stato iniziale.
function NuovoPreventivoEditor() {
  const searchParams = useSearchParams();
  const sessionKey = searchParams?.get("n") ?? "default";
  return <QuoteEditor key={sessionKey} />;
}

export default function NuovoPreventivoPage() {
  const { status } = useSession();
  if (status === "loading") {
    return <LoadingBlock label="Caricamento..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-4xl mb-1">Nuovo preventivo</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Componi l&apos;offerta, salva la bozza e invia al cliente quando pronto.
        </p>
      </div>
      <Suspense fallback={<LoadingBlock label="Preparazione editor..." />}>
        <NuovoPreventivoEditor />
      </Suspense>
    </div>
  );
}
