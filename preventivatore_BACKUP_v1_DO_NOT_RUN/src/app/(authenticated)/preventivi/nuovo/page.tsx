"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  code: string;
  name: string;
  block: string;
  type: string;
  positioning: string;
  includes: string;
  objection: string | null;
  response: string | null;
  price: number;
  priceLabel: string | null;
  isMonthly: boolean;
  prerequisites: string | null;
  bundleItems: string | null;
  active: boolean;
};

const blockLabels: Record<string, string> = {
  FRONTEND: "Front-end",
  "01": "Blocco 01 — Posizionamento",
  "02": "Blocco 02 — Tecnologia CRM",
  "03": "Blocco 03 — Acquisizione",
  "04": "Blocco 04 — Automazioni",
  "06": "Blocco 06 — Direzione e Coaching",
  "07": "Blocco 07 — Consulenza Nicola Busca",
  MEGABUNDLE: "Mega-bundle",
  CANONI_CRM: "Canoni CRM (mensili)",
  CANONI_AIVOCALE: "Canoni AI Vocale (mensili)",
  CANONI_WA: "Canoni WhatsApp (mensili)",
  ADS_GESTITE: "ADS Gestite (mensili)",
  DCE: "Direzione Commerciale Esterna (mensili)",
};

const blockOrder = [
  "FRONTEND",
  "01",
  "02",
  "03",
  "04",
  "06",
  "07",
  "MEGABUNDLE",
  "CANONI_CRM",
  "CANONI_AIVOCALE",
  "CANONI_WA",
  "ADS_GESTITE",
  "DCE",
];

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function NuovoPreventivoPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Dati cliente
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Selezione voci: Map<productCode, quantity>
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [sconto20Annuale, setSconto20Annuale] = useState(true);

  // Note e scadenza
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);

  // UI state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(["FRONTEND", "01", "02"])
  );
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  function toggleProduct(code: string) {
    const newSelected = new Map(selected);
    if (newSelected.has(code)) newSelected.delete(code);
    else newSelected.set(code, 1);
    setSelected(newSelected);
  }

  function updateQuantity(code: string, qty: number) {
    const newSelected = new Map(selected);
    if (qty <= 0) newSelected.delete(code);
    else newSelected.set(code, qty);
    setSelected(newSelected);
  }

  function toggleBlock(block: string) {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(block)) newSet.delete(block);
    else newSet.add(block);
    setExpandedBlocks(newSet);
  }

  function toggleDetails(code: string) {
    const newSet = new Set(expandedDetails);
    if (newSet.has(code)) newSet.delete(code);
    else newSet.add(code);
    setExpandedDetails(newSet);
  }

  // Raggruppa prodotti per blocco
  const productsByBlock = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const block of blockOrder) map.set(block, []);
    for (const p of products) {
      const list = map.get(p.block) || [];
      list.push(p);
      map.set(p.block, list);
    }
    return map;
  }, [products]);

  // Calcolo totali
  const totals = useMemo(() => {
    let setup = 0;
    let monthly = 0;
    const crmCanoni: { price: number; qty: number }[] = [];
    const otherMonthly: { price: number; qty: number }[] = [];

    for (const [code, qty] of selected.entries()) {
      const product = products.find((p) => p.code === code);
      if (!product) continue;

      const itemTotal = product.price * qty;
      if (product.isMonthly) {
        monthly += itemTotal;
        if (product.block === "CANONI_CRM") crmCanoni.push({ price: product.price, qty });
        else otherMonthly.push({ price: product.price, qty });
      } else {
        setup += itemTotal;
      }
    }

    // Calcolo annuale: canoni CRM con sconto 20% se applicato, altri canoni x12
    const crmMonthlyTotal = crmCanoni.reduce((s, c) => s + c.price * c.qty, 0);
    const otherMonthlyTotal = otherMonthly.reduce((s, c) => s + c.price * c.qty, 0);
    const crmAnnuale = sconto20Annuale ? Math.round(crmMonthlyTotal * 12 * 0.8) : crmMonthlyTotal * 12;
    const annual = setup + crmAnnuale + otherMonthlyTotal * 12;

    return {
      setup,
      monthly,
      annual,
      crmMonthlyTotal,
      otherMonthlyTotal,
      crmAnnuale,
      scontoCrmAnnuale: sconto20Annuale ? crmMonthlyTotal * 12 * 0.2 : 0,
    };
  }, [selected, products, sconto20Annuale]);

  async function handleSubmit() {
    if (!clientName.trim()) {
      setError("Il nome del cliente è obbligatorio");
      return;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una voce");
      return;
    }

    setError("");
    setSaving(true);

    const items = Array.from(selected.entries()).map(([code, quantity]) => {
      const p = products.find((pr) => pr.code === code)!;
      return {
        productCode: code,
        productName: p.name,
        price: p.price,
        quantity,
        isMonthly: p.isMonthly,
      };
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const res = await fetch("/api/quotes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientCompany: clientCompany || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientNotes: clientNotes || null,
        items,
        notes: notes || null,
        expiresAt,
        totalSetup: totals.setup,
        totalMonthly: totals.monthly,
        totalAnnual: totals.annual,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const quote = await res.json();
      router.push(`/preventivi/${quote.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Errore nel salvataggio");
    }
  }

  if (loading) return <div className="text-center py-12 text-mc-muted">Caricamento listino...</div>;

  return (
    <div>
      <h1 className="text-4xl mb-1">Nuovo preventivo</h1>
      <p className="text-mc-muted italic mb-8">
        Componi il preventivo durante la call con il cliente. Il totale si aggiorna in tempo reale.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra - composizione */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dati cliente */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Mario Rossi"
                />
              </div>
              <div>
                <label className="label">Azienda</label>
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
              <div className="md:col-span-2">
                <label className="label">Note cliente</label>
                <textarea
                  className="input"
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Contesto, esigenze emerse in call, riferimenti..."
                />
              </div>
            </div>
          </div>

          {/* Listino */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Componi l&apos;offerta</h2>

            <div className="space-y-3">
              {blockOrder.map((block) => {
                const blockProducts = productsByBlock.get(block) || [];
                if (blockProducts.length === 0) return null;
                const isExpanded = expandedBlocks.has(block);
                const selectedInBlock = blockProducts.filter((p) => selected.has(p.code)).length;

                return (
                  <div key={block} className="border border-mc-border rounded overflow-hidden">
                    <button
                      onClick={() => toggleBlock(block)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-mc-beige-warm hover:bg-mc-border transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{isExpanded ? "−" : "+"}</span>
                        <span className="font-semibold">{blockLabels[block]}</span>
                        {selectedInBlock > 0 && (
                          <span className="badge bg-mc-orange text-white">{selectedInBlock}</span>
                        )}
                      </div>
                      <span className="text-xs text-mc-muted">{blockProducts.length} voci</span>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-mc-border">
                        {blockProducts.map((p) => {
                          const isSelected = selected.has(p.code);
                          const qty = selected.get(p.code) || 0;
                          const showDetails = expandedDetails.has(p.code);
                          const includesArr = JSON.parse(p.includes) as string[];

                          return (
                            <div
                              key={p.id}
                              className={`p-4 transition-colors ${
                                isSelected ? "bg-orange-50" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProduct(p.code)}
                                  className="mt-1 h-5 w-5 accent-mc-orange cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="font-semibold">{p.name}</div>
                                      <div className="text-sm text-mc-muted italic mt-0.5">{p.positioning}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-bold text-lg text-mc-orange">
                                        {p.priceLabel || formatEuro(p.price)}
                                        {p.isMonthly && <span className="text-xs font-normal">/mese</span>}
                                      </div>
                                      {p.type === "bundle" && (
                                        <div className="text-xs text-mc-green font-semibold">BUNDLE</div>
                                      )}
                                      {p.type === "variant" && (
                                        <div className="text-xs text-blue-600 font-semibold">VARIANTE</div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => toggleDetails(p.code)}
                                    className="text-xs text-mc-orange hover:underline mt-2"
                                  >
                                    {showDetails ? "Nascondi dettagli" : "Mostra dettagli"}
                                  </button>

                                  {showDetails && (
                                    <div className="mt-3 p-3 bg-white rounded border border-mc-border text-sm space-y-2">
                                      <div>
                                        <div className="font-semibold text-mc-orange text-xs uppercase tracking-wider">
                                          Cosa include
                                        </div>
                                        <ul className="mt-1 space-y-1">
                                          {includesArr.map((item, i) => (
                                            <li key={i} className="flex gap-2">
                                              <span className="text-mc-orange">•</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      {p.objection && p.response && (
                                        <div className="mt-3 p-3 bg-red-50 border-l-4 border-mc-red rounded">
                                          <div className="font-semibold text-mc-red text-xs uppercase tracking-wider">
                                            Obiezione + Risposta
                                          </div>
                                          <div className="italic mt-1">&quot;{p.objection}&quot;</div>
                                          <div className="mt-1">
                                            <span className="font-semibold">Risposta:</span> {p.response}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isSelected && p.isMonthly && (
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                      <span className="text-mc-muted">Mesi:</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) =>
                                          updateQuantity(p.code, parseInt(e.target.value) || 1)
                                        }
                                        className="w-20 px-2 py-1 border border-mc-border rounded text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note e scadenza */}
          <div className="card p-6">
            <h2 className="text-2xl mb-4">Scadenza e note</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Validità preventivo (giorni)</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-mc-muted mt-1">
                  Scadenza: {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString("it-IT")}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Note interne (non visibili al cliente)</label>
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note operative, promemoria follow-up, condizioni speciali..."
              />
            </div>
          </div>
        </div>

        {/* Colonna destra - riepilogo sticky */}
        <div className="lg:col-span-1">
          <div className="card p-6 lg:sticky lg:top-4">
            <h2 className="text-2xl mb-4">Riepilogo</h2>

            {selected.size === 0 ? (
              <p className="text-mc-muted italic text-sm">Seleziona le voci dal listino.</p>
            ) : (
              <>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {Array.from(selected.entries()).map(([code, qty]) => {
                    const p = products.find((pr) => pr.code === code);
                    if (!p) return null;
                    return (
                      <div key={code} className="flex justify-between text-sm py-1">
                        <span className="flex-1 pr-2">
                          {p.name}
                          {p.isMonthly && qty > 1 && <span className="text-mc-muted"> × {qty} mesi</span>}
                        </span>
                        <span className="font-semibold shrink-0">
                          {p.priceLabel ||
                            formatEuro(p.isMonthly ? p.price : p.price * qty) + (p.isMonthly ? "/m" : "")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-mc-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Setup una tantum</span>
                    <span className="font-semibold">{formatEuro(totals.setup)}</span>
                  </div>
                  {totals.monthly > 0 && (
                    <div className="flex justify-between">
                      <span>Canoni mensili totali</span>
                      <span className="font-semibold">{formatEuro(totals.monthly)}/mese</span>
                    </div>
                  )}
                  {totals.crmMonthlyTotal > 0 && (
                    <div className="flex items-start justify-between gap-2 pt-2 border-t border-mc-border">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sconto20Annuale}
                          onChange={(e) => setSconto20Annuale(e.target.checked)}
                          className="mt-0.5 accent-mc-orange"
                        />
                        <span className="text-xs">
                          Canoni CRM pagati annualmente (sconto 20%)
                        </span>
                      </label>
                      {sconto20Annuale && (
                        <span className="text-xs text-mc-green font-semibold">
                          -{formatEuro(totals.scontoCrmAnnuale)}/anno
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-mc-black pt-4 mt-4">
                  <div className="text-xs text-mc-muted uppercase tracking-wider font-semibold">
                    Totale primo anno
                  </div>
                  <div className="text-3xl font-bold text-mc-orange">{formatEuro(totals.annual)}</div>
                  <div className="text-xs text-mc-muted mt-1">IVA esclusa</div>
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-mc-red text-mc-red px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || selected.size === 0}
              className="btn-primary w-full mt-4"
            >
              {saving ? "Salvataggio..." : "Salva preventivo"}
            </button>

            <p className="text-xs text-mc-muted mt-3 text-center">
              Dopo il salvataggio potrai rigenerare il PDF (Step 2).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
