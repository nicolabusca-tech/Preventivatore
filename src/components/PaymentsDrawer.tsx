"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { DrawerPayment, DrawerQuote } from "@/lib/types/payments-drawer";

export type { DrawerPayment, DrawerQuote } from "@/lib/types/payments-drawer";

type Props = {
  open: boolean;
  onClose: () => void;
  quote: DrawerQuote | null;
  payments: DrawerPayment[];
  onChanged: () => Promise<void> | void;
};

const KIND_LABELS: Record<string, string> = {
  SETUP_DEPOSIT: "Acconto setup",
  SETUP_RATA: "Rata setup",
  PREPAY_CRM: "Anticipo CRM",
  PREPAY_AIVOCALE: "Anticipo AI Vocale",
  PREPAY_WA: "Anticipo WhatsApp",
  MONTHLY_CANONE: "Mensilità canone",
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function groupOf(kind: string | null): "setup" | "prepay" | "monthly" | "other" {
  if (!kind) return "other";
  if (kind === "SETUP_DEPOSIT" || kind === "SETUP_RATA") return "setup";
  if (kind.startsWith("PREPAY_")) return "prepay";
  if (kind === "MONTHLY_CANONE") return "monthly";
  return "other";
}

export default function PaymentsDrawer({ open, onClose, quote, payments, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deposit, setDeposit] = useState<number>(30);

  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (!quote) return;
    setStartDate(toInputDate(quote.wonAt));
    setEndDate(toInputDate(quote.deliveryExpectedAt));
    setDeposit(quote.depositPercent ?? 30);
    setError(null);
    setNewAmount("");
    setNewDate(toInputDate(quote.wonAt));
    setNewNotes("");
  }, [quote?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const sortedByDate = [...payments].sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return ad - bd;
    });
    return {
      setup: sortedByDate.filter((p) => groupOf(p.kind) === "setup"),
      prepay: sortedByDate.filter((p) => groupOf(p.kind) === "prepay"),
      monthly: sortedByDate.filter((p) => groupOf(p.kind) === "monthly"),
      other: sortedByDate.filter((p) => groupOf(p.kind) === "other"),
    };
  }, [payments]);

  const totals = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    for (const p of payments) {
      if (p.paidAt) paid += p.amount || 0;
      else outstanding += p.amount || 0;
    }
    return { outstanding, paid };
  }, [payments]);

  // ========================================
  // Piano pagamenti personalizzato (custom)
  // Hooks tenuti SOPRA l'early return per rispettare Rules of Hooks.
  // ========================================
  const [customDepositMode, setCustomDepositMode] = useState<"amount" | "percent">("amount");
  const [customDepositAmount, setCustomDepositAmount] = useState<string>("");
  const [customDepositPercent, setCustomDepositPercent] = useState<string>("30");
  const [customDepositDate, setCustomDepositDate] = useState<string>(""); // ISO date
  const [customDepositMethod, setCustomDepositMethod] = useState<"bank" | "card">("bank");
  const [customNumInstallments, setCustomNumInstallments] = useState<string>("4");
  const [customFirstInstDate, setCustomFirstInstDate] = useState<string>(""); // ISO date

  // Memoria piano custom: ultimo piano custom applicato a un altro preventivo
  // dello stesso cliente. Caricato on open dal back-end. Dismissabile per non
  // riproporlo all'infinito se Cristina vuole partire da zero.
  type LastCustomerPlan = {
    found: true;
    sourceQuoteId: string;
    sourceQuoteNumber: string;
    sourceCreatedAt: string;
    sourceClientLabel: string | null;
    plan: {
      depositAmount: number;
      depositDate: string | null;
      depositMethod: string;
      numInstallments: number;
      firstInstallmentDate: string | null;
      dominantMethod: string | null;
    };
  };
  const [lastCustomerPlan, setLastCustomerPlan] = useState<LastCustomerPlan | null>(null);
  const [lastPlanDismissed, setLastPlanDismissed] = useState(false);

  // Default: acconto oggi, prima rata fra 1 mese
  useEffect(() => {
    if (!quote) return;
    const today = new Date();
    if (!customDepositDate) {
      setCustomDepositDate(today.toISOString().slice(0, 10));
    }
    if (!customFirstInstDate) {
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1, 12, 0, 0, 0);
      setCustomFirstInstDate(next.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  // Carica l'ultimo piano custom dello stesso cliente (se esiste). Lo
  // facciamo solo quando il drawer e' aperto, il quote esiste e non ci sono
  // gia' pagamenti generati: a piano gia' creato l'hint sarebbe rumore.
  useEffect(() => {
    if (!open || !quote) return;
    if (payments && payments.length > 0) return;
    let cancelled = false;
    setLastCustomerPlan(null);
    setLastPlanDismissed(false);
    (async () => {
      try {
        const res = await fetch(`/api/quotes/${quote.id}/payments/last-customer-plan`, {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && data.found === true) {
          setLastCustomerPlan(data as LastCustomerPlan);
        }
      } catch {
        // silenzioso: e' una funzione di comodita', non bloccante
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote?.id, payments?.length]);

  // Applica i parametri del piano precedente nei campi del builder custom.
  // Lavoriamo in modalita' "amount" perche' e' quello che abbiamo salvato
  // come importo concreto, non come percentuale.
  function applyLastCustomerPlan() {
    if (!lastCustomerPlan) return;
    const p = lastCustomerPlan.plan;
    setCustomDepositMode("amount");
    setCustomDepositAmount(String(p.depositAmount || 0));
    if (p.depositDate) setCustomDepositDate(p.depositDate);
    if (p.depositMethod === "card" || p.depositMethod === "bank") {
      setCustomDepositMethod(p.depositMethod);
    }
    setCustomNumInstallments(String(p.numInstallments || 0));
    if (p.firstInstallmentDate) setCustomFirstInstDate(p.firstInstallmentDate);
  }

  // Anteprima locale: usata SOLO per mostrare a video l'anteprima dell'acconto
  // e delle rate prima di chiamare l'API. Il calcolo finale avviene server-side.
  const customPreview = useMemo(() => {
    if (!quote) return null;
    const total = Math.max(0, Math.round(quote.totalOneTime || 0));
    const depositAmount = customDepositMode === "amount"
      ? Math.max(0, Math.min(total, Math.round(Number(customDepositAmount) || 0)))
      : Math.max(0, Math.min(total, Math.round((total * (Number(customDepositPercent) || 0)) / 100)));
    const remainder = Math.max(0, total - depositAmount);
    const n = Math.max(0, Math.min(60, Math.floor(Number(customNumInstallments) || 0)));
    const base = n > 0 ? Math.floor(remainder / n) : 0;
    const last = n > 0 ? remainder - base * (n - 1) : 0;

    // Costruisco la lista delle rate previste (date + importi + metodo suggerito)
    // cosi' la preview tabellare e la chiamata API sono coerenti.
    const METHOD_THRESHOLD = 500;
    function suggestMethod(amt: number): "bank" | "card" {
      return amt >= METHOD_THRESHOLD ? "bank" : "card";
    }
    function addMonths(iso: string, m: number): string {
      if (!iso) return iso;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const x = new Date(d.getFullYear(), d.getMonth() + m, d.getDate(), 12, 0, 0, 0);
      const y = x.getFullYear();
      const mm = String(x.getMonth() + 1).padStart(2, "0");
      const dd = String(x.getDate()).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
    const installments: Array<{ index: number; date: string; amount: number; method: "bank" | "card" }> = [];
    if (n > 0 && remainder > 0) {
      for (let i = 0; i < n; i++) {
        const isLast = i === n - 1;
        const amount = isLast ? last : base;
        installments.push({
          index: i + 1,
          date: addMonths(customFirstInstDate, i),
          amount,
          method: suggestMethod(amount),
        });
      }
    }

    return { total, depositAmount, remainder, n, base, last, installments };
  }, [
    quote?.totalOneTime,
    customDepositMode,
    customDepositAmount,
    customDepositPercent,
    customNumInstallments,
    customFirstInstDate,
  ]);

  if (!open || !quote) return null;

  async function patchQuote(payload: Record<string, unknown>) {
    const res = await fetch(`/api/quotes/${quote!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore aggiornamento preventivo");
    }
  }

  async function patchPayment(paymentId: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/quotes/${quote!.id}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, ...payload }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore aggiornamento rata");
    }
  }

  async function deletePayment(paymentId: string) {
    const res = await fetch(`/api/quotes/${quote!.id}/payments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore eliminazione rata");
    }
  }

  async function createPayment(payload: Record<string, unknown>) {
    const res = await fetch(`/api/quotes/${quote!.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Errore creazione rata");
    }
  }

  // ========================================
  // Piano pagamenti personalizzato (custom)
  // ========================================
  // (gli hooks sono spostati piu' in alto, prima del return early, per rispettare le Rules of Hooks.)

  async function generatePlanCustom() {
    if (!customPreview || !quote) return;
    if (payments.length > 0) {
      const ok = window.confirm(
        "Verranno cancellate tutte le rate esistenti e ricostruito il piano personalizzato. Procedere?"
      );
      if (!ok) return;
    }
    const customPlan = {
      totalToSplit: customPreview.total,
      deposit: customDepositMode === "amount"
        ? { mode: "amount", amount: Number(customDepositAmount) || 0 }
        : { mode: "percent", percent: Number(customDepositPercent) || 0 },
      depositDate: customDepositDate,
      depositMethod: customDepositMethod,
      numInstallments: Number(customNumInstallments) || 0,
      firstInstallmentDate: customFirstInstDate,
    };
    const res = await fetch(`/api/quotes/${quote.id}/payments/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "custom",
        replaceExisting: true,
        customPlan,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || "Errore generazione piano custom");
  }

  async function generatePlan(scope: "all" | "monthly") {
    if (scope === "all" && payments.length > 0) {
      const ok = window.confirm(
        "Verranno cancellate tutte le rate esistenti e ricostruito il piano completo. Procedere?"
      );
      if (!ok) return;
    }
    if (scope === "monthly" && grouped.monthly.length > 0) {
      const ok = window.confirm("Verranno rigenerate solo le mensilità (le rate setup restano). Procedere?");
      if (!ok) return;
    }
    const payload: Record<string, unknown> = {
      scope,
      depositPercent: Math.min(100, Math.max(0, Math.round(deposit))),
      replaceExisting: true,
    };
    if (startDate) payload.acquisitionDate = startDate;
    if (endDate) payload.deliveryExpectedAt = endDate;
    const res = await fetch(`/api/quotes/${quote!.id}/payments/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || "Errore generazione piano");
  }

  async function saveDates() {
    setError(null);
    setBusy(true);
    try {
      await patchQuote({
        wonAt: parseInputDateToIso(startDate),
        deliveryExpectedAt: parseInputDateToIso(endDate),
      });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setBusy(false);
    }
  }

  async function addManualSetupRow() {
    setError(null);
    const amount = Number(String(newAmount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Importo rata non valido");
      return;
    }
    if (!newDate) {
      setError("Data scadenza mancante");
      return;
    }
    setBusy(true);
    try {
      await createPayment({
        amount: Math.round(amount),
        dueDate: parseInputDateToIso(newDate),
        kind: "SETUP_RATA",
        notes: newNotes || "Rata setup",
      });
      setNewAmount("");
      setNewNotes("");
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Chiudi pannello"
        className="flex-1 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="w-full sm:w-[520px] h-full overflow-y-auto"
        style={{ background: "var(--mc-bg-elevated)", borderLeft: "1px solid var(--mc-border)" }}
        role="dialog"
        aria-label="Pagamenti preventivo"
      >
        <header
          className="sticky top-0 z-10 px-5 py-4"
          style={{ background: "var(--mc-bg-elevated)", borderBottom: "1px solid var(--mc-border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-mono" style={{ color: "var(--mc-text-muted)" }}>
                {quote.quoteNumber}
              </div>
              <div className="font-semibold text-base truncate">{quote.clientName}</div>
              {quote.clientCompany && (
                <div className="text-xs truncate" style={{ color: "var(--mc-text-muted)" }}>
                  {quote.clientCompany}
                </div>
              )}
              <div className="text-xs mt-1 tabular-nums" style={{ color: "var(--mc-text-secondary)" }}>
                Setup {formatEuro(quote.totalOneTime || 0)} · Canone {formatEuro(quote.totalMonthly || 0)}/mese · Anno 1{" "}
                <strong>{formatEuro(quote.totalAnnual || 0)}</strong>
              </div>
            </div>
            <button type="button" className="btn-ghost text-sm px-2 py-1" onClick={onClose} disabled={busy}>
              Chiudi
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg text-sm" style={{ background: "var(--mc-danger-bg)", color: "var(--mc-danger)" }}>
            {error}
          </div>
        )}

        <section className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--mc-text-secondary)" }}>
            Date
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="label">Data inizio</div>
              <input
                type="date"
                className="input text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={busy}
              />
              <div className="text-[11px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                Data acquisizione (firma).
              </div>
            </div>
            <div>
              <div className="label">Data fine</div>
              <input
                type="date"
                className="input text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={busy}
              />
              <div className="text-[11px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                Consegna prevista: le mensilità partono dal mese successivo.
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={saveDates}>
              Salva date
            </button>
          </div>

          {/* Hint piano cliente precedente: appare solo se il preventivo non
              ha ancora pagamenti e abbiamo trovato un piano custom su un
              preventivo precedente dello stesso cliente. Una sola riga,
              dismissabile. */}
          {lastCustomerPlan && !lastPlanDismissed && payments.length === 0 && (
            <div
              className="mt-3 p-3 rounded-lg flex items-center gap-3 flex-wrap"
              style={{
                background: "var(--mc-bg-elevated)",
                border: "1px dashed var(--mc-border)",
              }}
            >
              <div className="text-xs leading-snug" style={{ color: "var(--mc-text-secondary)" }}>
                Piano gia' usato per <strong style={{ color: "var(--mc-text)" }}>{lastCustomerPlan.sourceClientLabel || "questo cliente"}</strong>
                {" su "}
                <strong style={{ color: "var(--mc-text)" }}>{lastCustomerPlan.sourceQuoteNumber}</strong>
                {": acconto "}
                <strong style={{ color: "var(--mc-text)" }}>{formatEuro(lastCustomerPlan.plan.depositAmount)}</strong>
                {" + "}
                <strong style={{ color: "var(--mc-text)" }}>{lastCustomerPlan.plan.numInstallments}</strong>
                {" rate"}
                {lastCustomerPlan.plan.dominantMethod
                  ? <> · prevalente <strong style={{ color: "var(--mc-text)" }}>{lastCustomerPlan.plan.dominantMethod === "bank" ? "bonifico" : "carta"}</strong></>
                  : null}
                .
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-md"
                  style={{ background: "#FF6A00", color: "white", border: "1.5px solid #FF6A00" }}
                  onClick={applyLastCustomerPlan}
                >
                  Usa come template
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1.5 rounded-md"
                  style={{ color: "var(--mc-text-muted)" }}
                  onClick={() => setLastPlanDismissed(true)}
                  title="Nascondi questo suggerimento"
                >
                  Nascondi
                </button>
              </div>
            </div>
          )}

          {customPreview && (
            <div className="mt-3 p-4 rounded-lg" style={{ background: "var(--mc-bg-elevated)", border: "1px solid var(--mc-border)" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--mc-text-secondary)" }}>
                Piano personalizzato — setup {formatEuro(customPreview.total)}
              </div>

              {/* SEZIONE 1: ACCONTO */}
              <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
                <div className="text-sm font-semibold mb-2">1. Acconto alla firma</div>

                {/* Segmented control €/% piu' visibile: due bottoni grossi affiancati */}
                <div className="mb-2 grid grid-cols-2 gap-2" style={{ maxWidth: 240 }}>
                  <button
                    type="button"
                    onClick={() => setCustomDepositMode("amount")}
                    className="text-sm font-semibold rounded-md px-3 py-2 transition-all"
                    style={{
                      background: customDepositMode === "amount" ? "#FF6A00" : "transparent",
                      color: customDepositMode === "amount" ? "white" : "var(--mc-text-secondary)",
                      border: "1.5px solid " + (customDepositMode === "amount" ? "#FF6A00" : "var(--mc-border)"),
                    }}
                  >
                    Importo (€)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDepositMode("percent")}
                    className="text-sm font-semibold rounded-md px-3 py-2 transition-all"
                    style={{
                      background: customDepositMode === "percent" ? "#FF6A00" : "transparent",
                      color: customDepositMode === "percent" ? "white" : "var(--mc-text-secondary)",
                      border: "1.5px solid " + (customDepositMode === "percent" ? "#FF6A00" : "var(--mc-border)"),
                    }}
                  >
                    Percentuale (%)
                  </button>
                </div>

                {/* Preset rapidi: scrivono direttamente nei campi acconto. */}
                <div className="mb-3 flex items-center gap-2 flex-wrap text-xs">
                  <span style={{ color: "var(--mc-text-muted)" }}>Preset:</span>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded border"
                    style={{ borderColor: "var(--mc-border)" }}
                    onClick={() => {
                      setCustomDepositMode("percent");
                      setCustomDepositPercent("30");
                    }}
                  >
                    30%
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded border"
                    style={{ borderColor: "var(--mc-border)" }}
                    onClick={() => {
                      setCustomDepositMode("percent");
                      setCustomDepositPercent("50");
                    }}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded border"
                    style={{ borderColor: "var(--mc-border)" }}
                    onClick={() => {
                      setCustomDepositMode("percent");
                      setCustomDepositPercent("100");
                      setCustomNumInstallments("0");
                    }}
                    title="Pagamento unico: acconto al 100%, niente rate"
                  >
                    Pagamento unico
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--mc-text-secondary)" }}>
                      {customDepositMode === "amount" ? "Importo acconto" : "% sul setup"}
                    </label>
                    {customDepositMode === "amount" ? (
                      <input
                        type="number"
                        className="input w-full text-sm"
                        placeholder="es. 5000"
                        value={customDepositAmount}
                        onChange={(e) => setCustomDepositAmount(e.target.value)}
                        min={0}
                      />
                    ) : (
                      <input
                        type="number"
                        className="input w-full text-sm"
                        placeholder="30"
                        value={customDepositPercent}
                        onChange={(e) => setCustomDepositPercent(e.target.value)}
                        min={0}
                        max={100}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--mc-text-secondary)" }}>
                      Data acconto
                    </label>
                    <input
                      type="date"
                      className="input w-full text-sm"
                      value={customDepositDate}
                      onChange={(e) => setCustomDepositDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--mc-text-secondary)" }}>
                      Metodo
                    </label>
                    <select
                      className="input w-full text-sm"
                      value={customDepositMethod}
                      onChange={(e) => setCustomDepositMethod(e.target.value as "bank" | "card")}
                    >
                      <option value="bank">Bonifico</option>
                      <option value="card">Carta</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 text-xs flex items-center gap-3" style={{ color: "var(--mc-text-secondary)" }}>
                  <span>Acconto: <strong style={{ color: "var(--mc-text)" }}>{formatEuro(customPreview.depositAmount)}</strong></span>
                  <span>·</span>
                  <span>Saldo da rateizzare: <strong style={{ color: "var(--mc-text)" }}>{formatEuro(customPreview.remainder)}</strong></span>
                </div>
              </div>

              {/* SEZIONE 2: SALDO IN RATE */}
              <div className="mb-4">
                <div className="text-sm font-semibold mb-2">2. Saldo in rate mensili</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--mc-text-secondary)" }}>
                      Numero rate
                    </label>
                    <input
                      type="number"
                      className="input w-full text-sm"
                      value={customNumInstallments}
                      onChange={(e) => setCustomNumInstallments(e.target.value)}
                      min={0}
                      max={60}
                      placeholder="es. 4"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--mc-text-secondary)" }}>
                      Data prima rata
                    </label>
                    <input
                      type="date"
                      className="input w-full text-sm"
                      value={customFirstInstDate}
                      onChange={(e) => setCustomFirstInstDate(e.target.value)}
                    />
                  </div>
                </div>

                {customPreview.n > 0 && customPreview.remainder > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--mc-text-secondary)" }}>
                      Anteprima rate ({customPreview.n})
                    </div>
                    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--mc-border)" }}>
                      <table className="w-full text-xs tabular-nums">
                        <thead style={{ background: "var(--mc-bg)", color: "var(--mc-text-secondary)" }}>
                          <tr>
                            <th className="text-left px-2.5 py-1.5 font-semibold">#</th>
                            <th className="text-left px-2.5 py-1.5 font-semibold">Scadenza</th>
                            <th className="text-right px-2.5 py-1.5 font-semibold">Importo</th>
                            <th className="text-left px-2.5 py-1.5 font-semibold">Metodo (suggerito)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customPreview.installments.map((r) => (
                            <tr key={r.index} style={{ borderTop: "1px solid var(--mc-border)" }}>
                              <td className="px-2.5 py-1.5">{r.index}</td>
                              <td className="px-2.5 py-1.5">
                                {r.date ? new Date(r.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="px-2.5 py-1.5 text-right font-semibold">{formatEuro(r.amount)}</td>
                              <td className="px-2.5 py-1.5">{r.method === "bank" ? "Bonifico" : "Carta"}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: "1px solid var(--mc-border)", background: "var(--mc-bg)" }}>
                            <td className="px-2.5 py-1.5 font-semibold" colSpan={2}>Totale rate</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold">{formatEuro(customPreview.remainder)}</td>
                            <td className="px-2.5 py-1.5"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                      Metodo suggerito automaticamente: bonifico ≥ 500 €, carta sotto. Modificabile dopo la generazione, una rata per volta.
                    </div>
                  </div>
                )}
                {customPreview.n === 0 && customPreview.remainder > 0 && (
                  <div className="mt-2 text-xs" style={{ color: "var(--mc-warning)" }}>
                    Imposta almeno 1 rata per coprire il saldo di {formatEuro(customPreview.remainder)}.
                  </div>
                )}
                {customPreview.remainder === 0 && customPreview.depositAmount > 0 && (
                  <div className="mt-2 text-xs" style={{ color: "var(--mc-text-muted)" }}>
                    L&apos;acconto copre il setup intero, niente rate da generare.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={busy || !customPreview || (customPreview.remainder > 0 && customPreview.n === 0)}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    try {
                      await generatePlanCustom();
                      await onChanged();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Errore inatteso");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Genera piano
                </button>
                {quote.totalMonthly > 0 && (
                  <button
                    type="button"
                    className="btn-ghost text-sm"
                    disabled={busy || !endDate}
                    title={!endDate ? "Imposta la data fine in alto per generare le mensilita'" : "Rigenera solo le 12 mensilita' canone (preserva acconto e rate setup)"}
                    onClick={async () => {
                      setError(null);
                      setBusy(true);
                      try {
                        await generatePlan("monthly");
                        await onChanged();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Errore inatteso");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Solo canoni
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--mc-text-muted)" }}>
                "Genera piano" sostituisce ogni rata esistente. Le mensilita' canone e gli anticipi annuali
                vengono aggiunti automaticamente. Le rate puoi modificarle una per una nella tabella qui sotto.
              </p>
            </div>
          )}
        </section>

        <section className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--mc-text-secondary)" }}>
              Setup — acconto + rate
            </div>
            <div className="text-[11px] tabular-nums" style={{ color: "var(--mc-text-muted)" }}>
              Aperto {formatEuro(grouped.setup.filter((p) => !p.paidAt).reduce((a, b) => a + (b.amount || 0), 0))}
            </div>
          </div>
          <PaymentList
            rows={grouped.setup}
            busy={busy}
            onPatch={async (id, p) => {
              setBusy(true);
              try {
                await patchPayment(id, p);
                await onChanged();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Errore inatteso");
              } finally {
                setBusy(false);
              }
            }}
            onDelete={async (id) => {
              if (!window.confirm("Eliminare questa rata?")) return;
              setBusy(true);
              try {
                await deletePayment(id);
                await onChanged();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Errore inatteso");
              } finally {
                setBusy(false);
              }
            }}
          />

          <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--mc-bg-inset)", border: "1px solid var(--mc-border)" }}>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--mc-text-secondary)" }}>
              Aggiungi rata setup manuale
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="label">Scadenza</div>
                <input type="date" className="input text-sm" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <div className="label">Importo (€)</div>
                <input
                  type="number"
                  inputMode="decimal"
                  className="input text-sm tabular-nums"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="es. 1500"
                />
              </div>
            </div>
            <div className="mt-2">
              <div className="label">Note (opzionale)</div>
              <input className="input text-sm" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="es. Rata 2 di 3" />
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={addManualSetupRow}>
                + Aggiungi rata
              </button>
            </div>
          </div>
        </section>

        {grouped.prepay.length > 0 && (
          <section className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mc-text-secondary)" }}>
              Anticipi annuali (CRM / AI / WA)
            </div>
            <PaymentList
              rows={grouped.prepay}
              busy={busy}
              onPatch={async (id, p) => {
                setBusy(true);
                try {
                  await patchPayment(id, p);
                  await onChanged();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Errore inatteso");
                } finally {
                  setBusy(false);
                }
              }}
              onDelete={async (id) => {
                if (!window.confirm("Eliminare questa rata?")) return;
                setBusy(true);
                try {
                  await deletePayment(id);
                  await onChanged();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Errore inatteso");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </section>
        )}

        {(grouped.monthly.length > 0 || quote.totalMonthly > 0) && (
          <section className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--mc-text-secondary)" }}>
                Mensilità canone (12 da data fine)
              </div>
              <div className="text-[11px] tabular-nums" style={{ color: "var(--mc-text-muted)" }}>
                Aperto {formatEuro(grouped.monthly.filter((p) => !p.paidAt).reduce((a, b) => a + (b.amount || 0), 0))}
              </div>
            </div>
            {grouped.monthly.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                Nessuna mensilità generata. Imposta la data fine e premi “Rigenera solo mensilità”.
              </div>
            ) : (
              <PaymentList
                rows={grouped.monthly}
                busy={busy}
                onPatch={async (id, p) => {
                  setBusy(true);
                  try {
                    await patchPayment(id, p);
                    await onChanged();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Errore inatteso");
                  } finally {
                    setBusy(false);
                  }
                }}
                onDelete={async (id) => {
                  if (!window.confirm("Eliminare questa rata?")) return;
                  setBusy(true);
                  try {
                    await deletePayment(id);
                    await onChanged();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Errore inatteso");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </section>
        )}

        {grouped.other.length > 0 && (
          <section className="px-5 py-4" style={{ borderBottom: "1px solid var(--mc-border)" }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mc-text-secondary)" }}>
              Altre rate
            </div>
            <PaymentList
              rows={grouped.other}
              busy={busy}
              onPatch={async (id, p) => {
                setBusy(true);
                try {
                  await patchPayment(id, p);
                  await onChanged();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Errore inatteso");
                } finally {
                  setBusy(false);
                }
              }}
              onDelete={async (id) => {
                if (!window.confirm("Eliminare questa rata?")) return;
                setBusy(true);
                try {
                  await deletePayment(id);
                  await onChanged();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Errore inatteso");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </section>
        )}

        <footer className="px-5 py-4 text-xs flex items-center justify-between" style={{ color: "var(--mc-text-muted)" }}>
          <span>
            Aperto <strong className="tabular-nums">{formatEuro(totals.outstanding)}</strong> · Incassato{" "}
            <strong className="tabular-nums">{formatEuro(totals.paid)}</strong>
          </span>
          <button type="button" className="btn-ghost text-xs px-3 py-1" onClick={onClose} disabled={busy}>
            Chiudi
          </button>
        </footer>
      </aside>
    </div>
  );
}

function PaymentList({
  rows,
  busy,
  onPatch,
  onDelete,
}: {
  rows: DrawerPayment[];
  busy: boolean;
  onPatch: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  function startEdit(p: DrawerPayment) {
    setEditing(p.id);
    setEditAmount(String(p.amount));
    setEditDate(toInputDate(p.dueDate));
    setEditNotes(p.notes || "");
  }

  async function commitEdit(id: string) {
    const amount = Number(String(editAmount).replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) return;
    await onPatch(id, {
      amount: Math.round(amount),
      dueDate: parseInputDateToIso(editDate),
      notes: editNotes || null,
    });
    setEditing(null);
  }

  if (rows.length === 0) {
    return <div className="text-sm" style={{ color: "var(--mc-text-muted)" }}>Nessuna rata.</div>;
  }

  return (
    <div className="space-y-1.5">
      {rows.map((p) => {
        const isEdit = editing === p.id;
        return (
          <div
            key={p.id}
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              border: "1px solid var(--mc-border)",
              background: p.paidAt ? "var(--mc-success-bg)" : "var(--mc-bg-elevated)",
            }}
          >
            {isEdit ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input text-sm"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    className="input text-sm tabular-nums"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <input
                  className="input text-sm"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Note rata"
                />
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost text-xs px-2 py-1" onClick={() => setEditing(null)} disabled={busy}>
                    Annulla
                  </button>
                  <button className="btn-secondary text-xs px-2 py-1" onClick={() => commitEdit(p.id)} disabled={busy}>
                    Salva
                  </button>
                </div>
              </div>
            ) : (
              <Fragment>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="tabular-nums text-xs font-mono" style={{ color: "var(--mc-text-secondary)" }}>
                      {formatDate(p.dueDate)}
                    </span>
                    <span className="font-semibold tabular-nums">{formatEuro(p.amount)}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "var(--mc-bg-inset)", color: "var(--mc-text-muted)" }}
                    >
                      {KIND_LABELS[p.kind || ""] || p.kind || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.paidAt ? (
                      <button
                        className="btn-ghost text-xs px-2 py-1"
                        onClick={() => onPatch(p.id, { paidAt: null })}
                        disabled={busy}
                        title="Rimuovi pagato"
                      >
                        Rimetti aperto
                      </button>
                    ) : (
                      <button
                        className="btn-secondary text-xs px-2 py-1"
                        onClick={() => onPatch(p.id, { paidAt: new Date().toISOString() })}
                        disabled={busy}
                        title="Segna come pagato oggi"
                      >
                        Segna pagato
                      </button>
                    )}
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => startEdit(p)} disabled={busy}>
                      Modifica
                    </button>
                    <button
                      className="btn-ghost text-xs px-2 py-1"
                      style={{ color: "var(--mc-danger)" }}
                      onClick={() => onDelete(p.id)}
                      disabled={busy}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
                {p.notes && (
                  <div className="text-xs mt-1" style={{ color: "var(--mc-text-muted)" }}>
                    {p.notes}
                  </div>
                )}
                {p.paidAt && (
                  <div className="text-[11px] mt-1" style={{ color: "var(--mc-success)" }}>
                    Pagato {formatDate(p.paidAt)}
                  </div>
                )}
              </Fragment>
            )}
          </div>
        );
      })}
    </div>
  );
}
