"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

export type DrawerPayment = {
  id: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  kind: string | null;
};

export type DrawerQuote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  wonAt: string | null;
  deliveryExpectedAt: string | null;
  depositPercent: number;
};

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
    const res = await fetch(`/api/quotes/${quote!.id}/payments/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        acquisitionDate: startDate || undefined,
        deliveryExpectedAt: endDate || undefined,
        depositPercent: deposit,
        replaceExisting: true,
      }),
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
        depositPercent: Math.min(100, Math.max(0, Math.round(deposit))),
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

  const totals = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    for (const p of payments) {
      if (p.paidAt) paid += p.amount || 0;
      else outstanding += p.amount || 0;
    }
    return { outstanding, paid };
  }, [payments]);

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
                Setup {formatEuro(quote.totalSetup || 0)} · Canone {formatEuro(quote.totalMonthly || 0)}/mese · Anno 1{" "}
                <strong>{formatEuro((quote.totalSetup || 0) + (quote.totalAnnual || 0))}</strong>
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
            Date e acconto
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
          <div className="mt-3 grid grid-cols-2 gap-2 items-end">
            <div>
              <div className="label">Acconto setup %</div>
              <input
                type="number"
                min={0}
                max={100}
                className="input text-sm tabular-nums"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                disabled={busy}
              />
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={saveDates}>
                Salva date
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={busy}
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  await generatePlan("all");
                  await onChanged();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Errore inatteso");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Genera piano completo
            </button>
            {quote.totalMonthly > 0 && (
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={busy}
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
                Rigenera solo mensilità
              </button>
            )}
          </div>
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
