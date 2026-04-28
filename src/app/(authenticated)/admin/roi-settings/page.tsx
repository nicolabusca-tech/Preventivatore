"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const [config, setConfig] = useState<RoiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const [defaultPreventiviMese, setDefaultPreventiviMese] = useState(4);
  const [defaultImportoMedio, setDefaultImportoMedio] = useState(5000);
  const [defaultConversione, setDefaultConversione] = useState(25);
  const [defaultMargine, setDefaultMargine] = useState(20);

  const [products, setProducts] = useState<ProductRoi[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [baselineEdits, setBaselineEdits] = useState<Record<string, number>>({});
  const [productsError, setProductsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setProductsError(null);
    const [cRes, pRes] = await Promise.all([
      fetch("/api/admin/roi-settings", { cache: "no-store" }),
      fetch("/api/admin/products-roi", { cache: "no-store" }),
    ]);
    if (cRes.ok) {
      const data = (await cRes.json()) as RoiConfig;
      setConfig(data);
      setDefaultPreventiviMese(Number(data?.defaultPreventiviMese ?? 4));
      setDefaultImportoMedio(Number(data?.defaultImportoMedio ?? 5000));
      setDefaultConversione(Number(data?.defaultConversione ?? 25));
      setDefaultMargine(Number(data?.defaultMargine ?? 20));
    }
    if (pRes.ok) {
      const p = await pRes.json();
      const list = Array.isArray(p) ? (p as ProductRoi[]) : [];
      setProducts(list);
      const e: Record<string, number> = {};
      for (const pr of list) {
        e[pr.id] = pr.diagnosiPeso ?? 0;
      }
      setEdits(e);
      setBaselineEdits(e);
    } else {
      setProducts([]);
      setEdits({});
      setBaselineEdits({});
      let err = `Errore ${pRes.status}`;
      try {
        const j = (await pRes.json()) as { error?: string };
        if (j?.error) err = j.error;
      } catch {
        /* ignore */
      }
      setProductsError(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    void load();
  }, [session, status, router, load]);

  const hasConfigChanges = useMemo(() => {
    if (!config) return false;
    return (
      Number(config.defaultPreventiviMese) !== Number(defaultPreventiviMese) ||
      Number(config.defaultImportoMedio) !== Number(defaultImportoMedio) ||
      Number(config.defaultConversione) !== Number(defaultConversione) ||
      Number(config.defaultMargine) !== Number(defaultMargine)
    );
  }, [config, defaultConversione, defaultImportoMedio, defaultMargine, defaultPreventiviMese]);

  const hasProductChanges = useMemo(() => {
    for (const pr of products) {
      if ((edits[pr.id] ?? 0) !== (baselineEdits[pr.id] ?? 0)) return true;
    }
    return false;
  }, [products, edits, baselineEdits]);

  async function saveDefaults() {
    setMessage(null);
    setSavingDefaults(true);
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
    setSavingDefaults(false);
    if (res.ok) {
      const updated = (await res.json()) as RoiConfig;
      setConfig(updated);
      setMessage({ type: "success", text: "Default numeri cliente salvati." });
      setTimeout(() => setMessage(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "danger", text: data?.error || "Errore nel salvataggio." });
    }
  }

  async function saveProducts() {
    setMessage(null);
    setSavingProducts(true);
    const updates = products.map((pr) => ({
      id: pr.id,
      diagnosiPeso: edits[pr.id] ?? pr.diagnosiPeso ?? 0,
    }));
    const res = await fetch("/api/admin/products-roi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setSavingProducts(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Pesi per voce (quota diagnosi) aggiornati." });
      await load();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "danger", text: "Errore nel salvataggio listino." });
    }
  }

  if (status === "loading" || loading || !config) {
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
          <span className="text-sm">Caricamento ROI…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl sm:text-4xl mb-1">Impostazioni ROI</h1>
          <p className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
            <strong>Prima sezione:</strong> per ogni voce di listino definisci quanto quella competenza,{" "}
            <em>se messa in offerta</em>, pesa sul contributo al ROI lato cliente (stesso criterio di
            prima: più è alta la %, più quella voce rappresenta il &quot;miglioramento&quot; attribuito alla
            nostra proposta). <strong>Sotto</strong> restano i soli default dei numeri di partenza
            (preventivi/mese, importo, ecc.) precompilati in &quot;Nuovo preventivo&quot;. Snapshot dei
            preventivi già emessi invariato.
          </p>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"} mb-4 animate-fade-in`}>
          <span>{message.text}</span>
        </div>
      )}

      {productsError && (
        <div className="alert alert-danger mb-4 animate-fade-in">
          <span>
            <strong>Listino pesi non caricato.</strong> {productsError}
            {productsError === "Solo admin" && (
              <> Esci e rientra, oppure apri di nuovo la pagina.</>
            )}
          </span>
        </div>
      )}

      <div id="pesi-voci-listino" className="card p-5 sm:p-6 overflow-x-auto mb-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl mb-1">Voci listino — peso se selezionate in offerta</h2>
            <p className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
              0–100% sul prezzo della voce: quando il cliente ha quella riga in preventivo, questa % entra
              nel valore &quot;quota diagnosi&quot; (insieme al resto del calcolo ROI). Canoni: si usa
              l&apos;importo annuo (×12). Salva in fondo a questa card.
            </p>
          </div>
          <button
            type="button"
            onClick={saveProducts}
            disabled={!hasProductChanges || savingProducts || !!productsError}
            className="btn-primary shrink-0"
          >
            {savingProducts ? "Salvataggio…" : "Salva pesi voci"}
          </button>
        </div>
        {products.length === 0 && !productsError ? (
          <p className="text-sm py-4" style={{ color: "var(--mc-text-muted)" }}>
            Nessun prodotto in listino. Esegui il seed o aggiungi voci da Gestione listino.
          </p>
        ) : null}
        {products.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mc-border)" }}>
                <th className="text-left py-2 pr-2">Codice</th>
                <th className="text-left py-2 pr-2">Nome</th>
                <th className="text-left py-2 pr-2">Blocco</th>
                <th className="text-right py-2 pr-2">Prezzo</th>
                <th className="text-right py-2 w-44">Miglior. ROI %</th>
              </tr>
            </thead>
            <tbody>
              {products.map((pr) => (
                <tr
                  key={pr.id}
                  style={{
                    borderBottom: "1px solid var(--mc-border)",
                    opacity: pr.active ? 1 : 0.5,
                  }}
                >
                  <td className="py-2 pr-2 font-mono text-xs">{pr.code}</td>
                  <td className="py-2 pr-2 max-w-[220px] truncate" title={pr.name}>
                    {pr.name}
                  </td>
                  <td className="py-2 pr-2 text-xs" style={{ color: "var(--mc-text-muted)" }}>
                    {pr.block}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {pr.isMonthly ? `${pr.price} €/m` : `${pr.price} €`}
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      className="input py-1 text-right w-24"
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
        ) : null}
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl mb-1">Numeri di partenza del cliente (default)</h2>
            <p className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
              Precompilazione su &quot;Nuovo preventivo&quot; (non sostituisce i pesi per voce listino qui
              sopra).
            </p>
          </div>
          <button
            type="button"
            onClick={saveDefaults}
            disabled={!hasConfigChanges || savingDefaults}
            className="btn-primary shrink-0"
          >
            {savingDefaults ? "Salvataggio…" : "Salva default"}
          </button>
        </div>
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
      </div>
    </div>
  );
}
