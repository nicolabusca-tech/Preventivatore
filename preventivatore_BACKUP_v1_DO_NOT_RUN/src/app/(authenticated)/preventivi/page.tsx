"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, [filter]);

  async function fetchQuotes() {
    setLoading(true);
    const url = filter === "all" ? "/api/quotes" : `/api/quotes?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setQuotes(data);
    setLoading(false);
  }

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter((q) => q.status === "pending").length,
    accettati: quotes.filter((q) => q.status === "accettato").length,
    valoreTotale: quotes.reduce((sum, q) => sum + q.totalSetup, 0),
    valoreAcquisito: quotes
      .filter((q) => q.status === "accettato")
      .reduce((sum, q) => sum + q.totalSetup, 0),
    inScadenza: quotes.filter(
      (q) =>
        (q.status === "pending" || q.status === "inviato") &&
        daysUntil(q.expiresAt) <= 7 &&
        daysUntil(q.expiresAt) >= 0
    ).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl mb-1">I miei preventivi</h1>
          <p className="text-mc-muted italic">
            {session?.user?.role === "admin"
              ? "Visualizzazione admin: tutti i preventivi di tutti i commerciali"
              : "I preventivi che hai creato"}
          </p>
        </div>
        <Link href="/preventivi/nuovo" className="btn-primary">
          + Nuovo preventivo
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-sm text-mc-muted uppercase tracking-wider font-semibold">Totale</div>
          <div className="text-3xl font-bold mt-1">{stats.total}</div>
          <div className="text-xs text-mc-muted mt-1">preventivi</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mc-muted uppercase tracking-wider font-semibold">In attesa</div>
          <div className="text-3xl font-bold mt-1">{stats.pending}</div>
          <div className="text-xs text-mc-muted mt-1">da seguire</div>
        </div>
        <div className="card p-4 border-mc-orange">
          <div className="text-sm text-mc-orange uppercase tracking-wider font-semibold">In scadenza</div>
          <div className="text-3xl font-bold mt-1 text-mc-orange">{stats.inScadenza}</div>
          <div className="text-xs text-mc-muted mt-1">entro 7 giorni</div>
        </div>
        <div className="card p-4 bg-green-50 border-mc-green">
          <div className="text-sm text-mc-green uppercase tracking-wider font-semibold">Acquisito</div>
          <div className="text-2xl font-bold mt-1 text-mc-green">{formatEuro(stats.valoreAcquisito)}</div>
          <div className="text-xs text-mc-muted mt-1">{stats.accettati} accettati</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-mc-muted">Filtra:</span>
        {[
          { value: "all", label: "Tutti" },
          { value: "pending", label: "In attesa" },
          { value: "inviato", label: "Inviati" },
          { value: "accettato", label: "Accettati" },
          { value: "rifiutato", label: "Rifiutati" },
          { value: "scaduto", label: "Scaduti" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              filter === f.value
                ? "bg-mc-black text-white"
                : "bg-white border border-mc-border hover:border-mc-orange"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista preventivi */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-mc-muted">Caricamento...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-mc-muted italic mb-4">Nessun preventivo trovato.</p>
            <Link href="/preventivi/nuovo" className="btn-primary">
              Crea il primo preventivo
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-mc-beige-warm">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold">Numero</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Cliente</th>
                {session?.user?.role === "admin" && (
                  <th className="text-left px-4 py-3 text-sm font-semibold">Commerciale</th>
                )}
                <th className="text-left px-4 py-3 text-sm font-semibold">Data creazione</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Scadenza</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Setup</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Canoni/mese</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Stato</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const days = daysUntil(q.expiresAt);
                const isExpiring = (q.status === "pending" || q.status === "inviato") && days <= 7 && days >= 0;
                return (
                  <tr
                    key={q.id}
                    className="border-t border-mc-border hover:bg-mc-beige-warm transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      <Link href={`/preventivi/${q.id}`} className="text-mc-orange hover:underline">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{q.clientName}</div>
                      {q.clientCompany && (
                        <div className="text-xs text-mc-muted">{q.clientCompany}</div>
                      )}
                    </td>
                    {session?.user?.role === "admin" && (
                      <td className="px-4 py-3 text-sm">{q.user.name}</td>
                    )}
                    <td className="px-4 py-3 text-sm">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{formatDate(q.expiresAt)}</div>
                      {isExpiring && (
                        <div className="text-xs text-mc-orange font-semibold">
                          {days === 0 ? "scade oggi" : `tra ${days} gg`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatEuro(q.totalSetup)}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {q.totalMonthly > 0 ? formatEuro(q.totalMonthly) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusLabels[q.status]?.class || "badge-pending"}`}>
                        {statusLabels[q.status]?.label || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/preventivi/${q.id}`} className="text-mc-orange hover:underline text-sm">
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
