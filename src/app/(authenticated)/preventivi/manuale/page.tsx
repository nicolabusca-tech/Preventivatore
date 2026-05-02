"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CrmCustomerSearch, type CrmCustomer } from "@/components/CrmCustomerSearch";

type ManualLine = {
  uid: string;
  description: string;
  amount: string; // grezzo: lasciamo string per non perdere "0" e input transitori
  isMonthly: boolean;
  cost: string;
};

function newLine(): ManualLine {
  return {
    uid:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    description: "",
    amount: "",
    isMonthly: false,
    cost: "",
  };
}

function parseEuro(value: string): number {
  if (!value) return 0;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

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

export default function PreventivoManualePage() {
  const router = useRouter();
  const { status } = useSession();

  // Cliente
  const [crmCustomerId, setCrmCustomerId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPostalCode, setClientPostalCode] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientProvince, setClientProvince] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [clientSdi, setClientSdi] = useState("");

  // Voci
  const [lines, setLines] = useState<ManualLine[]>([newLine()]);

  // Note + scadenza
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    let setupRev = 0;
    let monthlyRev = 0;
    let setupCost = 0;
    let monthlyCost = 0;
    for (const l of lines) {
      const a = parseEuro(l.amount);
      const c = parseEuro(l.cost);
      if (l.isMonthly) {
        monthlyRev += a;
        monthlyCost += c;
      } else {
        setupRev += a;
        setupCost += c;
      }
    }
    const annualRev = setupRev + monthlyRev * 12;
    const annualCost = setupCost + monthlyCost * 12;
    const margin = annualRev - annualCost;
    const marginPct = annualRev > 0 ? (margin / annualRev) * 100 : 0;
    return {
      setupRev,
      monthlyRev,
      annualRev,
      setupCost,
      monthlyCost,
      annualCost,
      margin,
      marginPct,
    };
  }, [lines]);

  const validLineCount = useMemo(
    () => lines.filter((l) => l.description.trim() && parseEuro(l.amount) > 0).length,
    [lines]
  );

  function updateLine(uid: string, patch: Partial<ManualLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(uid: string) {
    setLines((prev) => (prev.length === 1 ? [newLine()] : prev.filter((l) => l.uid !== uid)));
  }

  async function save() {
    setError("");
    if (!clientName.trim()) {
      setError("Il nome del cliente è obbligatorio.");
      return;
    }
    if (validLineCount === 0) {
      setError("Inserisci almeno una voce con descrizione e importo > 0.");
      return;
    }

    setSaving(true);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays || 30));

    const payload = {
      clientName: clientName.trim(),
      clientCompany: clientCompany.trim() || null,
      clientEmail: clientEmail.trim() || null,
      clientPhone: clientPhone.trim() || null,
      clientNotes: clientNotes.trim() || null,
      clientAddress: clientAddress.trim() || null,
      clientPostalCode: clientPostalCode.trim() || null,
      clientCity: clientCity.trim() || null,
      clientProvince: clientProvince.trim() || null,
      clientVat: clientVat.trim() || null,
      clientSdi: clientSdi.trim() || null,
      crmCustomerId: crmCustomerId || null,
      notes: notes.trim() || null,
      expiresAt: expiresAt.toISOString(),
      lines: lines
        .filter((l) => l.description.trim() && parseEuro(l.amount) > 0)
        .map((l) => ({
          description: l.description.trim(),
          amount: parseEuro(l.amount),
          isMonthly: l.isMonthly,
          cost: parseEuro(l.cost),
        })),
    };

    try {
      const res = await fetch("/api/quotes/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || `Errore salvataggio (HTTP ${res.status}).`);
        setSaving(false);
        return;
      }
      const id = body?.id;
      if (id) {
        router.push(`/preventivi/${id}`);
      } else {
        router.push("/preventivi");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
      setSaving(false);
    }
  }

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
        <Link
          href="/preventivi"
          className="inline-flex items-center gap-1 text-xs font-semibold mb-3 hover:underline"
          style={{ color: "var(--mc-text-secondary)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Torna ai preventivi
        </Link>
        <h1 className="text-2xl sm:text-4xl mb-1">Nuovo preventivo manuale</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Per servizi non standardizzati. Numerazione e fase pipeline sono uguali a quelli del listino,
          ma componi liberamente le voci di ricavo e costo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Cliente */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>

            <div className="mb-4">
              <div className="label">Importa dal CRM (opzionale)</div>
              <CrmCustomerSearch
                onSelect={(c: CrmCustomer) => {
                  setCrmCustomerId(c.crmId || null);
                  setClientName(c.fullName || `${c.firstName} ${c.lastName}`.trim());
                  setClientCompany(c.company || "");
                  setClientEmail(c.email || "");
                  setClientPhone(c.phone || "");
                  setClientAddress(c.address || "");
                  setClientPostalCode(c.postalCode || "");
                  setClientCity(c.city || "");
                  setClientProvince(c.province || "");
                  setClientVat(c.vat || "");
                  setClientSdi(c.sdi || "");
                }}
              />
              {crmCustomerId && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="badge badge-accent">
                    <span className="badge-dot" />
                    CRM #{crmCustomerId}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setCrmCustomerId(null)}
                  >
                    Rimuovi collegamento CRM
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Nome referente <span style={{ color: "var(--mc-accent)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Mario Rossi"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Ragione sociale</label>
                <input
                  type="text"
                  className="input"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Edilizia Rossi Srl"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="mario@esempio.it"
                />
              </div>
              <div>
                <label className="label">Telefono</label>
                <input
                  type="tel"
                  className="input"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Indirizzo</label>
                <input
                  type="text"
                  className="input"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Via e numero civico"
                />
              </div>
              <div>
                <label className="label">CAP</label>
                <input
                  type="text"
                  className="input"
                  value={clientPostalCode}
                  onChange={(e) => setClientPostalCode(e.target.value)}
                  placeholder="00000"
                />
              </div>
              <div>
                <label className="label">Città</label>
                <input
                  type="text"
                  className="input"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  placeholder="Comune"
                />
              </div>
              <div>
                <label className="label">Provincia</label>
                <input
                  type="text"
                  className="input"
                  value={clientProvince}
                  onChange={(e) => setClientProvince(e.target.value.toUpperCase())}
                  placeholder="BG"
                />
              </div>
              <div>
                <label className="label">Partita IVA</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={clientVat}
                  onChange={(e) => setClientVat(e.target.value)}
                  placeholder="IT..."
                />
              </div>
              <div>
                <label className="label">Codice SDI</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={clientSdi}
                  onChange={(e) => setClientSdi(e.target.value.toUpperCase())}
                  placeholder="XXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Note cliente</label>
                <textarea
                  rows={2}
                  className="input"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Contesto, accordi, riferimenti..."
                />
              </div>
            </div>
          </div>

          {/* Voci preventivo */}
          <div className="card p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <h2 className="text-2xl mb-1">Voci del preventivo</h2>
                <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
                  Una riga per voce. Importi in € interi, IVA esclusa. Il "costo" è opzionale e serve
                  a calcolare il margine in Analisi.
                </p>
              </div>
              <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={addLine}>
                + Aggiungi voce
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => (
                <div
                  key={l.uid}
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--mc-bg-elevated)",
                    border: "1px solid var(--mc-border)",
                  }}
                >
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 sm:col-span-6">
                      <label className="label">Descrizione voce #{idx + 1}</label>
                      <input
                        type="text"
                        className="input"
                        value={l.description}
                        onChange={(e) => updateLine(l.uid, { description: e.target.value })}
                        placeholder="es. Consulenza strategica su misura"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="label">Importo (€)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        className="input tabular-nums"
                        value={l.amount}
                        onChange={(e) => updateLine(l.uid, { amount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="label">Tipo</label>
                      <select
                        className="input"
                        value={l.isMonthly ? "monthly" : "one_time"}
                        onChange={(e) =>
                          updateLine(l.uid, { isMonthly: e.target.value === "monthly" })
                        }
                      >
                        <option value="one_time">Una tantum</option>
                        <option value="monthly">Canone mensile</option>
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="label">Costo (€)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        className="input tabular-nums"
                        value={l.cost}
                        onChange={(e) => updateLine(l.uid, { cost: e.target.value })}
                        placeholder="0"
                        title="Costo interno per questa voce (per il calcolo del margine). Lascia 0 se non rilevante."
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="btn-ghost text-xs px-2 py-1"
                      onClick={() => removeLine(l.uid)}
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scadenza + note */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Scadenza e note</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Validità (giorni)</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value) || 30)}
                />
                <p className="helper-text">
                  Scadenza:{" "}
                  {new Date(
                    Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("it-IT")}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Note interne</label>
              <textarea
                rows={3}
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Accordi, condizioni, riferimenti..."
              />
            </div>
          </div>
        </div>

        {/* Sidebar totali */}
        <div className="lg:col-span-1 lg:self-start">
          {/* Sticky sotto la navbar h-14: top-20 evita la sovrapposizione. */}
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto lg:overscroll-contain">
            <div className="card p-5 space-y-4">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--mc-text-secondary)" }}
                >
                  Totali (live)
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Setup una tantum</span>
                    <span className="font-semibold tabular-nums">{formatEuro(totals.setupRev)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Canoni mensili</span>
                    <span className="font-semibold tabular-nums">
                      {totals.monthlyRev > 0 ? `${formatEuro(totals.monthlyRev)}/m` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: "2px solid var(--mc-text)" }}>
                <div className="label">Totale primo anno</div>
                <div
                  className="text-3xl font-bold tabular-nums mt-0.5"
                  style={{ color: "var(--mc-accent)", letterSpacing: "-0.02em" }}
                >
                  {formatEuro(totals.annualRev)}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--mc-text-muted)" }}>
                  IVA esclusa
                </div>
              </div>

              <div className="card-muted p-4">
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--mc-text-secondary)" }}
                >
                  Costi e margine (1° anno)
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Costo annuale</span>
                    <span className="font-semibold tabular-nums">
                      {totals.annualCost > 0 ? formatEuro(totals.annualCost) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Margine annuale</span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{
                        color:
                          totals.margin > 0
                            ? "var(--mc-success)"
                            : totals.margin < 0
                              ? "var(--mc-danger, #b91c1c)"
                              : undefined,
                      }}
                    >
                      {totals.annualRev > 0
                        ? `${formatEuro(totals.margin)} (${formatPct(totals.marginPct)})`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || validLineCount === 0 || !clientName.trim()}
                className="btn-primary w-full"
              >
                {saving ? "Salvataggio..." : "Salva preventivo manuale"}
              </button>

              <p className="text-xs text-center" style={{ color: "var(--mc-text-muted)" }}>
                Il preventivo manuale viene salvato direttamente come «consegnato»: appare in lista e
                in Analisi con la stessa numerazione, e puoi gestire fase, date e pagamenti.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
