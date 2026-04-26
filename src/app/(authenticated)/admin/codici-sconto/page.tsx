"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  discountAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isExpired(d: string | null) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

export default function AdminCodiciScontoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );

  // Form nuovo codice
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [newPercent, setNewPercent] = useState(10);
  const [newAmount, setNewAmount] = useState(500);
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function fetchCodes() {
    setLoading(true);
    const res = await fetch("/api/discount-codes");
    const data = await res.json();
    setCodes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function resetForm() {
    setNewCode("");
    setNewDescription("");
    setDiscountMode("percent");
    setNewPercent(10);
    setNewAmount(500);
    setNewMaxUses("");
    setNewExpiresAt("");
    setFormError("");
  }

  async function handleCreate() {
    setFormError("");
    if (!newCode.trim()) {
      setFormError("Il codice è obbligatorio.");
      return;
    }
    if (discountMode === "percent" && (!newPercent || newPercent < 1)) {
      setFormError("Inserisci una percentuale valida (min 1%).");
      return;
    }
    if (discountMode === "amount" && (!newAmount || newAmount < 1)) {
      setFormError("Inserisci un importo valido (min 1€).");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode.trim(),
        description: newDescription || null,
        discountPercent: discountMode === "percent" ? newPercent : 0,
        discountAmount: discountMode === "amount" ? newAmount : 0,
        maxUses: newMaxUses ? parseInt(newMaxUses) : null,
        expiresAt: newExpiresAt || null,
      }),
    });
    setCreating(false);
    if (res.ok) {
      resetForm();
      setShowForm(false);
      setMessage({ type: "success", text: "Codice creato." });
      setTimeout(() => setMessage(null), 3000);
      fetchCodes();
    } else {
      const data = await res.json();
      setFormError(data.error || "Errore nella creazione");
    }
  }

  async function toggleActive(c: DiscountCode) {
    await fetch(`/api/discount-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    fetchCodes();
  }

  async function deleteCode(c: DiscountCode) {
    const res = await fetch(`/api/discount-codes/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Codice ${c.code} eliminato.` });
      setTimeout(() => setMessage(null), 3000);
      fetchCodes();
    } else {
      setMessage({ type: "danger", text: "Errore durante l'eliminazione." });
    }
    setConfirmDelete(null);
  }

  const stats = useMemo(() => {
    const active = codes.filter((c) => c.active && !isExpired(c.expiresAt));
    return {
      total: codes.length,
      active: active.length,
      totalUses: codes.reduce((sum, c) => sum + c.usedCount, 0),
    };
  }, [codes]);

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
          <span className="text-sm">Caricamento codici...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-4xl mb-1">Codici sconto</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Codici manuali da usare in trattativa. Sostituiscono lo sconto volume
            automatico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? (
            "Annulla"
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuovo codice
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-label">Totali</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">codici creati</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attivi</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-sub">utilizzabili oggi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utilizzi</div>
          <div className="stat-value">{stats.totalUses}</div>
          <div className="stat-sub">applicazioni totali</div>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`alert ${
            message.type === "success" ? "alert-success" : "alert-danger"
          } mb-4 animate-fade-in`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="flex-shrink-0 mt-0.5"
            aria-hidden="true"
          >
            {message.type === "success" ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </>
            )}
          </svg>
          <span>{message.text}</span>
        </div>
      )}

      {/* Form nuovo codice */}
      {showForm && (
        <div
          className="card-accent p-5 sm:p-6 mb-6 animate-fade-in"
          style={{ background: "var(--mc-accent-soft)" }}
        >
          <h2 className="text-2xl mb-4">Nuovo codice sconto</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="newCode">
                Codice <span style={{ color: "var(--mc-accent)" }}>*</span>
              </label>
              <input
                id="newCode"
                type="text"
                className="input font-mono"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="es. AMICO-15"
                autoFocus
              />
              <p className="helper-text">Convertito automaticamente in maiuscolo.</p>
            </div>

            <div>
              <label className="label" htmlFor="newPercent">
                Sconto <span style={{ color: "var(--mc-accent)" }}>*</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="radio"
                    name="discountMode"
                    checked={discountMode === "percent"}
                    onChange={() => setDiscountMode("percent")}
                  />
                  Percentuale
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="radio"
                    name="discountMode"
                    checked={discountMode === "amount"}
                    onChange={() => setDiscountMode("amount")}
                  />
                  Importo €
                </label>
              </div>

              {discountMode === "percent" ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="newPercent"
                    type="number"
                    className="input"
                    value={newPercent}
                    onChange={(e) => setNewPercent(parseInt(e.target.value) || 0)}
                    min="1"
                    max="50"
                  />
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--mc-accent)" }}
                  >
                    %
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="newAmount"
                    type="number"
                    className="input"
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--mc-accent)" }}
                  >
                    €
                  </span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label">Descrizione (note interne)</label>
              <input
                type="text"
                className="input"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="es. Promo amici/conoscenze, validità 30 gg"
              />
            </div>

            <div>
              <label className="label">Numero massimo utilizzi</label>
              <input
                type="number"
                className="input"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="es. 10"
                min="1"
              />
              <p className="helper-text">Vuoto = illimitato</p>
            </div>

            <div>
              <label className="label">Scadenza</label>
              <input
                type="date"
                className="input"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
              <p className="helper-text">Vuoto = nessuna scadenza</p>
            </div>
          </div>

          {formError && (
            <div className="alert alert-danger mt-4">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary"
            >
              {creating ? "Creazione..." : "Crea codice"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="btn-ghost"
              disabled={creating}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Tabella codici */}
      {codes.length === 0 ? (
        <div className="card p-12 text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--mc-accent-soft)" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--mc-accent)" }}
              aria-hidden="true"
            >
              <path d="M21 14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11l5 5v3a2 2 0 0 1-2 2z" />
              <path d="M3 18h18" />
            </svg>
          </div>
          <p
            className="text-base mb-1 font-semibold"
            style={{ color: "var(--mc-text)" }}
          >
            Nessun codice creato
          </p>
          <p
            className="text-sm italic mb-5"
            style={{ color: "var(--mc-text-muted)" }}
          >
            Crea il primo codice sconto da usare in trattativa.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              + Crea il primo codice
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Sconto</th>
                  <th>Descrizione</th>
                  <th>Utilizzi</th>
                  <th>Scadenza</th>
                  <th>Stato</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = isExpired(c.expiresAt);
                  const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
                  const isUsable = c.active && !expired && !exhausted;
                  const usagePercent = c.maxUses
                    ? Math.min(100, (c.usedCount / c.maxUses) * 100)
                    : 0;

                  return (
                    <tr key={c.id}>
                      <td className="font-mono font-semibold">{c.code}</td>
                      <td>
                        <span
                          className="font-bold tabular-nums"
                          style={{ color: "var(--mc-success)" }}
                        >
                          {c.discountAmount > 0
                            ? `−${formatEuro(c.discountAmount)}`
                            : `−${c.discountPercent}%`}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {c.description || (
                          <span style={{ color: "var(--mc-text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="text-sm">
                        <div className="font-semibold tabular-nums">
                          {c.usedCount}
                          {c.maxUses !== null && (
                            <span style={{ color: "var(--mc-text-muted)" }}>
                              {" / "}
                              {c.maxUses}
                            </span>
                          )}
                        </div>
                        {c.maxUses !== null && (
                          <div
                            className="mt-1 w-20 h-1 rounded-full overflow-hidden"
                            style={{ background: "var(--mc-bg-inset)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${usagePercent}%`,
                                background:
                                  usagePercent >= 100
                                    ? "var(--mc-danger)"
                                    : usagePercent >= 80
                                    ? "var(--mc-warning)"
                                    : "var(--mc-accent)",
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-sm">
                        <span
                          style={{
                            color: expired
                              ? "var(--mc-danger)"
                              : "var(--mc-text-secondary)",
                          }}
                        >
                          {formatDate(c.expiresAt)}
                        </span>
                      </td>
                      <td>
                        {!c.active ? (
                          <span className="badge badge-expired">
                            <span className="badge-dot" />
                            Disattivato
                          </span>
                        ) : expired ? (
                          <span className="badge badge-rejected">
                            <span className="badge-dot" />
                            Scaduto
                          </span>
                        ) : exhausted ? (
                          <span className="badge badge-rejected">
                            <span className="badge-dot" />
                            Esaurito
                          </span>
                        ) : (
                          <span className="badge badge-accepted">
                            <span className="badge-dot" />
                            Attivo
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleActive(c)}
                            className="btn-ghost text-xs px-2 py-1"
                          >
                            {c.active ? "Disattiva" : "Attiva"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(c)}
                            className="btn-ghost text-xs px-2 py-1"
                            style={{ color: "var(--mc-danger)" }}
                          >
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="card p-6 max-w-md w-full"
            style={{ boxShadow: "var(--mc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-2">Eliminare il codice?</h3>
            <p className="text-sm mb-1" style={{ color: "var(--mc-text-secondary)" }}>
              Stai per eliminare il codice{" "}
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--mc-text)" }}
              >
                {confirmDelete.code}
              </span>
              .
            </p>
            <p className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
              L&apos;azione è irreversibile. I preventivi che lo hanno già usato non
              vengono modificati.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => deleteCode(confirmDelete)}
                className="btn-danger"
              >
                Sì, elimina
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
