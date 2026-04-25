"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Quote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: { name: string };
  items: { id: string }[];
};

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "In attesa", class: "badge-pending" },
  inviato: { label: "Inviato", class: "badge-sent" },
  accettato: { label: "Accettato", class: "badge-accepted" },
  rifiutato: { label: "Rifiutato", class: "badge-rejected" },
  scaduto: { label: "Scaduto", class: "badge-expired" },
};

const filterTabs = [
  { value: "all", label: "Tutti" },
  { value: "pending", label: "In attesa" },
  { value: "inviato", label: "Inviati" },
  { value: "accettato", label: "Accettati" },
  { value: "rifiutato", label: "Rifiutati" },
  { value: "scaduto", label: "Scaduti" },
];

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PreventiviPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchQuotes() {
    setLoading(true);
    const url = filter === "all" ? "/api/quotes" : `/api/quotes?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setQuotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  // Filtro ricerca cliente / numero
  const filteredQuotes = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.trim().toLowerCase();
    return quotes.filter(
      (quote) =>
        quote.clientName.toLowerCase().includes(q) ||
        quote.clientCompany?.toLowerCase().includes(q) ||
        quote.quoteNumber.toLowerCase().includes(q)
    );
  }, [quotes, search]);

  // Stats: ora con valori in € (NUOVO v1.4)
  const stats = useMemo(() => {
    const inAttesaQuotes = quotes.filter(
      (q) => q.status === "pending" || q.status === "inviato"
    );
    const inScadenzaQuotes = quotes.filter(
      (q) =>
        (q.status === "pending" || q.status === "inviato") &&
        daysUntil(q.expiresAt) <= 7 &&
        daysUntil(q.expiresAt) >= 0
    );
    const acquisitiQuotes = quotes.filter((q) => q.status === "accettato");

    return {
      total: quotes.length,
      totalValue: quotes.reduce((sum, q) => sum + q.totalAnnual, 0),
      inAttesaCount: inAttesaQuotes.length,
      inAttesaValue: inAttesaQuotes.reduce((sum, q) => sum + q.totalAnnual, 0),
      inScadenzaCount: inScadenzaQuotes.length,
      inScadenzaValue: inScadenzaQuotes.reduce(
        (sum, q) => sum + q.totalAnnual,
        0
      ),
      acquisitiCount: acquisitiQuotes.length,
      acquisitiValue: acquisitiQuotes.reduce(
        (sum, q) => sum + q.totalAnnual,
        0
      ),
    };
  }, [quotes]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-4xl mb-1">I miei preventivi</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            {isAdmin
              ? "Visualizzazione admin: preventivi di tutti i commerciali."
              : "I preventivi che hai creato."}
          </p>
        </div>
        <Link href="/preventivi/nuovo" className="btn-primary">
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
          Nuovo preventivo
        </Link>
      </div>

      {/* Stats cards con valori in € (v1.4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="stat-label">Totale preventivato</div>
          <div className="stat-value">{formatEuro(stats.totalValue)}</div>
          <div className="stat-sub">
            {stats.total} {stats.total === 1 ? "preventivo" : "preventivi"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">In attesa</div>
          <div className="stat-value">{formatEuro(stats.inAttesaValue)}</div>
          <div className="stat-sub">
            {stats.inAttesaCount}{" "}
            {stats.inAttesaCount === 1 ? "preventivo aperto" : "preventivi aperti"}
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderColor:
              stats.inScadenzaCount > 0 ? "var(--mc-accent)" : "var(--mc-border)",
            background:
              stats.inScadenzaCount > 0
                ? "var(--mc-accent-soft)"
                : "var(--mc-bg-elevated)",
          }}
        >
          <div
            className="stat-label"
            style={{
              color: stats.inScadenzaCount > 0 ? "var(--mc-accent)" : undefined,
            }}
          >
            In scadenza
          </div>
          <div
            className="stat-value"
            style={{
              color: stats.inScadenzaCount > 0 ? "var(--mc-accent)" : undefined,
            }}
          >
            {formatEuro(stats.inScadenzaValue)}
          </div>
          <div className="stat-sub">
            {stats.inScadenzaCount}{" "}
            {stats.inScadenzaCount === 1 ? "preventivo" : "preventivi"} entro 7gg
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: "var(--mc-success-bg)",
            borderColor: "var(--mc-success-border)",
          }}
        >
          <div className="stat-label" style={{ color: "var(--mc-success)" }}>
            Acquisito
          </div>
          <div className="stat-value" style={{ color: "var(--mc-success)" }}>
            {formatEuro(stats.acquisitiValue)}
          </div>
          <div className="stat-sub">
            {stats.acquisitiCount}{" "}
            {stats.acquisitiCount === 1 ? "preventivo accettato" : "preventivi accettati"}
          </div>
        </div>
      </div>

      {/* Toolbar filtri + ricerca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((f) => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={{
                  background: isActive ? "var(--mc-text)" : "var(--mc-bg-elevated)",
                  color: isActive ? "var(--mc-text-inverse)" : "var(--mc-text-secondary)",
                  border: `1px solid ${isActive ? "var(--mc-text)" : "var(--mc-border)"}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--mc-text-muted)" }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input pl-9"
            placeholder="Cerca cliente o numero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabella preventivi */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--mc-text-muted)" }}>
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
              <span className="text-sm">Caricamento preventivi...</span>
            </div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center">
            {quotes.length === 0 ? (
              <>
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <p
                  className="text-base mb-1 font-semibold"
                  style={{ color: "var(--mc-text)" }}
                >
                  Nessun preventivo ancora
                </p>
                <p
                  className="text-sm italic mb-5"
                  style={{ color: "var(--mc-text-muted)" }}
                >
                  Crea il tuo primo preventivo per iniziare.
                </p>
                <Link href="/preventivi/nuovo" className="btn-primary">
                  + Crea il primo preventivo
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                  Nessun preventivo corrisponde ai filtri selezionati.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="btn-ghost mt-3"
                >
                  Azzera filtri
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Cliente</th>
                  {isAdmin && <th>Commerciale</th>}
                  <th>Creato</th>
                  <th>Scadenza</th>
                  <th className="text-right">Setup</th>
                  <th className="text-right">Canoni</th>
                  <th className="text-right">Primo anno</th>
                  <th>Stato</th>
                  <th className="w-8" aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => {
                  const days = daysUntil(q.expiresAt);
                  const isExpiring =
                    (q.status === "pending" || q.status === "inviato") &&
                    days <= 7 &&
                    days >= 0;
                  return (
                    <tr
                      key={q.id}
                      onClick={() => (window.location.href = `/preventivi/${q.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="font-mono text-xs">
                        <span
                          className="font-semibold"
                          style={{ color: "var(--mc-accent)" }}
                        >
                          {q.quoteNumber}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold">{q.clientName}</div>
                        {q.clientCompany && (
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: "var(--mc-text-muted)" }}
                          >
                            {q.clientCompany}
                          </div>
                        )}
                      </td>
                      {isAdmin && <td className="text-sm">{q.user.name}</td>}
                      <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {formatDate(q.createdAt)}
                      </td>
                      <td className="text-sm">
                        <div style={{ color: "var(--mc-text-secondary)" }}>
                          {formatDate(q.expiresAt)}
                        </div>
                        {isExpiring && (
                          <div
                            className="text-xs font-semibold mt-0.5"
                            style={{ color: "var(--mc-accent)" }}
                          >
                            {days === 0 ? "scade oggi" : `tra ${days} gg`}
                          </div>
                        )}
                      </td>
                      <td className="text-right text-sm tabular-nums">
                        {formatEuro(q.totalSetup)}
                      </td>
                      <td
                        className="text-right text-sm tabular-nums"
                        style={{ color: "var(--mc-text-secondary)" }}
                      >
                        {q.totalMonthly > 0 ? `${formatEuro(q.totalMonthly)}/m` : "—"}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatEuro(q.totalAnnual)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            statusLabels[q.status]?.class || "badge-pending"
                          }`}
                        >
                          <span className="badge-dot" />
                          {statusLabels[q.status]?.label || q.status}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ color: "var(--mc-text-muted)", fontSize: "16px" }}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer tabella: counter */}
        {!loading && filteredQuotes.length > 0 && (
          <div
            className="px-4 py-3 text-xs flex items-center justify-between"
            style={{
              borderTop: "1px solid var(--mc-border)",
              background: "var(--mc-bg-inset)",
              color: "var(--mc-text-muted)",
            }}
          >
            <span>
              {filteredQuotes.length === quotes.length
                ? `${quotes.length} ${quotes.length === 1 ? "preventivo" : "preventivi"}`
                : `${filteredQuotes.length} di ${quotes.length} preventivi`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
