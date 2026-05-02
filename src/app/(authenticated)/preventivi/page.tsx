"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FASE_OPTIONS,
  type FaseValue,
  deriveFase,
  fasePatch,
  faseToneStyle,
  getFaseOption,
} from "@/lib/fase";
import type { QuoteListItem } from "@/lib/types/quote";

type FaseFilterValue = FaseValue | "all";

const filterTabs: { value: FaseFilterValue; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "in_trattativa", label: "In trattativa" },
  { value: "won_not_started", label: "Acquisiti" },
  { value: "won_in_progress", label: "In corso" },
  { value: "won_done", label: "Completati" },
  { value: "lost", label: "Persi" },
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

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

/** Bozza = modificabile nel compositore; inviato = solo lettura nel dettaglio, duplica per varianti. */
function quoteStatoInfo(status: string): { label: string; isDraft: boolean } {
  const s = (status || "").toLowerCase();
  if (s === "draft" || s === "pending") return { label: "Bozza", isDraft: true };
  if (s === "sent") return { label: "Inviato", isDraft: false };
  if (s === "viewed") return { label: "Inviato · visto", isDraft: false };
  return { label: status || "—", isDraft: false };
}

export default function PreventiviPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [filter, setFilter] = useState<FaseFilterValue>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "admin";

  // Vedi commento in Navbar.tsx: token "?n=" per forzare il rimontaggio del
  // QuoteEditor in /preventivi/nuovo (così totali e voci vengono azzerati).
  function handleNuovoPreventivoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof e.button === "number" && e.button !== 0) return;
    e.preventDefault();
    router.push(`/preventivi/nuovo?n=${Date.now()}`);
  }

  useEffect(() => {
    fetchQuotes();

    // Ricarica automaticamente la lista quando:
    //  - la finestra/tab torna in primo piano,
    //  - la pagina viene mostrata da bfcache (browser back/forward),
    //  - una qualunque pagina dell'app dichiara di aver modificato un preventivo
    //    (es. cambio fase da /analisi). Vedi l'evento "mc:quote-updated".
    function maybeRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchQuotes();
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
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes");
      const raw = await res.text().catch(() => "");
      if (!res.ok) {
        let message = `Errore caricamento preventivi (HTTP ${res.status}).`;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.error) message = String(parsed.error);
          } catch {
            message = `${message} ${raw.slice(0, 220)}`;
          }
        }
        setQuotes([]);
        setError(message);
        return;
      }

      const data = raw ? JSON.parse(raw) : [];
      setQuotes(Array.isArray(data) ? data : []);
    } catch (e) {
      setQuotes([]);
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setLoading(false);
    }
  }

  function matchesFilter(quote: QuoteListItem) {
    if (filter === "all") return true;
    return deriveFase(quote) === filter;
  }

  // Filtro ricerca cliente / numero
  const filteredQuotes = useMemo(() => {
    const base = quotes.filter(matchesFilter);
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (quote) =>
        quote.clientName.toLowerCase().includes(q) ||
        quote.clientCompany?.toLowerCase().includes(q) ||
        quote.quoteNumber.toLowerCase().includes(q)
    );
  }, [quotes, search, filter]);

  // Stats per fase pipeline (sostituiscono i vecchi totali bozze/inviati/visualizzati,
  // così sono coerenti con quello che si modifica in Analisi).
  const stats = useMemo(() => {
    const inTrattativa = quotes.filter((q) => deriveFase(q) === "in_trattativa");
    const acquisiti = quotes.filter((q) => q.salesStage === "won");
    const persi = quotes.filter((q) => q.salesStage === "lost");
    return {
      total: quotes.length,
      totalValue: quotes.reduce((sum, q) => sum + q.totalAnnual, 0),
      inTrattativaCount: inTrattativa.length,
      inTrattativaValue: inTrattativa.reduce((sum, q) => sum + q.totalAnnual, 0),
      acquisitiCount: acquisiti.length,
      acquisitiValue: acquisiti.reduce((sum, q) => sum + q.totalAnnual, 0),
      persiCount: persi.length,
      persiValue: persi.reduce((sum, q) => sum + q.totalAnnual, 0),
    };
  }, [quotes]);

  async function changeFase(quoteId: string, next: FaseValue, currentWonAt: string | null) {
    setBusyId(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fasePatch(next, currentWonAt)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Errore aggiornamento fase (HTTP ${res.status}).`);
      }
      await fetchQuotes();
      // Avvisa eventuali altre pagine già montate (es. /analisi cached) che il
      // preventivo è cambiato, così quando ci tornerai vedrai lo stato aggiornato.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mc:quote-updated", { detail: { id: quoteId } })
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateQuote(quoteId: string) {
    const y = new Date().getFullYear();
    const ok = window.confirm(
      "Creare una nuova bozza uguale a questo preventivo? Le voci e gli importi saranno copiati; " +
        `il nuovo avrà il prossimo numero progressivo (formato Q${y}-####), diverso dall’originale, e sarà di nuovo in Bozza.`
    );
    if (!ok) return;
    setBusyId(quoteId);
    setError(null);
    try {
      const res = await fetch("/api/quotes/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : `Errore duplicazione (HTTP ${res.status}).`);
      }
      if (body && typeof body.id === "string") {
        router.push(`/preventivi/${body.id}`);
        return;
      }
      throw new Error("Risposta duplicazione non valida.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore inatteso");
    } finally {
      setBusyId(null);
    }
  }

  function cardStyle(isActive: boolean, tone?: "accent" | "danger" | "success") {
    if (!isActive) return undefined;
    if (tone === "success") {
      return { background: "var(--mc-success-bg)", borderColor: "var(--mc-success-border)" };
    }
    if (tone === "danger") {
      return { background: "var(--mc-danger-bg, rgba(185, 28, 28, 0.06))", borderColor: "var(--mc-danger, #b91c1c)" };
    }
    return { background: "var(--mc-accent-soft)", borderColor: "var(--mc-accent)" };
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl sm:text-4xl mb-1">I miei preventivi</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            {isAdmin
              ? "Visualizzazione admin: preventivi di tutti i commerciali."
              : "I preventivi che hai creato."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/preventivi/manuale" className="btn-secondary" title="Preventivo per servizi non standardizzati">
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
            Manuale
          </Link>
          <Link
            href="/preventivi/nuovo"
            onClick={handleNuovoPreventivoClick}
            className="btn-primary"
          >
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
      </div>

      {/* Stats cards: ora allineate alle FASI di Analisi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button
          type="button"
          className="stat-card text-left"
          onClick={() => setFilter("all")}
          style={cardStyle(filter === "all")}
        >
          <div className="stat-label">Totale preventivato</div>
          <div className="stat-value">{formatEuro(stats.totalValue)}</div>
          <div className="stat-sub">
            {stats.total} {stats.total === 1 ? "preventivo" : "preventivi"}
          </div>
        </button>

        <button
          type="button"
          className="stat-card text-left"
          onClick={() => setFilter("in_trattativa")}
          style={cardStyle(filter === "in_trattativa")}
        >
          <div className="stat-label">In trattativa</div>
          <div className="stat-value">{formatEuro(stats.inTrattativaValue)}</div>
          <div className="stat-sub">
            {stats.inTrattativaCount}{" "}
            {stats.inTrattativaCount === 1 ? "preventivo" : "preventivi"}
          </div>
        </button>

        <button
          type="button"
          className="stat-card text-left"
          onClick={() => setFilter("won_not_started")}
          style={cardStyle(filter === "won_not_started")}
        >
          <div className="stat-label" style={{ color: "#FF6A00" }}>
            Acquisiti
          </div>
          <div className="stat-value" style={{ color: "#FF6A00" }}>
            {formatEuro(stats.acquisitiValue)}
          </div>
          <div className="stat-sub">
            {stats.acquisitiCount}{" "}
            {stats.acquisitiCount === 1 ? "preventivo" : "preventivi"}
          </div>
        </button>

        <button
          type="button"
          className="stat-card text-left"
          onClick={() => setFilter("lost")}
          style={cardStyle(filter === "lost", "danger")}
        >
          <div className="stat-label" style={{ color: "var(--mc-danger, #b91c1c)" }}>
            Persi
          </div>
          <div className="stat-value" style={{ color: "var(--mc-danger, #b91c1c)" }}>
            {formatEuro(stats.persiValue)}
          </div>
          <div className="stat-sub">
            {stats.persiCount} {stats.persiCount === 1 ? "preventivo" : "preventivi"}
          </div>
        </button>
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
        {error && (
          <div className="p-4">
            <div className="alert alert-danger">{error}</div>
          </div>
        )}
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
                <Link
                  href="/preventivi/nuovo"
                  onClick={handleNuovoPreventivoClick}
                  className="btn-primary"
                >
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
                  <th className="whitespace-nowrap">Stato</th>
                  <th>Creato</th>
                  <th>Scadenza</th>
                  <th className="text-right">Setup</th>
                  <th className="text-right">Canoni</th>
                  <th className="text-right">Primo anno</th>
                  <th className="text-right">Costo 1° anno</th>
                  <th className="text-right">Margine 1° anno</th>
                  <th>Fase</th>
                  <th className="text-center w-24 text-xs font-semibold">Duplica</th>
                  <th className="text-center w-12 text-xs font-semibold" title="Scarica PDF">
                    PDF
                  </th>
                  <th className="w-8" aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => {
                  const fase = deriveFase(q);
                  const faseOpt = getFaseOption(fase);
                  const days = q.expiresAt ? daysUntil(q.expiresAt) : null;
                  // L'avviso "in scadenza" ha senso solo finché il preventivo è ancora aperto:
                  // se è già acquisito o perso non serve metterlo in evidenza.
                  const isExpiring =
                    fase === "in_trattativa" && days != null && days <= 7 && days >= 0;
                  const rowBusy = busyId === q.id;
                  const isManualQuote = q.kind === "MANUAL";
                  const stato = quoteStatoInfo(q.status);
                  return (
                    <tr
                      key={q.id}
                      onClick={(e) => {
                        // Evita di aprire il dettaglio se il click arriva dal select fase
                        // o dal suo wrapper "fase-cell".
                        const target = e.target as HTMLElement;
                        if (target.closest("[data-fase-cell],[data-pdf-cell],[data-dup-cell]")) return;
                        window.location.href = `/preventivi/${q.id}`;
                      }}
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
                      <td className="text-sm align-top">
                        <span
                          className="inline-block text-xs font-semibold px-2 py-0.5 rounded"
                          style={{
                            background: stato.isDraft ? "var(--mc-bg-elevated)" : "rgba(255,106,0,0.12)",
                            color: stato.isDraft ? "var(--mc-text-secondary)" : "#FF6A00",
                            border: `1px solid ${
                              stato.isDraft ? "var(--mc-border)" : "rgba(255,106,0,0.35)"
                            }`,
                          }}
                        >
                          {stato.label}
                        </span>
                        {!stato.isDraft && (
                          <div
                            className="text-[10px] mt-1 leading-tight max-w-[9rem]"
                            style={{ color: "var(--mc-text-muted)" }}
                          >
                            Non modificabile · usa Duplica per una bozza
                          </div>
                        )}
                      </td>
                      <td className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        {formatDate(q.createdAt)}
                      </td>
                      <td className="text-sm">
                        <div style={{ color: "var(--mc-text-secondary)" }}>
                          {q.expiresAt ? formatDate(q.expiresAt) : "—"}
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
                      <td className="text-right text-sm tabular-nums" style={{ color: "var(--mc-text-secondary)" }}>
                        {q.costAnnual > 0 ? formatEuro(q.costAnnual) : "—"}
                      </td>
                      <td className="text-right font-semibold tabular-nums" title={formatPct(q.marginPercentAnnual)}>
                        {q.marginAnnual !== 0 ? formatEuro(q.marginAnnual) : "—"}
                      </td>
                      <td data-fase-cell onClick={(e) => e.stopPropagation()}>
                        <select
                          className="input-row text-xs w-[12.5rem]"
                          value={fase}
                          disabled={rowBusy}
                          onChange={(e) =>
                            changeFase(q.id, e.target.value as FaseValue, q.wonAt)
                          }
                          onClick={(e) => e.stopPropagation()}
                          style={faseToneStyle(faseOpt.tone)}
                          title="Cambia fase del preventivo"
                          aria-label="Fase preventivo"
                        >
                          {FASE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className="text-center align-middle"
                        data-dup-cell
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!stato.isDraft ? (
                          <button
                            type="button"
                            className="text-xs font-semibold px-2 py-1 rounded-md transition-colors"
                            style={{
                              background: "var(--mc-bg-elevated)",
                              border: "1px solid var(--mc-border)",
                              color: "var(--mc-text)",
                            }}
                            disabled={rowBusy}
                            title="Apri una nuova bozza copia di questo preventivo"
                            onClick={() => void duplicateQuote(q.id)}
                          >
                            Duplica
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td
                        className="text-center"
                        data-pdf-cell
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isManualQuote ? (
                          <span
                            className="text-xs"
                            style={{ color: "var(--mc-text-muted)" }}
                            title="PDF non disponibile per preventivi manuali"
                          >
                            —
                          </span>
                        ) : (
                          <a
                            href={`/api/quotes/${q.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[var(--mc-bg-elevated)]"
                            style={{ color: "var(--mc-accent)" }}
                            title="Scarica / apri PDF"
                            aria-label={`Scarica PDF preventivo ${q.quoteNumber}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="12" y1="18" x2="12" y2="12" />
                              <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                          </a>
                        )}
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
