"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type RoiConfig = {
  id: string;
  defaultPreventiviMese: number;
  defaultImportoMedio: number;
  defaultConversione: number;
  defaultMargine: number;
  updatedAt?: string;
};

export default function AdminRoiSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [config, setConfig] = useState<RoiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const [defaultPreventiviMese, setDefaultPreventiviMese] = useState(4);
  const [defaultImportoMedio, setDefaultImportoMedio] = useState(5000);
  const [defaultConversione, setDefaultConversione] = useState(25);
  const [defaultMargine, setDefaultMargine] = useState(20);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function fetchConfig() {
    setLoading(true);
    const res = await fetch("/api/admin/roi-settings");
    const data = await res.json();
    const row = data as RoiConfig;
    setConfig(row);
    setDefaultPreventiviMese(Number(row?.defaultPreventiviMese ?? 4));
    setDefaultImportoMedio(Number(row?.defaultImportoMedio ?? 5000));
    setDefaultConversione(Number(row?.defaultConversione ?? 25));
    setDefaultMargine(Number(row?.defaultMargine ?? 20));
    setLoading(false);
  }

  const hasChanges = useMemo(() => {
    if (!config) return false;
    return (
      Number(config.defaultPreventiviMese) !== Number(defaultPreventiviMese) ||
      Number(config.defaultImportoMedio) !== Number(defaultImportoMedio) ||
      Number(config.defaultConversione) !== Number(defaultConversione) ||
      Number(config.defaultMargine) !== Number(defaultMargine)
    );
  }, [config, defaultConversione, defaultImportoMedio, defaultMargine, defaultPreventiviMese]);

  async function save() {
    setMessage(null);
    setSaving(true);
    const res = await fetch("/api/admin/roi-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultPreventiviMese,
        defaultImportoMedio,
        defaultConversione,
        defaultMargine,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = (await res.json()) as RoiConfig;
      setConfig(updated);
      setMessage({ type: "success", text: "Impostazioni salvate." });
      setTimeout(() => setMessage(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "danger", text: data?.error || "Errore nel salvataggio." });
    }
  }

  if (status === "loading" || loading) {
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
          <span className="text-sm">Caricamento ROI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-4xl mb-1">Impostazioni ROI</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Valori di default precompilati nella creazione preventivo.
          </p>
        </div>
        <button type="button" onClick={save} disabled={!hasChanges || saving} className="btn-primary">
          {saving ? "Salvataggio..." : "Salva"}
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"} mb-4 animate-fade-in`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <h2 className="text-2xl mb-4">Default diagnosi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Preventivi / mese</label>
            <input
              type="number"
              min={0}
              className="input"
              value={defaultPreventiviMese}
              onChange={(e) => setDefaultPreventiviMese(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Importo medio (€)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={defaultImportoMedio}
              onChange={(e) => setDefaultImportoMedio(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Conversione (%)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={defaultConversione}
              onChange={(e) => setDefaultConversione(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Margine commessa (%)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={defaultMargine}
              onChange={(e) => setDefaultMargine(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="mt-5 text-xs italic" style={{ color: "var(--mc-text-muted)" }}>
          Nota: i pesi “quota diagnosi” per singolo prodotto sono nel campo <code>diagnosiPeso</code> dei prodotti.
        </div>
      </div>
    </div>
  );
}
