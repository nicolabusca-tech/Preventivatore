"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type RoiConfigRow = {
  id: string;
  defaultPreventiviMese: number;
  defaultImportoMedio: number;
  defaultConversione: number;
  defaultMargine: number;
};

type ProductRoi = {
  id: string;
  code: string;
  name: string;
  block: string;
  price: number;
  isMonthly: boolean;
  active: boolean;
  diagnosiPeso: number;
};

export default function AdminRoiSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<RoiConfigRow | null>(null);
  const [products, setProducts] = useState<ProductRoi[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function load() {
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      fetch("/api/admin/roi-settings"),
      fetch("/api/admin/products-roi"),
    ]);
    const c = cRes.ok ? await cRes.json() : null;
    const p = pRes.ok ? await pRes.json() : [];
    setConfig(c);
    setProducts(Array.isArray(p) ? p : []);
    const e: Record<string, number> = {};
    for (const pr of Array.isArray(p) ? p : []) {
      e[pr.id] = pr.diagnosiPeso ?? 0;
    }
    setEdits(e);
    setLoading(false);
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/roi-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultPreventiviMese: config.defaultPreventiviMese,
        defaultImportoMedio: config.defaultImportoMedio,
        defaultConversione: config.defaultConversione,
        defaultMargine: config.defaultMargine,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const row = await res.json();
      setConfig(row);
      setMessage({ type: "success", text: "Default numeri cliente salvati." });
    } else {
      setMessage({ type: "danger", text: "Errore nel salvataggio." });
    }
  }

  async function saveProducts() {
    setSaving(true);
    setMessage(null);
    const updates = products.map((pr) => ({
      id: pr.id,
      diagnosiPeso: edits[pr.id] ?? pr.diagnosiPeso ?? 0,
    }));
    const res = await fetch("/api/admin/products-roi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Pesi diagnosi listino aggiornati." });
      await load();
    } else {
      setMessage({ type: "danger", text: "Errore nel salvataggio listino." });
    }
  }

  if (loading || !config) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
        <span className="text-sm">Caricamento…</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl mb-2">Impostazioni ROI</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Default per i &quot;numeri del cliente&quot; su nuovo preventivo e pesi diagnosi (0–100%)
          sulle voci listino. I valori congelati sui preventivi già creati restano invariati.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === "success" ? "alert alert-success" : "alert alert-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="card p-5 sm:p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Default &quot;numeri del cliente&quot;</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Preventivi al mese</label>
            <input
              type="number"
              className="input"
              min={0}
              step={0.1}
              value={config.defaultPreventiviMese}
              onChange={(e) =>
                setConfig({ ...config, defaultPreventiviMese: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label">Importo medio commessa (€)</label>
            <input
              type="number"
              className="input"
              min={0}
              value={config.defaultImportoMedio}
              onChange={(e) =>
                setConfig({ ...config, defaultImportoMedio: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label">Conversione attuale (%)</label>
            <input
              type="number"
              className="input"
              min={0}
              max={100}
              value={config.defaultConversione}
              onChange={(e) =>
                setConfig({ ...config, defaultConversione: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label">Margine in commessa (%)</label>
            <input
              type="number"
              className="input"
              min={0}
              max={100}
              value={config.defaultMargine}
              onChange={(e) =>
                setConfig({ ...config, defaultMargine: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveConfig}
          disabled={saving}
          className="btn-primary mt-4"
        >
          {saving ? "Salvataggio…" : "Salva default"}
        </button>
      </div>

      <div className="card p-5 sm:p-6 overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Listino — peso diagnosi %</h2>
          <button
            type="button"
            onClick={saveProducts}
            disabled={saving}
            className="btn-primary shrink-0"
          >
            {saving ? "Salvataggio…" : "Salva listino"}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--mc-border)" }}>
              <th className="text-left py-2 pr-2">Codice</th>
              <th className="text-left py-2 pr-2">Nome</th>
              <th className="text-left py-2 pr-2">Blocco</th>
              <th className="text-right py-2 pr-2">Prezzo</th>
              <th className="text-right py-2 w-32">Diagnosi %</th>
            </tr>
          </thead>
          <tbody>
            {products.map((pr) => (
              <tr key={pr.id} style={{ borderBottom: "1px solid var(--mc-border)" }}>
                <td className="py-2 pr-2 font-mono text-xs">{pr.code}</td>
                <td className="py-2 pr-2 max-w-[200px] truncate">{pr.name}</td>
                <td className="py-2 pr-2 text-xs" style={{ color: "var(--mc-text-muted)" }}>
                  {pr.block}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {pr.isMonthly ? `${pr.price} €/m` : `${pr.price} €`}
                </td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    className="input py-1 text-right"
                    min={0}
                    max={100}
                    value={edits[pr.id] ?? 0}
                    onChange={(e) =>
                      setEdits((m) => ({
                        ...m,
                        [pr.id]: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
