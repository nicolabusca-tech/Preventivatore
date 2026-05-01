"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import PaymentsDrawer from "@/components/PaymentsDrawer";
import {
  FASE_OPTIONS,
  type FaseValue,
  deriveFase as deriveFaseShared,
  fasePatch as fasePatchShared,
} from "@/lib/fase";
import type { AnalyticsQuote, AnalyticsResponse } from "@/lib/types/analytics";
import type { DrawerPayment, DrawerQuote } from "@/lib/types/payments-drawer";

function deriveFase(q: AnalyticsQuote): FaseValue {
  return deriveFaseShared(q);
}

function fasePatch(value: FaseValue, currentWonAt: string | null): Record<string, unknown> {
  return fasePatchShared(value, currentWonAt);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function toInputDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseInputDateToIso(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const [y, m, d] = t.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

function valoreContratto(q: AnalyticsQuote) {
  return (q.totalSetup || 0) + (q.effectiveRevenueAnnual || q.totalAnnual || 0);
}

function costoContratto(q: AnalyticsQuote) {
  return q.effectiveCostAnnual || q.costAnnual || 0;
}

export default function AnalisiPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"30d" | "90d" | "180d" | "365d">("180d");
  const [tableQuery, setTableQuery] = useState("");
  const [faseFilter, setFaseFilter] = useState<"all" | FaseValue>("all");
  const [busy, setBusy] = useState(false);
  const [drawerQuoteId, setDrawerQuoteId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?range=${range}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error || `Errore analytics (HTTP ${r.status})`);
        return body as AnalyticsResponse;
      })
      .then((payload) => {
        if (!alive) return;
        setData(payload);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Errore inatteso");
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  // Ricarica quando: la pagina torna in vista (focus/bfcache/visibility) oppure
  // un'altra pagina dell'app dichiara di aver modificato un preventivo.
  useEffect(() => {
    function maybeRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("pageshow", maybeRefresh);
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("mc:quote-updated", maybeRefresh as EventListener);
    return () => {
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("pageshow", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("mc:quote-updated", maybeRefresh as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const filteredQuotes = useMemo(() => {
    if (!data?.quotes) return [];
    const q = tableQuery.trim().toLowerCase();
    return data.quotes.filter((x) => {
      if (faseFilter !== "all" && deriveFase(x) !== faseFilter) return false;
      if (!q) return true;
      const hay = `${x.quoteNumber} ${x.clientName} ${x.clientCompany || ""} ${x.user?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, tableQuery, faseFilter]);

  const kpi = useMemo(() => {
    if (!data) return { acquired: 0, wonCount: 0, outstanding: 0, paid: 0 };
    const acquired = data.quotes
      .filter((x) => x.salesStage === "won")
      .reduce((s, x) => s + valoreContratto(x), 0);
    return {
      acquired,
      wonCount: data.summary.wonCount || 0,
      outstanding: data.cash?.outstanding || 0,
      paid: data.cash?.paid || 0,
    };
  }, [data]);

  async function refresh() {
    const res = await fetch(`/api/analytics?range=${range}`);
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || "Errore refresh");
    setData(body as AnalyticsResponse);
  }

  async function patchQuote(id: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore aggiornamento preventivo");
    }
    // Notifica altre pagine già montate (es. /preventivi cached) che il
    // preventivo è cambiato: si rifaranno il fetch quando torneranno in vista.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mc:quote-updated", { detail: { id } }));
    }
  }

  async function withBusy<T>(fn: () => Promise<T>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setBusy(false);
    }
  }

  const drawerQuote: DrawerQuote | null = useMemo(() => {
    if (!drawerQuoteId || !data) return null;
    const q = data.quotes.find((x) => x.id === drawerQuoteId);
    if (!q) return null;
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      clientName: q.clientName,
      clientCompany: q.clientCompany,
      totalSetup: q.totalSetup || 0,
      totalMonthly: q.totalMonthly || 0,
      totalAnnual: q.totalAnnual || 0,
      wonAt: q.wonAt,
      deliveryExpectedAt: q.deliveryExpectedAt,
      depositPercent: q.depositPercent ?? 30,
    };
  }, [drawerQuoteId, data]);

  const drawerPayments = useMemo<DrawerPayment[]>(() => {
    if (!drawerQuoteId || !data) return [];
    return data.payments
      .filter((p) => p.quoteId === drawerQuoteId)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        notes: p.notes,
        kind: p.kind,
      }));
  }, [drawerQuoteId, data]);

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
        <div className="inline-flex items-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm">Caricamento analisi…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: "var(--mc-danger)" }}>
          {error || "Dati non disponibili"}
        </p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Riprova
        </button>
      </div>
    );
  }

  const series = data.acquiredCumulative ?? [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl mb-1">Analisi</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Pipeline preventivi e gestione pagamenti.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            className="input-row w-[11rem] shrink-0"
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
          >
            <option value="30d">Ultimi 30 giorni</option>
            <option value="90d">Ultimi 90 giorni</option>
            <option value="180d">Ultimi 180 giorni</option>
            <option value="365d">Ultimi 365 giorni</option>
          </select>
          <button
            className="btn-ghost shrink-0"
            disabled={busy}
            onClick={() => withBusy(async () => {})}
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm" style={{ borderColor: "var(--mc-danger)", color: "var(--mc-danger)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card text-left">
          <div className="stat-label">Acquisito (1° anno)</div>
          <div className="stat-value">{formatEuro(kpi.acquired)}</div>
          <div className="stat-sub">{kpi.wonCount} preventivi acquisiti</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Da incassare</div>
          <div className="stat-value">{formatEuro(kpi.outstanding)}</div>
          <div className="stat-sub">Rate aperte</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Incassato</div>
          <div className="stat-value">{formatEuro(kpi.paid)}</div>
          <div className="stat-sub">Pagamenti segnati</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Preventivi nel periodo</div>
          <div className="stat-value">{data.summary.count || 0}</div>
          <div className="stat-sub">Totale generati</div>
        </div>
      </div>

      {series.length > 0 && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="font-semibold">Acquisito cumulativo</div>
              <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                Sommatoria progressiva del valore (setup + 1° anno) dei preventivi acquisiti, per mese di acquisizione.
              </div>
            </div>
            <div className="tabular-nums font-semibold" style={{ color: "var(--mc-accent)" }}>
              {formatEuro(series[series.length - 1]?.cumulative || 0)}
            </div>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" opacity={0.6} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--mc-text-secondary)" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--mc-text-secondary)"
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatEuro(Number(value ?? 0)),
                    String(name ?? ""),
                  ]}
                  labelStyle={{ color: "var(--mc-text-secondary)" }}
                  contentStyle={{
                    background: "var(--mc-bg-elevated)",
                    border: "1px solid var(--mc-border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Acquisito cumulativo"
                  stroke="var(--mc-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0 lg:max-w-md">
              <div className="font-semibold">Preventivi</div>
              <div className="text-xs mt-0.5 leading-snug" style={{ color: "var(--mc-text-muted)" }}>
                Fase, valore, costo e date in tabella; clicca «Pagamenti» per gestire date, acconto e rate.
              </div>
            </div>
            <div className="flex flex-row flex-nowrap items-center gap-2 min-w-0 flex-1 lg:justify-end overflow-x-auto pb-0.5">
              <input
                type="search"
                className="input-row flex-1 min-w-[12rem] max-w-xl basis-[min(100%,24rem)]"
                value={tableQuery}
                onChange={(e) => setTableQuery(e.target.value)}
                placeholder="Cerca numero / cliente / commerciale…"
                autoComplete="off"
                aria-label="Cerca in tabella"
              />
              <select
                className="input-row w-[14rem] shrink-0"
                value={faseFilter}
                onChange={(e) => setFaseFilter(e.target.value as any)}
                title="Filtro fase"
              >
                <option value="all">Fase: tutte</option>
                {FASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          className="analisi-table-scroll-host overflow-x-auto md:overflow-y-auto md:max-h-[min(72vh,calc(100dvh-260px))] overscroll-y-contain"
          role="region"
          aria-label="Elenco preventivi, scorrevole"
        >
          <table className="mc-table mc-table-sticky-head">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Cliente</th>
                <th>Fase</th>
                <th className="text-right">Valore</th>
                <th className="text-right">Costo</th>
                <th>Data inizio</th>
                <th>Data fine</th>
                <th className="text-right">Pagamenti</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                    Nessun risultato con i filtri attuali.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const fase = deriveFase(q);
                  const opt = FASE_OPTIONS.find((o) => o.value === fase)!;
                  const valore = valoreContratto(q);
                  const costo = costoContratto(q);
                  const paymentsCount = data.payments.filter((p) => p.quoteId === q.id).length;
                  const openCount = data.payments.filter((p) => p.quoteId === q.id && !p.paidAt).length;
                  return (
                    <tr key={q.id} data-quote-row={q.id}>
                      <td className="font-mono text-xs">
                        <a
                          href={`/preventivi/${q.id}`}
                          className="hover:underline"
                          style={{ color: "var(--mc-accent)" }}
                        >
                          {q.quoteNumber}
                        </a>
                      </td>
                      <td>
                        <div className="font-semibold text-sm leading-tight">{q.clientName}</div>
                        {q.clientCompany && (
                          <div className="text-[11px] leading-tight" style={{ color: "var(--mc-text-muted)" }}>
                            {q.clientCompany}
                          </div>
                        )}
                        {(q.totalMonthly ?? 0) > 0 && (
                          <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: "var(--mc-text-muted)" }}>
                            Canone {formatEuro(q.totalMonthly || 0)}/mese
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          className="input-row text-xs w-[12.5rem]"
                          value={fase}
                          disabled={busy}
                          onChange={(e) =>
                            withBusy(async () =>
                              patchQuote(q.id, fasePatch(e.target.value as FaseValue, q.wonAt))
                            )
                          }
                          style={{
                            color:
                              opt.tone === "success"
                                ? "var(--mc-success)"
                                : opt.tone === "danger"
                                  ? "var(--mc-danger)"
                                  : opt.tone === "accent"
                                    ? "var(--mc-accent)"
                                    : undefined,
                          }}
                        >
                          {FASE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right tabular-nums text-sm font-semibold">{formatEuro(valore)}</td>
                      <td className="text-right tabular-nums text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {formatEuro(costo)}
                      </td>
                      <td className="whitespace-nowrap">
                        <input
                          type="date"
                          className="input-row text-xs w-[9.5rem]"
                          defaultValue={toInputDate(q.wonAt)}
                          key={`${q.id}-won-${q.wonAt || "empty"}`}
                          disabled={busy}
                          title="Data acquisizione"
                          onBlur={(e) => {
                            const next = parseInputDateToIso(e.target.value);
                            if ((q.wonAt || null) === next) return;
                            withBusy(async () => patchQuote(q.id, { wonAt: next }));
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap">
                        <input
                          type="date"
                          className="input-row text-xs w-[9.5rem]"
                          defaultValue={toInputDate(q.deliveryExpectedAt)}
                          key={`${q.id}-del-${q.deliveryExpectedAt || "empty"}`}
                          disabled={busy}
                          title="Data fine progetto / consegna"
                          onBlur={(e) => {
                            const next = parseInputDateToIso(e.target.value);
                            if ((q.deliveryExpectedAt || null) === next) return;
                            withBusy(async () => patchQuote(q.id, { deliveryExpectedAt: next }));
                          }}
                        />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="btn-secondary text-xs px-3 py-1"
                          onClick={() => setDrawerQuoteId(q.id)}
                          disabled={busy}
                        >
                          {paymentsCount === 0 ? "Imposta" : `Gestisci · ${openCount}/${paymentsCount}`}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentsDrawer
        open={!!drawerQuoteId}
        onClose={() => setDrawerQuoteId(null)}
        quote={drawerQuote}
        payments={drawerPayments}
        onChanged={async () => {
          try {
            await refresh();
          } catch {
            /* gestito a livello drawer */
          }
        }}
      />
    </div>
  );
}
