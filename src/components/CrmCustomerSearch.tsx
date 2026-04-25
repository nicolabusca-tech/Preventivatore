"use client";

import { useState, useEffect, useRef } from "react";

export type CrmCustomer = {
  crmId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  vat: string;
  sdi: string;
};

type Props = {
  onSelect: (customer: CrmCustomer) => void;
};

/**
 * Campo di ricerca cliente nel CRM Metodo Cantiere.
 * Debounce 350ms, mostra lista risultati in dropdown.
 * Chiamata server-side (la chiave API resta nel .env).
 */
export function CrmCustomerSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Debounce ricerca
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query.trim());
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function doSearch(q: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/crm/customers/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nella ricerca");
        setResults([]);
      } else {
        setResults(data.results || []);
      }
      setOpen(true);
    } catch {
      setError("Errore di connessione");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePick(c: CrmCustomer) {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
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
          className="input pl-9 pr-9"
          placeholder="Cerca cliente nel CRM (nome, azienda, email...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <svg
            className="animate-spin absolute right-3 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ color: "var(--mc-accent)" }}
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
      </div>

      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--mc-danger)" }}>
          {error}
        </p>
      )}

      {open && results.length > 0 && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-lg overflow-hidden animate-fade-in max-h-80 overflow-y-auto"
          style={{
            background: "var(--mc-bg-elevated)",
            border: "1px solid var(--mc-border-strong)",
            boxShadow: "var(--mc-shadow-lg)",
          }}
        >
          {results.map((c) => (
            <button
              key={c.crmId}
              type="button"
              onClick={() => handlePick(c)}
              className="w-full text-left px-4 py-3 transition-colors block"
              style={{
                borderBottom: "1px solid var(--mc-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--mc-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {c.fullName || "(senza nome)"}
                  </div>
                  {c.company && (
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--mc-text-secondary)" }}
                    >
                      {c.company}
                    </div>
                  )}
                  <div
                    className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5"
                    style={{ color: "var(--mc-text-muted)" }}
                  >
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.city && c.province && (
                      <span>
                        {c.city} ({c.province})
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: "var(--mc-text-muted)" }}
                >
                  #{c.crmId}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && !error && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-lg p-4 animate-fade-in"
          style={{
            background: "var(--mc-bg-elevated)",
            border: "1px solid var(--mc-border)",
            boxShadow: "var(--mc-shadow)",
          }}
        >
          <p
            className="text-sm text-center"
            style={{ color: "var(--mc-text-muted)" }}
          >
            Nessun cliente trovato per &quot;{query}&quot;.
          </p>
          <p
            className="text-xs text-center mt-1"
            style={{ color: "var(--mc-text-muted)" }}
          >
            Compila i dati a mano qui sotto.
          </p>
        </div>
      )}
    </div>
  );
}
