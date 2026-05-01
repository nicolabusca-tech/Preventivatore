"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import CashflowCharts, { type CashflowMonthPoint } from "@/components/CashflowCharts";

type AnalyticsQuote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  createdAt: string;
  user: { name: string };
  totalAnnual: number;
  totalSetup: number;
  totalMonthly: number;
  costAnnual: number;
  marginAnnual: number;
  marginPercentAnnual: number;
  effectiveRevenueAnnual: number;
  effectiveCostAnnual: number;
  effectiveMarginAnnual: number;
  effectiveMarginPercentAnnual: number;
  adjustmentsAnnualRevenue: number;
  adjustmentsAnnualCost: number;
  salesStage: string;
  deliveryStage: string;
  wonAt: string | null;
  kickoffAt: string | null;
  closedAt: string | null;
  deliveryExpectedAt: string | null;
  depositPercent?: number;
};

type AnalyticsPayment = {
  id: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  notes: string | null;
  kind: string | null;
  userName: string;
};

type AnalyticsResponse = {
  summary: {
    count: number;
    wonCount: number;
    lostCount: number;
    revenueAnnual: number;
    costAnnual: number;
    marginAnnual: number;
  };
  pipeline: Record<string, number>;
  quotes: AnalyticsQuote[];
  payments: AnalyticsPayment[];
  cash: { paid: number; outstanding: number };
  cashflowSeries?: CashflowMonthPoint[];
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
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

export default function AnalisiPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"30d" | "90d" | "180d" | "365d">("180d");
  const [tableQuery, setTableQuery] = useState("");
  const [salesFilter, setSalesFilter] = useState<"all" | "open" | "won" | "lost">("all");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "not_started" | "in_progress" | "done">("all");
  const [rowLimit, setRowLimit] = useState<40 | 100 | 200 | "all">(100);
  const [busy, setBusy] = useState(false);
  const [addingForQuoteId, setAddingForQuoteId] = useState<string | null>(null);
  const [adjLabel, setAdjLabel] = useState("");
  const [adjKind, setAdjKind] = useState<"revenue" | "cost">("revenue");
  const [adjFrequency, setAdjFrequency] = useState<"ONE_TIME" | "MONTH" | "YEAR">("ONE_TIME");
  const [adjAmountEuro, setAdjAmountEuro] = useState<string>("");
  const [adjNotes, setAdjNotes] = useState("");
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

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
        setData({ ...payload, cashflowSeries: payload.cashflowSeries ?? [] });
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

  const marginPctTotal = useMemo(() => {
    if (!data) return 0;
    const rev = data.summary.revenueAnnual || 0;
    const m = data.summary.marginAnnual || 0;
    return rev > 0 ? (m / rev) * 100 : 0;
  }, [data]);

  const filteredQuotes = useMemo(() => {
    if (!data?.quotes) return [];
    const q = tableQuery.trim().toLowerCase();
    const base = data.quotes.filter((x) => {
      if (salesFilter !== "all" && (x.salesStage || "open") !== salesFilter) return false;
      if (deliveryFilter !== "all" && (x.deliveryStage || "not_started") !== deliveryFilter) return false;
      if (!q) return true;
      const hay = `${x.quoteNumber} ${x.clientName} ${x.clientCompany || ""} ${x.user?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
    if (rowLimit === "all") return base;
    return base.slice(0, rowLimit);
  }, [data, tableQuery, salesFilter, deliveryFilter, rowLimit]);

  const unpaidPayments = useMemo(() => {
    if (!data?.payments) return [];
    return data.payments.filter((p) => !p.paidAt);
  }, [data]);

  async function patchQuote(id: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore aggiornamento preventivo");
    }
  }

  async function markPaid(p: AnalyticsPayment) {
    setError(null);
    const res = await fetch(`/api/quotes/${p.quoteId}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: p.id, paidAt: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("Errore aggiornamento pagamento");
  }

  async function refresh() {
    setError(null);
    const res = await fetch(`/api/analytics?range=${range}`);
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || "Errore refresh");
    setData({ ...(body as AnalyticsResponse), cashflowSeries: (body as AnalyticsResponse).cashflowSeries ?? [] });
  }

  async function generatePaymentPlan(quoteId: string) {
    const row = document.querySelector(`tr[data-quote-row="${quoteId}"]`);
    const acq = (row?.querySelector(`input[name="acquisition-${quoteId}"]`) as HTMLInputElement | null)?.value?.trim() || "";
    const del = (row?.querySelector(`input[name="delivery-${quoteId}"]`) as HTMLInputElement | null)?.value?.trim() || "";
    const depRaw = (row?.querySelector(`input[name="deposit-${quoteId}"]`) as HTMLInputElement | null)?.value;
    const depositPercent = Number(depRaw);
    const dep = Number.isFinite(depositPercent) ? Math.min(100, Math.max(0, Math.round(depositPercent))) : 30;

    const q = data?.quotes.find((x) => x.id === quoteId);
    const monthly = q?.totalMonthly ?? 0;
    if (monthly > 0 && !del) {
      throw new Error("Imposta la data di consegna prevista prima di generare le mensilità.");
    }

    const paymentCount = data?.payments.filter((p) => p.quoteId === quoteId).length ?? 0;
    if (paymentCount > 0) {
      const ok = window.confirm(
        "Esistono già rate per questo preventivo. Vuoi cancellarle e rigenerare il piano completo?"
      );
      if (!ok) return;
    }

    const res = await fetch(`/api/quotes/${quoteId}/payments/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acquisitionDate: acq || undefined,
        deliveryExpectedAt: del || undefined,
        depositPercent: dep,
        replaceExisting: true,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || "Errore generazione piano pagamenti");
  }

  async function addAdjustment(quoteId: string) {
    setError(null);
    const parsed = Number(String(adjAmountEuro).replace(",", "."));
    const amount = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    const res = await fetch(`/api/quotes/${quoteId}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: adjLabel,
        kind: adjKind,
        frequency: adjFrequency,
        amount,
        notes: adjNotes || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore inserimento riga extra");
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
        <div className="inline-flex items-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm">Caricamento analisi...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: "var(--mc-danger, #b91c1c)" }}>
          {error || "Dati non disponibili"}
        </p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Riprova
        </button>
      </div>
    );
  }

  const stageLabel = (s: string) => {
    if (s === "open") return "In trattativa";
    if (s === "won") return "Acquisito";
    if (s === "lost") return "Perso";
    return s;
  };

  const deliveryLabel = (s: string) => {
    if (s === "not_started") return "Da iniziare";
    if (s === "in_progress") return "In corso";
    if (s === "done") return "Completato";
    return s;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-4xl mb-1">Analisi</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Margini, cassa prevista/incassata e piano pagamenti (interno).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input text-sm" value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="30d">Ultimi 30 giorni</option>
            <option value="90d">Ultimi 90 giorni</option>
            <option value="180d">Ultimi 180 giorni</option>
            <option value="365d">Ultimi 365 giorni</option>
          </select>
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={async () => {
              try {
                setBusy(true);
                await refresh();
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Errore inatteso");
              } finally {
                setBusy(false);
              }
            }}
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm" style={{ borderColor: "var(--mc-danger, #b91c1c)", color: "var(--mc-danger, #b91c1c)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="stat-card text-left">
          <div className="stat-label">Venduto (1° anno)</div>
          <div className="stat-value">{formatEuro(data.summary.revenueAnnual)}</div>
          <div className="stat-sub">{data.summary.count} preventivi</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Margine (1° anno)</div>
          <div className="stat-value">{formatEuro(data.summary.marginAnnual)}</div>
          <div className="stat-sub">{formatPct(marginPctTotal)}</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Acquisiti</div>
          <div className="stat-value">{data.pipeline.won || 0}</div>
          <div className="stat-sub">Won</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Cash incassato</div>
          <div className="stat-value">{formatEuro(data.cash.paid)}</div>
          <div className="stat-sub">Pagamenti segnati</div>
        </div>
        <div className="stat-card text-left">
          <div className="stat-label">Da incassare</div>
          <div className="stat-value">{formatEuro(data.cash.outstanding)}</div>
          <div className="stat-sub">{unpaidPayments.length} rate aperte</div>
        </div>
      </div>

      {(data.cashflowSeries ?? []).length > 0 && (
        <div className="card p-5 overflow-hidden">
          <CashflowCharts series={data.cashflowSeries ?? []} />
        </div>
      )}

      <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="font-semibold">Preventivi</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--mc-text-muted)" }}>
                  Date acquisizione/consegna, acconto sul setup e generazione rate (mensilità dal mese dopo la consegna prevista).
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="input text-sm"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Cerca numero / cliente / azienda / commerciale…"
                />
                <select className="input text-sm" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value as any)} title="Filtro vendita">
                  <option value="all">Vendita: tutte</option>
                  <option value="open">Vendita: in trattativa</option>
                  <option value="won">Vendita: acquisito</option>
                  <option value="lost">Vendita: perso</option>
                </select>
                <select className="input text-sm" value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value as any)} title="Filtro delivery">
                  <option value="all">Delivery: tutte</option>
                  <option value="not_started">Delivery: da iniziare</option>
                  <option value="in_progress">Delivery: in corso</option>
                  <option value="done">Delivery: completato</option>
                </select>
                <select className="input text-sm" value={rowLimit} onChange={(e) => setRowLimit((e.target.value as any) === "all" ? "all" : Number(e.target.value) as any)} title="Righe tabella">
                  <option value={40}>40 righe</option>
                  <option value={100}>100 righe</option>
                  <option value={200}>200 righe</option>
                  <option value={"all" as any}>Tutte</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Cliente</th>
                  <th>Vendita</th>
                  <th>Delivery</th>
                  <th className="text-right">Ricavi 1° anno</th>
                  <th className="text-right">Margine</th>
                  <th className="text-right">Margine %</th>
                  <th className="text-right">Extra</th>
                  <th>Acquisizione</th>
                  <th>Consegna prev.</th>
                  <th className="text-right">Acconto %</th>
                  <th>Kickoff</th>
                  <th className="w-24">Piano</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                      Nessun risultato con i filtri attuali.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <Fragment key={q.id}>
                      <tr data-quote-row={q.id}>
                        <td className="font-mono text-xs">
                          <a href={`/preventivi/${q.id}`} className="hover:underline" style={{ color: "var(--mc-accent)" }}>
                            {q.quoteNumber}
                          </a>
                        </td>
                        <td>
                          <div className="font-semibold text-sm">{q.clientName}</div>
                          {q.clientCompany && (
                            <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
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
                            className="input text-xs"
                            value={q.salesStage || "open"}
                            disabled={busy}
                            onChange={async (e) => {
                              const next = e.target.value;
                              try {
                                setBusy(true);
                                await patchQuote(q.id, {
                                  salesStage: next,
                                  wonAt: next === "won" ? new Date().toISOString() : null,
                                });
                                await refresh();
                              } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : "Errore inatteso");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            <option value="open">{stageLabel("open")}</option>
                            <option value="won">{stageLabel("won")}</option>
                            <option value="lost">{stageLabel("lost")}</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="input text-xs"
                            value={q.deliveryStage || "not_started"}
                            disabled={busy}
                            onChange={async (e) => {
                              try {
                                setBusy(true);
                                await patchQuote(q.id, { deliveryStage: e.target.value });
                                await refresh();
                              } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : "Errore inatteso");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            <option value="not_started">{deliveryLabel("not_started")}</option>
                            <option value="in_progress">{deliveryLabel("in_progress")}</option>
                            <option value="done">{deliveryLabel("done")}</option>
                          </select>
                        </td>
                        <td className="text-right tabular-nums text-sm">{formatEuro(q.effectiveRevenueAnnual || q.totalAnnual || 0)}</td>
                        <td
                          className="text-right tabular-nums text-sm"
                          title={formatPct(q.effectiveMarginPercentAnnual || q.marginPercentAnnual || 0)}
                        >
                          {q.effectiveMarginAnnual ? formatEuro(q.effectiveMarginAnnual) : "—"}
                        </td>
                        <td className="text-right tabular-nums text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                          {formatPct(q.effectiveMarginPercentAnnual || q.marginPercentAnnual || 0)}
                        </td>
                        <td className="text-right text-xs tabular-nums" style={{ color: "var(--mc-text-secondary)" }}>
                          {q.adjustmentsAnnualRevenue || q.adjustmentsAnnualCost ? (
                            <span title={`Ricavi extra: ${formatEuro(q.adjustmentsAnnualRevenue || 0)} · Costi extra: ${formatEuro(q.adjustmentsAnnualCost || 0)}`}>
                              {formatEuro((q.adjustmentsAnnualRevenue || 0) - (q.adjustmentsAnnualCost || 0))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="align-top whitespace-nowrap">
                          <input
                            type="date"
                            className="input text-xs min-w-[9rem]"
                            name={`acquisition-${q.id}`}
                            defaultValue={toInputDate(q.wonAt)}
                            key={`${q.id}-won-${q.wonAt || "empty"}`}
                            disabled={busy}
                            title="Data acquisizione (firma / dovrebbe pagare)"
                            onBlur={async (e) => {
                              try {
                                setBusy(true);
                                await patchQuote(q.id, { wonAt: parseInputDateToIso(e.target.value) });
                                await refresh();
                              } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : "Errore inatteso");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          />
                        </td>
                        <td className="align-top whitespace-nowrap">
                          <input
                            type="date"
                            className="input text-xs min-w-[9rem]"
                            name={`delivery-${q.id}`}
                            defaultValue={toInputDate(q.deliveryExpectedAt)}
                            key={`${q.id}-del-${q.deliveryExpectedAt || "empty"}`}
                            disabled={busy}
                            title="Fine progetto / go-live: le mensilità partono dal mese successivo"
                            onBlur={async (e) => {
                              try {
                                setBusy(true);
                                await patchQuote(q.id, { deliveryExpectedAt: parseInputDateToIso(e.target.value) });
                                await refresh();
                              } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : "Errore inatteso");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          />
                        </td>
                        <td className="align-top text-right">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="input text-xs w-[4.25rem] inline-block text-right tabular-nums"
                            name={`deposit-${q.id}`}
                            defaultValue={q.depositPercent ?? 30}
                            key={`${q.id}-dep-${q.depositPercent ?? 30}`}
                            disabled={busy}
                            title="Acconto sul solo setup (listino netto voucher/sconti)"
                            onBlur={async (e) => {
                              const v = Math.min(100, Math.max(0, Math.round(Number(e.target.value))));
                              try {
                                setBusy(true);
                                await patchQuote(q.id, { depositPercent: v });
                                await refresh();
                              } catch (err: unknown) {
                                setError(err instanceof Error ? err.message : "Errore inatteso");
                              } finally {
                                setBusy(false);
                              }
                            }}
                          />
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          {q.kickoffAt ? (
                            formatDate(q.kickoffAt)
                          ) : (
                            <button
                              className="btn-ghost text-xs px-2 py-1"
                              disabled={busy}
                              onClick={async () => {
                                try {
                                  setBusy(true);
                                  await patchQuote(q.id, { kickoffAt: new Date().toISOString(), deliveryStage: "in_progress" });
                                  await refresh();
                                } catch (err: unknown) {
                                  setError(err instanceof Error ? err.message : "Errore inatteso");
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Oggi
                            </button>
                          )}
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          <button
                            type="button"
                            className="btn-ghost text-xs px-2 py-1"
                            disabled={busy}
                            onClick={() => setExpandedQuoteId(expandedQuoteId === q.id ? null : q.id)}
                          >
                            {expandedQuoteId === q.id ? "Chiudi" : "Rate"}
                          </button>
                        </td>
                      </tr>
                      {expandedQuoteId === q.id && (
                        <tr className="bg-opacity-50" style={{ background: "var(--mc-bg-soft, rgba(0,0,0,0.03))" }}>
                          <td colSpan={13} className="p-4 align-top">
                            <div className="flex flex-wrap gap-3 items-center mb-4">
                              <button
                                type="button"
                                className="btn-secondary text-xs px-3 py-2"
                                disabled={busy}
                                onClick={async () => {
                                  try {
                                    setBusy(true);
                                    await generatePaymentPlan(q.id);
                                    await refresh();
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : "Errore inatteso");
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                Genera piano pagamenti
                              </button>
                              <span className="text-xs max-w-xl" style={{ color: "var(--mc-text-muted)" }}>
                                Acconto sul setup, anticipi annuali canoni alla data acquisizione, 12 mensilità da{" "}
                                <strong>mese dopo la consegna prevista</strong>.
                              </span>
                            </div>
                            <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--mc-border)" }}>
                              <table className="mc-table text-xs">
                                <thead>
                                  <tr>
                                    <th>Scadenza</th>
                                    <th className="text-right">Importo</th>
                                    <th>Stato</th>
                                    <th>Tipo</th>
                                    <th>Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const planPayments = [...(data.payments || [])]
                                      .filter((p) => p.quoteId === q.id)
                                      .sort((a, b) => {
                                        const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                                        const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                                        return ad - bd;
                                      });
                                    if (planPayments.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={5} style={{ color: "var(--mc-text-muted)" }}>
                                            Nessuna rata. Imposta date e premi «Genera piano pagamenti».
                                          </td>
                                        </tr>
                                      );
                                    }
                                    return planPayments.map((p) => (
                                      <tr key={p.id}>
                                        <td className="tabular-nums">{p.dueDate ? formatDate(p.dueDate) : "—"}</td>
                                        <td className="text-right font-semibold tabular-nums">{formatEuro(p.amount)}</td>
                                        <td>{p.paidAt ? `Pagato ${formatDate(p.paidAt)}` : "Aperto"}</td>
                                        <td className="font-mono text-[10px]">{p.kind || "—"}</td>
                                        <td style={{ color: "var(--mc-text-secondary)" }}>{p.notes || "—"}</td>
                                      </tr>
                                    ));
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4" style={{ borderTop: "1px solid var(--mc-border)" }}>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <div className="label">Aggiungi riga extra (ricavo/costo) a un preventivo</div>
                <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                  Serve per casi fuori standard. Entra solo in Analisi (non nel PDF del preventivatore).
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="input text-sm" value={addingForQuoteId || ""} onChange={(e) => setAddingForQuoteId(e.target.value || null)}>
                  <option value="">Seleziona preventivo…</option>
                  {data.quotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quoteNumber} — {q.clientName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 mt-3">
              <div className="sm:col-span-2">
                <div className="label">Descrizione</div>
                <input className="input" value={adjLabel} onChange={(e) => setAdjLabel(e.target.value)} placeholder="es. Extra fuori listino" />
              </div>
              <div>
                <div className="label">Tipo</div>
                <select className="input" value={adjKind} onChange={(e) => setAdjKind(e.target.value as any)}>
                  <option value="revenue">Ricavo</option>
                  <option value="cost">Costo</option>
                </select>
              </div>
              <div>
                <div className="label">Frequenza</div>
                <select className="input" value={adjFrequency} onChange={(e) => setAdjFrequency(e.target.value as any)}>
                  <option value="ONE_TIME">Una tantum</option>
                  <option value="MONTH">Mensile</option>
                  <option value="YEAR">Annuale</option>
                </select>
              </div>
              <div>
                <div className="label">Importo (€)</div>
                <input className="input" inputMode="decimal" value={adjAmountEuro} onChange={(e) => setAdjAmountEuro(e.target.value)} placeholder="es. 2500" />
              </div>
              <div className="sm:col-span-1 flex items-end justify-end gap-2">
                <button
                  className="btn-primary"
                  disabled={busy || !addingForQuoteId || !adjLabel.trim() || !adjAmountEuro.trim()}
                  onClick={async () => {
                    if (!addingForQuoteId) return;
                    try {
                      setBusy(true);
                      await addAdjustment(addingForQuoteId);
                      setAdjLabel("");
                      setAdjAmountEuro("");
                      setAdjNotes("");
                      await refresh();
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : "Errore inatteso");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Aggiungi
                </button>
              </div>
            </div>

            <div className="mt-2">
              <div className="label">Note (opzionale)</div>
              <input className="input" value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Note interne..." />
            </div>
          </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
          <div className="font-semibold">Pagamenti (rate aperte)</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--mc-text-muted)" }}>
            Mostra solo i pagamenti non incassati; puoi segnarli come pagati.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Preventivo</th>
                <th>Cliente</th>
                <th>Commerciale</th>
                <th>Scadenza</th>
                <th className="text-right">Importo</th>
                <th>Note</th>
                <th className="text-xs">Tipo</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {unpaidPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                    Nessun pagamento aperto.
                  </td>
                </tr>
              ) : (
                unpaidPayments
                  .slice()
                  .sort((a, b) => {
                    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    return ad - bd;
                  })
                  .slice(0, 50)
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">
                        <a href={`/preventivi/${p.quoteId}`} className="hover:underline" style={{ color: "var(--mc-accent)" }}>
                          {p.quoteNumber}
                        </a>
                      </td>
                      <td className="text-sm">{p.clientName}</td>
                      <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {p.userName}
                      </td>
                      <td className="text-sm">{p.dueDate ? formatDate(p.dueDate) : "—"}</td>
                      <td className="text-right font-semibold tabular-nums">{formatEuro(p.amount)}</td>
                      <td className="text-xs" style={{ color: "var(--mc-text-secondary)" }}>
                        {p.notes || "—"}
                      </td>
                      <td className="text-[10px] font-mono" style={{ color: "var(--mc-text-muted)" }}>
                        {p.kind || "—"}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn-secondary text-xs px-2 py-1"
                          disabled={busy}
                          onClick={async () => {
                            try {
                              setBusy(true);
                              await markPaid(p);
                              await refresh();
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : "Errore inatteso");
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Segna pagato
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

