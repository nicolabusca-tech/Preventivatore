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

type ProductCost = {
  id: string;
  productId: string;
  name: string;
  unitCostCents: number;
  unitCostEuro?: string;
  unit: string;
  multiplierKind: string;
  multiplierValue: number | null;
  conditionsJson: string | null;
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

function formatEuroFromCents(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(cents || 0) || 0) / 100);
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function centsToEuroInput(cents: number) {
  const v = Number(cents || 0) / 100;
  if (!Number.isFinite(v)) return "";
  // Per input: niente separatori migliaia, max 2 decimali.
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function parseEuroToCents(raw: string) {
  const normalized = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function safeParseJson(value: string | null): any | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function canoneCategoryFromBlock(block: string): "CRM" | "AIVOCALE" | "WA" | null {
  if (block === "CANONI_CRM") return "CRM";
  if (block === "CANONI_AIVOCALE") return "AIVOCALE";
  if (block === "CANONI_WA") return "WA";
  return null;
}

function setPrepayDiscountFlag(conditionsJson: string | null, nextEnabled: boolean, cat: "CRM" | "AIVOCALE" | "WA") {
  const parsed = safeParseJson(conditionsJson);
  const obj: Record<string, unknown> = parsed && typeof parsed === "object" ? { ...parsed } : {};
  if (nextEnabled) obj.applyPrepayDiscountCategory = cat;
  else delete obj.applyPrepayDiscountCategory;
  const hasKeys = Object.keys(obj).length > 0;
  return hasKeys ? JSON.stringify(obj) : null;
}

function computeCostMultiplierForListino(c: ProductCost) {
  const kind = String(c.multiplierKind || "FIXED").toUpperCase();
  if (kind === "PER_QUOTE_ITEM") return 1; // in listino non abbiamo qty: assumiamo per unità
  const v = c.multiplierValue != null ? Number(c.multiplierValue) : 1;
  if (!Number.isFinite(v) || v <= 0) return 1;
  return v;
}

function annualEqFromUnit(unit: string, cents: number) {
  const u = String(unit || "").toUpperCase();
  if (u === "MONTH") return cents * 12;
  return cents;
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
  const [costsByProductId, setCostsByProductId] = useState<Record<string, ProductCost[]>>({});
  const [costsLoading, setCostsLoading] = useState(false);
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

  async function fetchCosts(productId: string) {
    setCostsLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/costs`);
      const data = await res.json().catch(() => []);
      setCostsByProductId((prev) => ({
        ...prev,
        [productId]: Array.isArray(data)
          ? (data as ProductCost[]).map((c) => ({
              ...c,
              unitCostEuro: centsToEuroInput(Number(c.unitCostCents || 0)),
            }))
          : [],
      }));
    } finally {
      setCostsLoading(false);
    }
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
    fetchCosts(product.id);
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

  function setCosts(productId: string, next: ProductCost[]) {
    setCostsByProductId((prev) => ({ ...prev, [productId]: next }));
  }

  function addCostRow(productId: string) {
    const list = costsByProductId[productId] || [];
    const temp: ProductCost = {
      id: `TEMP_${Math.random().toString(16).slice(2)}`,
      productId,
      name: "",
      unitCostCents: 0,
      unitCostEuro: "",
      unit: "ONE_TIME",
      multiplierKind: "FIXED",
      multiplierValue: 1,
      conditionsJson: null,
      active: true,
      sortOrder: list.length ? Math.max(...list.map((c) => c.sortOrder || 0)) + 1 : 0,
    };
    setCosts(productId, [...list, temp]);
  }

  async function saveCost(productId: string, cost: ProductCost) {
    const isTemp = cost.id.startsWith("TEMP_");
    const url = isTemp ? `/api/products/${productId}/costs` : `/api/product-costs/${cost.id}`;
    const method = isTemp ? "POST" : "PATCH";
    const payload = {
      name: cost.name,
      unitCostCents: Number(cost.unitCostCents || 0),
      unit: cost.unit,
      multiplierKind: cost.multiplierKind,
      multiplierValue: cost.multiplierValue,
      conditionsJson: cost.conditionsJson,
      active: cost.active,
      sortOrder: cost.sortOrder,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setMessage({ type: "danger", text: "Errore salvataggio costo." });
      return;
    }
    await fetchCosts(productId);
    setMessage({ type: "success", text: "Costo salvato." });
    setTimeout(() => setMessage(null), 2000);
  }

  async function deleteCost(productId: string, cost: ProductCost) {
    const isTemp = cost.id.startsWith("TEMP_");
    if (isTemp) {
      setCosts(productId, (costsByProductId[productId] || []).filter((c) => c.id !== cost.id));
      return;
    }
    const res = await fetch(`/api/product-costs/${cost.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "danger", text: "Errore eliminazione costo." });
      return;
    }
    await fetchCosts(productId);
    setMessage({ type: "success", text: "Costo eliminato." });
    setTimeout(() => setMessage(null), 2000);
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
          <h1 className="text-2xl sm:text-4xl mb-1">Gestione listino</h1>
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

                              <div
                                className="mt-3 p-4 rounded-lg"
                                style={{
                                  background: "var(--mc-bg-inset)",
                                  border: "1px solid var(--mc-border)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <div className="font-semibold text-sm">Costi (margine interno)</div>
                                  <button
                                    type="button"
                                    className="btn-ghost text-xs px-2 py-1"
                                    onClick={() => addCostRow(p.id)}
                                  >
                                    + Aggiungi costo
                                  </button>
                                </div>

                                {(() => {
                                  const costs = (costsByProductId[p.id] || []).filter((c) => c.active);
                                  const totalCostAnnualEqCents = costs.reduce((sum, c) => {
                                    const mult = computeCostMultiplierForListino(c);
                                    const line = Math.round(Number(c.unitCostCents || 0) * mult);
                                    return sum + annualEqFromUnit(c.unit, line);
                                  }, 0);

                                  const revenueAnnualEqCents = Math.round(
                                    Number((editForm.price ?? p.price) || 0) * 100 * (p.isMonthly ? 12 : 1)
                                  );
                                  const marginCents = revenueAnnualEqCents - totalCostAnnualEqCents;
                                  const marginPct =
                                    revenueAnnualEqCents > 0 ? (marginCents / revenueAnnualEqCents) * 100 : 0;

                                  return (
                                    <div
                                      className="rounded-lg p-3 mb-3"
                                      style={{
                                        background: "var(--mc-bg-elevated)",
                                        border: "1px solid var(--mc-border)",
                                      }}
                                    >
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                          <div className="text-xs font-semibold" style={{ color: "var(--mc-text-muted)" }}>
                                            Prezzo (annuo eq.)
                                          </div>
                                          <div className="font-semibold tabular-nums">{formatEuroFromCents(revenueAnnualEqCents)}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold" style={{ color: "var(--mc-text-muted)" }}>
                                            Costi (annuo eq.)
                                          </div>
                                          <div className="font-semibold tabular-nums">{formatEuroFromCents(totalCostAnnualEqCents)}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold" style={{ color: "var(--mc-text-muted)" }}>
                                            Margine (annuo eq.)
                                          </div>
                                          <div className="font-semibold tabular-nums" style={{ color: marginCents >= 0 ? "var(--mc-success)" : "var(--mc-danger)" }}>
                                            {formatEuroFromCents(marginCents)}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold" style={{ color: "var(--mc-text-muted)" }}>
                                            Margine %
                                          </div>
                                          <div className="font-semibold tabular-nums" style={{ color: marginPct >= 60 ? "var(--mc-success)" : marginPct >= 30 ? "var(--mc-warning)" : "var(--mc-danger)" }}>
                                            {formatPct(marginPct)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-xs mt-2" style={{ color: "var(--mc-text-muted)" }}>
                                        Base “annuo equivalente”: i mensili vengono moltiplicati ×12.
                                      </div>
                                    </div>
                                  );
                                })()}

                                {costsLoading ? (
                                  <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                                    Caricamento costi...
                                  </div>
                                ) : (costsByProductId[p.id] || []).length === 0 ? (
                                  <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                                    Nessun costo configurato per questa voce.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(costsByProductId[p.id] || []).map((c) => (
                                      <div
                                        key={c.id}
                                        className="rounded-md p-3"
                                        style={{
                                          border: "1px solid var(--mc-border)",
                                          background: "var(--mc-bg-elevated)",
                                        }}
                                      >
                                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                                          <div className="sm:col-span-2">
                                            <label className="label">Nome</label>
                                            <input
                                              type="text"
                                              className="input"
                                              value={c.name}
                                              onChange={(e) => {
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id ? { ...x, name: e.target.value } : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <label className="label">Costo unitario (€)</label>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              className="input"
                                              value={c.unitCostEuro ?? centsToEuroInput(c.unitCostCents)}
                                              onChange={(e) => {
                                                const raw = e.target.value;
                                                const cents = parseEuroToCents(raw);
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id
                                                    ? { ...x, unitCostEuro: raw, unitCostCents: cents }
                                                    : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                              placeholder="es. 12,50"
                                            />
                                          </div>
                                          <div>
                                            <label className="label">Unità</label>
                                            <select
                                              className="input"
                                              value={c.unit}
                                              onChange={(e) => {
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id ? { ...x, unit: e.target.value } : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                            >
                                              <option value="ONE_TIME">Una tantum</option>
                                              <option value="MONTH">Mensile</option>
                                              <option value="YEAR">Annuale</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="label">Moltiplicatore</label>
                                            <select
                                              className="input"
                                              value={c.multiplierKind}
                                              onChange={(e) => {
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id ? { ...x, multiplierKind: e.target.value } : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                            >
                                              <option value="FIXED">Fisso</option>
                                              <option value="PER_QUOTE_ITEM">Per quantità</option>
                                              <option value="PER_MONTHS">Valore (multiplierValue)</option>
                                            </select>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <label className="label">Valore</label>
                                            <input
                                              type="number"
                                              className="input"
                                              value={c.multiplierValue ?? ""}
                                              onChange={(e) => {
                                                const raw = e.target.value;
                                                const v = raw === "" ? null : Number(raw);
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id ? { ...x, multiplierValue: Number.isFinite(v) ? v : null } : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 mt-2 items-end">
                                          <div className="sm:col-span-4">
                                            <label className="label">Condizioni JSON (opzionale)</label>
                                            <input
                                              type="text"
                                              className="input font-mono"
                                              value={c.conditionsJson || ""}
                                              onChange={(e) => {
                                                const next = (costsByProductId[p.id] || []).map((x) =>
                                                  x.id === c.id ? { ...x, conditionsJson: e.target.value || null } : x
                                                );
                                                setCosts(p.id, next);
                                              }}
                                              placeholder='es. {"onlyIf":{"scontoCrmAnnuale":true}}'
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 sm:col-span-2 justify-end">
                                            {(() => {
                                              const cat = canoneCategoryFromBlock(p.block);
                                              const parsed = safeParseJson(c.conditionsJson);
                                              const enabled = !!cat && parsed?.applyPrepayDiscountCategory === cat;
                                              return (
                                                <label
                                                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none"
                                                  title="Se il cliente seleziona pagamento annuale anticipato (con sconto), applica lo stesso sconto anche al costo di acquisto."
                                                  style={{ opacity: cat ? 1 : 0.45 }}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    disabled={!cat}
                                                    onChange={(e) => {
                                                      if (!cat) return;
                                                      const nextJson = setPrepayDiscountFlag(c.conditionsJson, e.target.checked, cat);
                                                      const next = (costsByProductId[p.id] || []).map((x) =>
                                                        x.id === c.id ? { ...x, conditionsJson: nextJson } : x
                                                      );
                                                      setCosts(p.id, next);
                                                    }}
                                                    className="checkbox"
                                                  />
                                                  Sconto anticipo su costo
                                                </label>
                                              );
                                            })()}
                                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={c.active}
                                                onChange={(e) => {
                                                  const next = (costsByProductId[p.id] || []).map((x) =>
                                                    x.id === c.id ? { ...x, active: e.target.checked } : x
                                                  );
                                                  setCosts(p.id, next);
                                                }}
                                                className="checkbox"
                                              />
                                              Attivo
                                            </label>
                                            <button
                                              type="button"
                                              className="btn-secondary text-xs px-2 py-1"
                                              onClick={() => void saveCost(p.id, c)}
                                            >
                                              Salva
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-ghost text-xs px-2 py-1"
                                              onClick={() => void deleteCost(p.id, c)}
                                            >
                                              Elimina
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
