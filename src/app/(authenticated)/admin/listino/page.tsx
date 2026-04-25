"use client";

import { useEffect, useState, useMemo } from "react";
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

type ProductTypeMeta = {
  label: string;
  bg: string;
  color: string;
  border: string;
};

const typeMeta: Record<string, ProductTypeMeta> = {
  product: {
    label: "Standard",
    bg: "var(--mc-accent-soft)",
    color: "var(--mc-accent)",
    border: "var(--mc-accent-ring)",
  },
  variant: {
    label: "Variante",
    bg: "var(--mc-info-bg)",
    color: "var(--mc-info)",
    border: "var(--mc-info-border)",
  },
  bundle: {
    label: "Bundle",
    bg: "var(--mc-success-bg)",
    color: "var(--mc-success)",
    border: "var(--mc-success-border)",
  },
  canone: {
    label: "Canone",
    bg: "var(--mc-warning-bg)",
    color: "var(--mc-warning)",
    border: "var(--mc-warning-border)",
  },
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
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function fetchProducts() {
    setLoading(true);
    const res = await fetch("/api/products?onlyActive=false");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
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
    setMessage(null);
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
      setMessage({ type: "success", text: "Modifiche salvate." });
      setEditing(null);
      setEditForm({});
      fetchProducts();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "danger", text: "Errore nel salvataggio." });
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

  function expandAll() {
    setExpandedBlocks(new Set(blockOrder));
  }

  function collapseAll() {
    setExpandedBlocks(new Set());
  }

  // Filtro ricerca + inattivi
  const filteredProducts = useMemo(() => {
    let result = products;
    if (!showInactive) {
      result = result.filter((p) => p.active);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.positioning.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, showInactive, search]);

  // Auto-espandi blocchi che contengono risultati di ricerca
  useEffect(() => {
    if (search.trim()) {
      const blocksWithMatches = new Set(filteredProducts.map((p) => p.block));
      setExpandedBlocks((prev) => {
        const next = new Set(prev);
        blocksWithMatches.forEach((b) => next.add(b));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Raggruppa per blocco
  const productsByBlock = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const block of blockOrder) map.set(block, []);
    for (const p of filteredProducts) {
      const list = map.get(p.block) || [];
      list.push(p);
      map.set(p.block, list);
    }
    return map;
  }, [filteredProducts]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.active).length,
      inactive: products.filter((p) => !p.active).length,
      filtered: filteredProducts.length,
    };
  }, [products, filteredProducts]);

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
          <span className="text-sm">Caricamento listino...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-4xl mb-1">Gestione listino</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            Modifica prezzi, copy e obiezioni dei prodotti. Le modifiche sono
            immediate nel preventivatore.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--mc-text-muted)" }}>
          <span>
            <strong style={{ color: "var(--mc-text)" }}>{stats.active}</strong>{" "}
            attivi
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong style={{ color: "var(--mc-text)" }}>{stats.inactive}</strong>{" "}
            disattivati
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong style={{ color: "var(--mc-text)" }}>{stats.total}</strong>{" "}
            totali
          </span>
        </div>
      </div>

      {/* Toast messaggio */}
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
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
          <span>{message.text}</span>
        </div>
      )}

      {/* Toolbar: ricerca + toggle inattivi + espandi/comprimi */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-md">
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
            placeholder="Cerca per nome, codice o posizionamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label
          className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
          style={{ color: "var(--mc-text-secondary)" }}
        >
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="checkbox"
          />
          Mostra disattivati
        </label>

        <div className="flex items-center gap-1 ml-auto sm:ml-0">
          <button type="button" onClick={expandAll} className="btn-ghost">
            Espandi tutti
          </button>
          <button type="button" onClick={collapseAll} className="btn-ghost">
            Comprimi tutti
          </button>
        </div>
      </div>

      {/* Lista blocchi */}
      {filteredProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm" style={{ color: "var(--mc-text-muted)" }}>
            Nessun prodotto corrisponde ai filtri.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setShowInactive(true);
            }}
            className="btn-ghost mt-3"
          >
            Azzera filtri
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {blockOrder.map((block) => {
            const blockProducts = productsByBlock.get(block) || [];
            if (blockProducts.length === 0) return null;
            const isExpanded = expandedBlocks.has(block);
            const activeCount = blockProducts.filter((p) => p.active).length;

            return (
              <div
                key={block}
                className="rounded-lg overflow-hidden"
                style={{
                  background: "var(--mc-bg-elevated)",
                  border: "1px solid var(--mc-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleBlock(block)}
                  className="w-full px-4 py-3 flex items-center justify-between transition-colors"
                  style={{ background: "var(--mc-bg-inset)" }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                        transition: "transform 0.15s ease",
                        color: "var(--mc-text-secondary)",
                      }}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span className="font-semibold text-sm">{blockLabels[block]}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                    {activeCount} di {blockProducts.length}{" "}
                    {blockProducts.length === 1 ? "voce" : "voci"} attiv
                    {activeCount === 1 ? "a" : "e"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="divide-mc">
                    {blockProducts.map((p) => {
                      const isEditing = editing === p.id;
                      const meta = typeMeta[p.type] || typeMeta.product;

                      return (
                        <div
                          key={p.id}
                          className="p-4"
                          style={{
                            opacity: p.active ? 1 : 0.55,
                            background: isEditing
                              ? "var(--mc-bg-selected)"
                              : "transparent",
                          }}
                        >
                          {isEditing ? (
                            // ============ MODALITÀ EDIT ============
                            <div className="space-y-3 animate-fade-in">
                              <div className="flex items-center gap-2 flex-wrap mb-3">
                                <span
                                  className="font-mono text-xs px-2 py-0.5 rounded"
                                  style={{
                                    background: "var(--mc-bg-inset)",
                                    color: "var(--mc-text-secondary)",
                                  }}
                                >
                                  {p.code}
                                </span>
                                <span
                                  className="badge"
                                  style={{
                                    background: meta.bg,
                                    color: meta.color,
                                    border: `1px solid ${meta.border}`,
                                  }}
                                >
                                  {meta.label}
                                </span>
                                {p.isMonthly && (
                                  <span className="badge badge-sent">Mensile</span>
                                )}
                              </div>

                              <div>
                                <label className="label">Nome</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={editForm.name || ""}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, name: e.target.value })
                                  }
                                />
                              </div>

                              <div>
                                <label className="label">Frase di posizionamento</label>
                                <textarea
                                  rows={2}
                                  className="input"
                                  value={editForm.positioning || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      positioning: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="label">Prezzo (€ interi)</label>
                                  <input
                                    type="number"
                                    className="input"
                                    value={editForm.price ?? 0}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        price: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="label">
                                    Label prezzo (opzionale)
                                  </label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={editForm.priceLabel || ""}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        priceLabel: e.target.value,
                                      })
                                    }
                                    placeholder='Vuoto = mostra prezzo numerico (es. "€2.497 + €1.500")'
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="label">Obiezione attesa</label>
                                <textarea
                                  rows={2}
                                  className="input"
                                  value={editForm.objection || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      objection: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <label className="label">
                                  Risposta all&apos;obiezione
                                </label>
                                <textarea
                                  rows={3}
                                  className="input"
                                  value={editForm.response || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      response: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(p.id)}
                                  disabled={saving}
                                  className="btn-primary"
                                >
                                  {saving ? "Salvataggio..." : "Salva modifiche"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="btn-ghost"
                                  disabled={saving}
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            // ============ MODALITÀ READ ============
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span
                                    className="font-mono text-xs px-2 py-0.5 rounded"
                                    style={{
                                      background: "var(--mc-bg-inset)",
                                      color: "var(--mc-text-secondary)",
                                    }}
                                  >
                                    {p.code}
                                  </span>
                                  <span
                                    className="badge"
                                    style={{
                                      background: meta.bg,
                                      color: meta.color,
                                      border: `1px solid ${meta.border}`,
                                    }}
                                  >
                                    {meta.label}
                                  </span>
                                  {p.isMonthly && (
                                    <span className="badge badge-sent">Mensile</span>
                                  )}
                                  {!p.active && (
                                    <span className="badge badge-rejected">
                                      Disattivato
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold">{p.name}</div>
                                <div
                                  className="text-sm italic mt-0.5"
                                  style={{ color: "var(--mc-text-secondary)" }}
                                >
                                  {p.positioning}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div
                                  className="font-bold text-lg tabular-nums"
                                  style={{ color: "var(--mc-accent)" }}
                                >
                                  {p.priceLabel || formatEuro(p.price)}
                                  {p.isMonthly && (
                                    <span className="text-xs font-normal">
                                      /mese
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 mt-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(p)}
                                    className="btn-ghost text-xs px-2 py-1"
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleActive(p)}
                                    className="btn-ghost text-xs px-2 py-1"
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
      )}

      <div
        className="mt-6 text-xs italic"
        style={{ color: "var(--mc-text-muted)" }}
      >
        Nota: i campi &quot;Cosa include&quot; (bullet points), prerequisiti e
        struttura bundle non sono modificabili da interfaccia. Per modifiche
        strutturali ai prodotti, contattare Claude per aggiornare il seed del
        database.
      </div>
    </div>
  );
}
