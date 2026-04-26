"use client";

import { useEffect, useState } from "react";

/**
 * Barra fissa in basso (solo in dev): indica la directory da cui `next dev` ha avviato il processo.
 */
export function DevCwdBar() {
  const [cwd, setCwd] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    fetch("/api/dev/cwd")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ok && d?.cwd) setCwd(String(d.cwd));
      })
      .catch(() => {
        if (ok) setCwd(null);
      });
    return () => {
      ok = false;
    };
  }, []);

  if (!cwd) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-3 py-1.5 text-[11px] font-mono"
      style={{
        background: "var(--mc-bg-elevated, #1a1a1a)",
        color: "var(--mc-text-muted, #a3a3a3)",
        borderTop: "1px solid var(--mc-border, #333)",
        pointerEvents: "none",
      }}
      title="Server Next.js avviato da questa cartella (dev only)"
    >
      <span style={{ color: "var(--mc-accent, #f97316)" }}>dev</span> — working dir: {cwd}
    </div>
  );
}
