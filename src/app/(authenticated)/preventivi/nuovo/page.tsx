"use client";

import { useSession } from "next-auth/react";
import { QuoteEditor } from "@/components/QuoteEditor";

export default function NuovoPreventivoPage() {
  const { status } = useSession();
  if (status === "loading") {
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
          <span className="text-sm">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-4xl mb-1">Nuovo preventivo</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Componi l&apos;offerta, salva la bozza e invia al cliente quando pronto.
        </p>
      </div>
      <QuoteEditor />
    </div>
  );
}
