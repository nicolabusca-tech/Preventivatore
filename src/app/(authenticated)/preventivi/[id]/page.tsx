"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Product = {
  id: string;
  code: string;
  name: string;
  price: number;
  isMonthly: boolean;
};

type QuoteItem = {
  id: string;
  // Supporta sia il vecchio shape UI che lo shape Prisma (QuoteItem)
  name?: string;
  productName?: string;
  productCode?: string;
  quantity: number;
  // vecchi campi (se presenti)
  priceSetup?: number;
  priceMonthly?: number;
  // campi Prisma
  price?: number;
  isMonthly: boolean;
};

type QuoteDetail = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  dceProductId?: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  items: QuoteItem[];
};

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PreventivoDettaglioPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [dceOptions, setDceOptions] = useState<Product[]>([]);
  const [savingDce, setSavingDce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    setLoading(true);
    setError(null);

    Promise.all([fetch(`/api/quotes/${id}`), fetch("/api/products")])
      .then(async ([quoteRes, productsRes]) => {
        if (!quoteRes.ok) {
          const body = await quoteRes.json().catch(() => null);
          const message =
            (body && typeof body.error === "string" && body.error) ||
            `Errore caricamento preventivo (HTTP ${quoteRes.status})`;
          throw new Error(message);
        }
        const quoteData = await quoteRes.json();
        const productsData = await productsRes.json().catch(() => []);
        return { quoteData, productsData };
      })
      .then(({ quoteData, productsData }) => {
        if (!alive) return;
        setQuote(quoteData);
        const opts: Product[] = Array.isArray(productsData) ? productsData : [];
        setDceOptions(
          opts
            .filter((p) => DCE_ALLOWED_CODES.includes((p as any).code))
            .filter((p) => (p as any).isMonthly)
            .sort((a, b) => (a.price || 0) - (b.price || 0))
        );
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setQuote(null);
        setError(e instanceof Error ? e.message : "Errore inatteso");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const items = useMemo(() => quote?.items ?? [], [quote]);
  const canExportPdf = !!id && !loading && !!quote?.dceProductId;

  const rows = useMemo(() => {
    return items.map((it) => {
      const quantity = Number.isFinite(it.quantity) ? it.quantity : 1;
      const unitPrice = typeof it.price === "number" ? it.price : 0;

      const setupAmount =
        typeof it.priceSetup === "number"
          ? it.priceSetup
          : it.isMonthly
            ? 0
            : unitPrice * quantity;

      const monthlyAmount =
        typeof it.priceMonthly === "number"
          ? it.priceMonthly
          : it.isMonthly
            ? unitPrice * quantity
            : 0;

      return {
        id: it.id,
        name: it.name ?? it.productName ?? "Voce",
        quantity,
        isMonthly: it.isMonthly,
        setupAmount,
        monthlyAmount,
      };
    });
  }, [items]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <div className="text-sm font-mono" style={{ color: "var(--mc-text-muted)" }}>
            {quote?.quoteNumber ?? "Preventivo"}
          </div>
          <h1 className="text-3xl mb-1">
            {quote?.clientName ?? (loading ? "Caricamento..." : "Preventivo")}
          </h1>
          {quote?.clientCompany && (
            <div className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
              {quote.clientCompany}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/preventivi" className="btn-ghost">
            ← Indietro
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!id) return;
              window.open(`/api/quotes/${id}/pdf`, "_blank", "noopener,noreferrer");
            }}
            disabled={!canExportPdf}
            title={
              !quote?.dceProductId
                ? "Seleziona prima il livello DCE: senza regia il sistema non parte."
                : undefined
            }
          >
            Stampa / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-sm" style={{ color: "var(--mc-text-muted)" }}>
          Caricamento preventivo…
        </div>
      ) : error ? (
        <div className="card p-8">
          <div className="text-sm font-semibold" style={{ color: "var(--mc-danger)" }}>
            {error}
          </div>
        </div>
      ) : !quote ? (
        <div className="card p-8 text-sm" style={{ color: "var(--mc-text-muted)" }}>
          Preventivo non trovato.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {!quote.dceProductId && (
            <div className="card p-5 lg:col-span-3">
              <div className="text-sm font-semibold mb-2">Preventivo incompleto</div>
              <div className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                Seleziona prima il livello DCE: senza regia il sistema non parte.
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                  className="input"
                  value={quote.dceProductId ?? ""}
                  onChange={async (e) => {
                    if (!id) return;
                    const nextId = e.target.value;
                    if (!nextId) return;
                    setSavingDce(true);
                    setError(null);
                    try {
                      const res = await fetch(`/api/quotes/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ dceProductId: nextId }),
                      });
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(body?.error || "Errore aggiornamento DCE");
                      setQuote(body);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Errore aggiornamento DCE");
                    } finally {
                      setSavingDce(false);
                    }
                  }}
                  disabled={savingDce || dceOptions.length === 0}
                >
                  <option value="">Seleziona livello DCE…</option>
                  {dceOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatEuro(p.price)}/mese
                    </option>
                  ))}
                </select>
                {savingDce && (
                  <span className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                    Salvataggio…
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="card p-5 lg:col-span-2">
            <div className="text-sm font-semibold mb-3">Voci</div>
            {items.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
                Nessuna voce.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Voce</th>
                      <th className="text-right">Q.tà</th>
                      <th className="text-right">Setup</th>
                      <th className="text-right">Canone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((it) => (
                      <tr key={it.id}>
                        <td className="font-semibold">{it.name}</td>
                        <td className="text-right tabular-nums">{it.quantity}</td>
                        <td className="text-right tabular-nums">{formatEuro(it.setupAmount)}</td>
                        <td className="text-right tabular-nums">
                          {it.isMonthly ? `${formatEuro(it.monthlyAmount)}/m` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold mb-3">Totali</div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span style={{ color: "var(--mc-text-secondary)" }}>Setup</span>
              <span className="font-semibold tabular-nums">{formatEuro(quote.totalSetup)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span style={{ color: "var(--mc-text-secondary)" }}>Canoni</span>
              <span className="font-semibold tabular-nums">
                {quote.totalMonthly > 0 ? `${formatEuro(quote.totalMonthly)}/m` : "—"}
              </span>
            </div>
            <div
              className="flex items-center justify-between text-sm pt-3 mt-3"
              style={{ borderTop: "1px solid var(--mc-border)" }}
            >
              <span style={{ color: "var(--mc-text-secondary)" }}>Primo anno</span>
              <span className="text-lg font-semibold tabular-nums">{formatEuro(quote.totalAnnual)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
