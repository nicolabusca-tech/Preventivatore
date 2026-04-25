"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  active: boolean;
  sortOrder: number;
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
  CANONI_CRM: "Canoni CRM",
  CANONI_AIVOCALE: "Canoni AI Vocale",
  CANONI_WA: "Canoni WhatsApp",
  ADS_GESTITE: "ADS Gestite",
  DCE: "Direzione Commerciale Esterna",
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

const typeLabels: Record<string, { label: string; class: string }> = {
  product: { label: "Standard", class: "bg-mc-orange text-white" },
  variant: { label: "Variante", class: "bg-blue-600 text-white" },
  bundle: { label: "Bundle", class: "bg-mc-green text-white" },
  canone: { label: "Canone", class: "bg-purple-600 text-white" },
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminListinoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(["FRONTEND", "01"])
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/preventivi");
      return;
    }
    fetchProducts();
  }, [session, status]);

  async function fetchProducts() {
    setLoading(true);
    const res = await fetch("/api/products?onlyActive=false");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  function startEdit(product: Product) {
    setEditing(product.id);
    setEditForm({
      name: product.name,
      positioning: product.positioning,
      price: product.price,
      priceLabel: product.priceLabel,
      objection: product.objection,
      response: product.response,
      active: product.active,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({});
  }

  async function saveEdit(productId: string) {
    setSaving(true);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Modifiche salvate.");
      setEditing(null);
      setEditForm({});
      fetchProducts();
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Errore nel salvataggio.");
    }
  }

  async function toggleActive(product: Product) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    if (res.ok) fetchProducts();
  }

  function toggleBlock(block: string) {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(block)) newSet.delete(block);
    else newSet.add(block);
    setExpandedBlocks(newSet);
  }

  // Raggruppa per blocco
  const productsByBlock = new Map<string, Product[]>();
  for (const block of blockOrder) productsByBlock.set(block, []);
  for (const p of products) {
    const list = productsByBlock.get(p.block) || [];
    list.push(p);
    productsByBlock.set(p.block, list);
  }

  if (status === "loading" || loading) {
    return <div className="text-center py-12 text-mc-muted">Caricamento listino...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl mb-1">Gestione listino</h1>
        <p className="text-mc-muted italic">
          Modifica prezzi, copy e obiezioni di tutti i prodotti. Le modifiche sono immediate nel preventivatore.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-mc-green text-mc-green px-4 py-2 rounded mb-4">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {blockOrder.map((block) => {
          const blockProducts = productsByBlock.get(block) || [];
          if (blockProducts.length === 0) return null;
          const isExpanded = expandedBlocks.has(block);

          return (
            <div key={block} className="border border-mc-border rounded overflow-hidden">
              <button
                onClick={() => toggleBlock(block)}
                className="w-full px-4 py-3 flex items-center justify-between bg-mc-beige-warm hover:bg-mc-border transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? "−" : "+"}</span>
                  <span className="font-semibold">{blockLabels[block]}</span>
                </div>
                <span className="text-xs text-mc-muted">{blockProducts.length} voci</span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-mc-border bg-white">
                  {blockProducts.map((p) => {
                    const isEditing = editing === p.id;

                    return (
                      <div key={p.id} className={`p-4 ${!p.active ? "opacity-50 bg-gray-50" : ""}`}>
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs text-mc-muted">{p.code}</span>
                              <span className={`badge ${typeLabels[p.type]?.class}`}>
                                {typeLabels[p.type]?.label}
                              </span>
                            </div>
                            <div>
                              <label className="label">Nome</label>
                              <input
                                type="text"
                                className="input"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Frase di posizionamento</label>
                              <textarea
                                rows={2}
                                className="input"
                                value={editForm.positioning || ""}
                                onChange={(e) => setEditForm({ ...editForm, positioning: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label">Prezzo (€ interi)</label>
                                <input
                                  type="number"
                                  className="input"
                                  value={editForm.price || 0}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })
                                  }
                                />
                              </div>
                              <div>
                                <label className="label">
                                  Label prezzo (opzionale, es. &quot;€ 2.497 + € 1.500&quot;)
                                </label>
                                <input
                                  type="text"
                                  className="input"
                                  value={editForm.priceLabel || ""}
                                  onChange={(e) => setEditForm({ ...editForm, priceLabel: e.target.value })}
                                  placeholder="Lascia vuoto per mostrare il prezzo numerico"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Obiezione attesa</label>
                              <textarea
                                rows={2}
                                className="input"
                                value={editForm.objection || ""}
                                onChange={(e) => setEditForm({ ...editForm, objection: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Risposta all&apos;obiezione</label>
                              <textarea
                                rows={3}
                                className="input"
                                value={editForm.response || ""}
                                onChange={(e) => setEditForm({ ...editForm, response: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                                className="btn-primary"
                              >
                                {saving ? "Salvataggio..." : "Salva modifiche"}
                              </button>
                              <button onClick={cancelEdit} className="btn-secondary">
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-mc-muted">{p.code}</span>
                                <span className={`badge ${typeLabels[p.type]?.class}`}>
                                  {typeLabels[p.type]?.label}
                                </span>
                                {!p.active && (
                                  <span className="badge bg-red-100 text-red-800">Disattivato</span>
                                )}
                              </div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-sm text-mc-muted italic mt-1">{p.positioning}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-lg text-mc-orange">
                                {p.priceLabel || formatEuro(p.price)}
                                {p.isMonthly && <span className="text-xs font-normal">/mese</span>}
                              </div>
                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={() => startEdit(p)}
                                  className="text-mc-orange hover:underline text-sm"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => toggleActive(p)}
                                  className="text-mc-muted hover:text-mc-orange text-sm"
                                >
                                  {p.active ? "Disattiva" : "Attiva"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-xs text-mc-muted italic">
        Nota: i campi &quot;Cosa include&quot; (bullet points) e la gestione dei prerequisiti/bundle non sono
        modificabili da interfaccia in questa versione. Per modifiche strutturali dei prodotti, contattare Claude
        per aggiornare il seed del database.
      </div>
    </div>
  );
}
