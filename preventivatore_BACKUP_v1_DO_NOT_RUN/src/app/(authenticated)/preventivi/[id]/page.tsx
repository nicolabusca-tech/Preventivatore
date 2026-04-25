"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type QuoteDetail = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  notes: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  user: { name: string; email: string };
  items: {
    id: string;
    productCode: string;
    productName: string;
    price: number;
    quantity: number;
    isMonthly: boolean;
  }[];
};

const statusOptions = [
  { value: "pending", label: "In attesa", class: "badge-pending" },
  { value: "inviato", label: "Inviato al cliente", class: "badge-sent" },
  { value: "accettato", label: "Accettato", class: "badge-accepted" },
  { value: "rifiutato", label: "Rifiutato", class: "badge-rejected" },
  { value: "scaduto", label: "Scaduto", class: "badge-expired" },
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
    month: "long",
    year: "numeric",
  });
}

export default function DettaglioPreventivoPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuote(data);
        setLoading(false);
      });
  }, [params.id]);

  async function updateStatus(newStatus: string) {
    if (!quote) return;
    setUpdating(true);
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuote({ ...quote, status: updated.status });
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!quote) return;
    if (!confirm("Sei sicuro di voler cancellare questo preventivo? L'azione è irreversibile.")) return;
    const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    if (res.ok) router.push("/preventivi");
  }

  if (loading) return <div className="text-center py-12 text-mc-muted">Caricamento...</div>;
  if (!quote) return <div className="text-center py-12 text-mc-red">Preventivo non trovato</div>;

  const setupItems = quote.items.filter((i) => !i.isMonthly);
  const monthlyItems = quote.items.filter((i) => i.isMonthly);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/preventivi" className="text-sm text-mc-muted hover:text-mc-orange mb-2 inline-block">
            ← Torna all&apos;elenco
          </Link>
          <h1 className="text-4xl mb-1">
            Preventivo <span className="font-mono text-mc-orange">{quote.quoteNumber}</span>
          </h1>
          <p className="text-mc-muted">
            Creato il {formatDate(quote.createdAt)} da {quote.user.name}
          </p>
        </div>
        <button onClick={handleDelete} className="btn-danger">
          Elimina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra - dettagli */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-mc-muted text-xs uppercase tracking-wider">Nome</div>
                <div className="font-semibold">{quote.clientName}</div>
              </div>
              {quote.clientCompany && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Azienda</div>
                  <div className="font-semibold">{quote.clientCompany}</div>
                </div>
              )}
              {quote.clientEmail && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Email</div>
                  <div className="font-semibold">{quote.clientEmail}</div>
                </div>
              )}
              {quote.clientPhone && (
                <div>
                  <div className="text-mc-muted text-xs uppercase tracking-wider">Telefono</div>
                  <div className="font-semibold">{quote.clientPhone}</div>
                </div>
              )}
            </div>
            {quote.clientNotes && (
              <div className="mt-4 pt-4 border-t border-mc-border">
                <div className="text-mc-muted text-xs uppercase tracking-wider mb-1">Note cliente</div>
                <p className="text-sm whitespace-pre-wrap">{quote.clientNotes}</p>
              </div>
            )}
          </div>

          {/* Voci */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Voci selezionate</h2>

            {setupItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-mc-muted uppercase tracking-wider mb-2">
                  Setup una tantum
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-mc-border">
                    {setupItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-sm">
                          <div className="font-semibold">{item.productName}</div>
                          <div className="text-xs text-mc-muted font-mono">{item.productCode}</div>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold">
                          {formatEuro(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {monthlyItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-mc-muted uppercase tracking-wider mb-2">
                  Canoni mensili
                </h3>
                <table className="w-full">
                  <tbody className="divide-y divide-mc-border">
                    {monthlyItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-sm">
                          <div className="font-semibold">{item.productName}</div>
                          <div className="text-xs text-mc-muted font-mono">{item.productCode}</div>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold">
                          {formatEuro(item.price)}/mese
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {quote.notes && (
            <div className="card p-6">
              <h2 className="text-2xl mb-4">Note interne</h2>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Colonna destra - riepilogo + stato */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold mb-1">
              Setup una tantum
            </div>
            <div className="text-2xl font-bold">{formatEuro(quote.totalSetup)}</div>

            {quote.totalMonthly > 0 && (
              <>
                <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold mt-4 mb-1">
                  Canoni mensili
                </div>
                <div className="text-2xl font-bold">{formatEuro(quote.totalMonthly)}/mese</div>
              </>
            )}

            <div className="border-t-2 border-mc-black pt-4 mt-4">
              <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">
                Totale primo anno
              </div>
              <div className="text-3xl font-bold text-mc-orange">{formatEuro(quote.totalAnnual)}</div>
              <div className="text-xs text-mc-muted mt-1">IVA esclusa</div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-3">Stato</h3>
            <div className="space-y-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  disabled={updating || quote.status === opt.value}
                  className={`w-full text-left px-3 py-2 rounded border-2 text-sm transition-colors ${
                    quote.status === opt.value
                      ? "border-mc-orange bg-orange-50 font-semibold"
                      : "border-mc-border hover:border-mc-orange"
                  }`}
                >
                  <span className={`badge ${opt.class} mr-2`}>{opt.label}</span>
                  {quote.status === opt.value && <span className="text-xs text-mc-orange">(attuale)</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">Scadenza</div>
            <div className="font-semibold">{formatDate(quote.expiresAt)}</div>
          </div>

          <div className="card p-6 bg-mc-beige-warm border-dashed">
            <h3 className="text-sm font-semibold mb-2">Funzionalità Step 2</h3>
            <p className="text-xs text-mc-muted">
              La generazione PDF e l&apos;invio email al cliente saranno disponibili nello Step 2 dello
              sviluppo. Per ora il preventivo è salvato e consultabile qui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
