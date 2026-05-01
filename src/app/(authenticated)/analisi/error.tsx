"use client";

import { useEffect } from "react";

export default function AnalisiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Analisi] client error:", error);
  }, [error]);

  return (
    <div className="py-12 max-w-2xl mx-auto text-center space-y-3">
      <h1 className="text-xl font-semibold">Si è verificato un errore in Analisi</h1>
      <pre
        className="text-xs text-left p-3 rounded-lg whitespace-pre-wrap break-words"
        style={{ background: "var(--mc-bg-inset)", border: "1px solid var(--mc-border)", color: "var(--mc-text-secondary)" }}
      >
        {error?.message || "Errore sconosciuto"}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>
      <div className="flex justify-center gap-2">
        <button className="btn-secondary" onClick={() => reset()}>
          Riprova
        </button>
        <button className="btn-ghost" onClick={() => window.location.reload()}>
          Ricarica pagina
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
        Se il messaggio non basta, apri la console del browser e copia lo stack qui.
      </p>
    </div>
  );
}
