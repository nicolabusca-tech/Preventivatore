"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  buildRoiSnapshot,
  computeConversioneAttesa,
  computeDiagnosiPesoTotale,
  computeDiagnosiShareValue,
  mergeRoiDefaults,
  type RoiFormInputs,
} from "@/lib/roi";
import { CrmCustomerSearch, type CrmCustomer } from "@/components/CrmCustomerSearch";
import {
  applicaCodiceManuale,
  calcolaScontoVolume,
  canonePrepayFromMonthly,
  type SelectedItem,
} from "@/lib/discounts";

type Product = {
  id: string;
  code: string;
  name: string;
  block: string;
  positioning: string;
  includes: string;
  objection: string | null;
  response: string | null;
  price: number;
  priceLabel: string | null;
  isMonthly: boolean;
  diagnosiPeso: number;
};

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;
const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";
const AUDIT_LAMPO_CODE = "AUDIT_LAMPO";
const DIAGNOSI_VOUCHER_AMOUNT = 497;
const AUDIT_VOUCHER_AMOUNT = 147;

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

// Stesso ordine del listino admin: DCE ("Direzione Commerciale Esterna") in fondo, dopo ADS.
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

function safeParseIncludes(includesJson: string): string[] {
  try {
    const parsed = JSON.parse(includesJson);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export default function NuovoPreventivoPage() {
  const router = useRouter();
  const { status } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [crmCustomerId, setCrmCustomerId] = useState<string | null>(null);

  // Dati fiscali / indirizzo (importabili da CRM o compilabili a mano)
  const [clientAddress, setClientAddress] = useState("");
  const [clientPostalCode, setClientPostalCode] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientProvince, setClientProvince] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [clientSdi, setClientSdi] = useState("");

  const [originCliente, setOriginCliente] = useState("");
  const [estrattoDiagnosi, setEstrattoDiagnosi] = useState("");
  const [roiInputs, setRoiInputs] = useState<RoiFormInputs>(() => mergeRoiDefaults(null));
  const [selected, setSelected] = useState<Map<string, number>>(new Map());

  const diagnosiGiaPagata = selected.has(DIAGNOSI_CODE);
  const voucherAuditApplied = selected.has(AUDIT_LAMPO_CODE);

  const [scontoCrmAnnuale, setScontoCrmAnnuale] = useState(true);
  const [scontoAiVocaleAnnuale, setScontoAiVocaleAnnuale] = useState(false);
  const [scontoWaAnnuale, setScontoWaAnnuale] = useState(false);

  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCodeMessage, setDiscountCodeMessage] = useState<string | null>(null);
  const [discountValidating, setDiscountValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState<{
    code: string;
    discountPercent: number;
    discountAmount: number;
  } | null>(null);

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(["FRONTEND", "01"])
  );
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [prodRes, roiRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/admin/roi-settings"),
      ]);
      const prodData = await prodRes.json();
      const roiData = await roiRes.json();
      if (cancelled) return;
      setProducts(Array.isArray(prodData) ? prodData : []);
      setRoiInputs(
        mergeRoiDefaults({
          preventiviMese: roiData?.defaultPreventiviMese,
          importoMedio: roiData?.defaultImportoMedio,
          conversioneAttuale: roiData?.defaultConversione,
          margineCommessa: roiData?.defaultMargine,
        })
      );
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) {
        setError("Errore nel caricamento listino/ROI.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const productsByBlock = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const b of blockOrder) map.set(b, []);
    for (const p of products) {
      const list = map.get(p.block) || [];
      list.push(p);
      map.set(p.block, list);
    }
    return map;
  }, [products]);

  /** Blocchi canone con una sola voce attiva: CRM, AI Vocale, WhatsApp. */
  const exclusiveCanoneCodeSets = useMemo(() => {
    const blocks = ["CANONI_CRM", "CANONI_AIVOCALE", "CANONI_WA"] as const;
    return blocks.map((b) => new Set(products.filter((p) => p.block === b).map((p) => p.code)));
  }, [products]);

  function clearPeerCanoneSelections(next: Map<string, number>, code: string) {
    for (const codeSet of exclusiveCanoneCodeSets) {
      if (!codeSet.has(code)) continue;
      for (const c of codeSet) {
        if (c !== code) next.delete(c);
      }
      return;
    }
  }

  const baseTotals = useMemo(() => {
    let setupModules = 0;
    let monthly = 0;
    let crmMonthly = 0;
    let aiMonthly = 0;
    let waMonthly = 0;
    const setupBreakdown: { name: string; lineTotal: number; quantity: number; code: string }[] = [];
    const monthlyBreakdown: { name: string; lineTotal: number; quantity: number; code: string }[] = [];

    for (const [code, qty] of selected.entries()) {
      if (code === DIAGNOSI_CODE || code === AUDIT_LAMPO_CODE) continue;
      const p = products.find((x) => x.code === code);
      if (!p) continue;
      const itemTotal = p.price * qty;
      if (p.isMonthly) {
        monthly += itemTotal;
        if (p.block === "CANONI_CRM") crmMonthly += itemTotal;
        if (p.block === "CANONI_AIVOCALE") aiMonthly += itemTotal;
        if (p.block === "CANONI_WA") waMonthly += itemTotal;
        const esclusoDallaRicorrenzaMensile =
          (p.block === "CANONI_CRM" && scontoCrmAnnuale) ||
          (p.block === "CANONI_AIVOCALE" && scontoAiVocaleAnnuale) ||
          (p.block === "CANONI_WA" && scontoWaAnnuale);
        if (!esclusoDallaRicorrenzaMensile) {
          monthlyBreakdown.push({
            name: p.name,
            lineTotal: itemTotal,
            quantity: qty,
            code: p.code,
          });
        }
      } else {
        setupModules += itemTotal;
        setupBreakdown.push({
          name: p.name,
          lineTotal: itemTotal,
          quantity: qty,
          code: p.code,
        });
      }
    }

    // Diagnosi in listino = credito (già versata) solo se la selezioni. Nessun +497 "automatico" a preventivo
    // vuoto: prima era addebitata come voce implici­ta, ma in UI generava 497€ senza voci in offerta.
    const setupGross = setupModules;
    let setup = setupGross;
    if (diagnosiGiaPagata) {
      setup = Math.max(0, setup - DIAGNOSI_VOUCHER_AMOUNT);
    }
    if (voucherAuditApplied) {
      setup = Math.max(0, setup - AUDIT_VOUCHER_AMOUNT);
    }

    const crmPrepayBreakdown =
      scontoCrmAnnuale && crmMonthly > 0
        ? canonePrepayFromMonthly(crmMonthly, "CRM")
        : null;
    const aiPrepayBreakdown =
      scontoAiVocaleAnnuale && aiMonthly > 0
        ? canonePrepayFromMonthly(aiMonthly, "AIVOCALE")
        : null;
    const waPrepayBreakdown =
      scontoWaAnnuale && waMonthly > 0
        ? canonePrepayFromMonthly(waMonthly, "WA")
        : null;

    const prepaidCrm = crmPrepayBreakdown?.netOneTime ?? 0;
    const prepaidAi = aiPrepayBreakdown?.netOneTime ?? 0;
    const prepaidWa = waPrepayBreakdown?.netOneTime ?? 0;

    const monthlyAfterPrepay =
      monthly -
      (scontoCrmAnnuale ? crmMonthly : 0) -
      (scontoAiVocaleAnnuale ? aiMonthly : 0) -
      (scontoWaAnnuale ? waMonthly : 0);

    const oneTimeTotal = setup + prepaidCrm + prepaidAi + prepaidWa;
    const annualTotal = oneTimeTotal + monthlyAfterPrepay * 12;

    return {
      setupModules,
      setupGross,
      setup,
      setupBreakdown,
      monthlyBreakdown,
      monthly,
      crmMonthly,
      aiMonthly,
      waMonthly,
      monthlyAfterPrepay,
      oneTimeTotal,
      annualTotal,
      prepaidCrm,
      prepaidAi,
      prepaidWa,
      crmPrepayBreakdown,
      aiPrepayBreakdown,
      waPrepayBreakdown,
    };
  }, [
    products,
    selected,
    diagnosiGiaPagata,
    voucherAuditApplied,
    scontoAiVocaleAnnuale,
    scontoCrmAnnuale,
    scontoWaAnnuale,
  ]);

  const totals = useMemo(() => {
    const setupAfterVoucher = baseTotals.setup;

    const selectedDiscountItems: SelectedItem[] = Array.from(selected.entries())
      .map(([code, qty]) => {
        const p = products.find((x) => x.code === code);
        if (!p) return null;
        if (code === DIAGNOSI_CODE || code === AUDIT_LAMPO_CODE) return null;
        return {
          code: p.code,
          qty,
          price: p.price,
          isMonthly: p.isMonthly,
          block: p.block,
        };
      })
      .filter(Boolean) as SelectedItem[];

    const volume = calcolaScontoVolume(selectedDiscountItems);

    const manualRes = manualDiscount
      ? applicaCodiceManuale(
          setupAfterVoucher,
          manualDiscount.discountPercent,
          manualDiscount.code,
          manualDiscount.discountAmount > 0
            ? { fixedAmount: manualDiscount.discountAmount }
            : undefined
        )
      : null;

    const chosen = manualRes
      ? {
          discountType: "manual" as const,
          discountCode: manualDiscount!.code,
          discountPercent: manualDiscount!.discountPercent,
          discountAmount: manualRes.amount,
          discountLabel: manualRes.label,
        }
      : volume.type !== "none"
        ? {
            discountType: volume.type,
            discountCode: null as string | null,
            discountPercent: volume.percent,
            discountAmount: volume.amount,
            discountLabel: volume.label,
          }
        : {
            discountType: null as string | null,
            discountCode: null as string | null,
            discountPercent: 0,
            discountAmount: 0,
            discountLabel: "" as string,
          };

    const isVolume =
      chosen.discountType === "volume_5" || chosen.discountType === "volume_10";
    const setupNet = Math.max(
      0,
      setupAfterVoucher - (isVolume ? 0 : chosen.discountAmount)
    );
    const oneTimeTotal = setupNet + baseTotals.prepaidCrm + baseTotals.prepaidAi + baseTotals.prepaidWa;
    const annualTotal = oneTimeTotal + baseTotals.monthlyAfterPrepay * 12;

    return {
      ...baseTotals,
      setupAfterVoucher,
      setupNet,
      oneTimeTotal,
      annualTotal,
      discountType: chosen.discountType,
      discountCode: chosen.discountCode,
      discountPercent: chosen.discountPercent,
      discountAmount: chosen.discountAmount,
      discountLabel: chosen.discountLabel,
      volumeDiscount: volume,
    };
  }, [baseTotals, products, selected, manualDiscount]);

  const roiLive = useMemo(() => {
    const selectedForRoi = Array.from(selected.entries())
      .map(([code, quantity]) => {
        const p = products.find((x) => x.code === code);
        if (!p) return null;
        if (code === AUDIT_LAMPO_CODE) return null;
        return { productCode: p.code, quantity, price: p.price, isMonthly: p.isMonthly };
      })
      .filter(Boolean) as { productCode: string; quantity: number; price: number; isMonthly: boolean }[];

    const byCode = new Map<string, { diagnosiPeso: number; isMonthly: boolean }>(
      products.map((p) => [p.code, { diagnosiPeso: p.diagnosiPeso || 0, isMonthly: p.isMonthly }])
    );

    const diagnosiShareValue = computeDiagnosiShareValue(selectedForRoi, byCode);
    const diagnosiPesoTotale = computeDiagnosiPesoTotale(selectedForRoi, byCode);
    return buildRoiSnapshot(
      roiInputs,
      totals.oneTimeTotal,
      totals.monthlyAfterPrepay,
      diagnosiShareValue,
      diagnosiPesoTotale
    );
  }, [products, roiInputs, selected, totals.monthlyAfterPrepay, totals.oneTimeTotal]);

  const roiExplain = useMemo(() => {
    const selectedForRoi = Array.from(selected.entries())
      .map(([code, quantity]) => {
        const p = products.find((x) => x.code === code);
        if (!p) return null;
        if (code === AUDIT_LAMPO_CODE) return null;
        return { productCode: p.code, quantity };
      })
      .filter(Boolean) as { productCode: string; quantity: number }[];
    const byCode = new Map<string, { diagnosiPeso: number; isMonthly: boolean }>(
      products.map((p) => [p.code, { diagnosiPeso: p.diagnosiPeso || 0, isMonthly: p.isMonthly }])
    );
    const peso = computeDiagnosiPesoTotale(selectedForRoi, byCode);
    const convAttesa = computeConversioneAttesa(roiInputs, peso);
    return { peso, convAttesa };
  }, [products, roiInputs, selected]);

  const roiQuick = useMemo(() => {
    const payload = roiLive.payload;
    const investimento = totals.annualTotal;
    const deltaMargine = payload.margineStimatoProposta - payload.margineAnnuoBaseline;
    const paybackMesi =
      deltaMargine > 0 ? (investimento / deltaMargine) * 12 : null;

    const preventiviAnnui = (roiInputs.preventiviMese || 0) * 12;
    const contrattiAttuali = preventiviAnnui * ((roiInputs.conversioneAttuale || 0) / 100);
    const contrattiAttesi = preventiviAnnui * (roiExplain.convAttesa || 0);

    return {
      investimento,
      deltaMargine,
      paybackMesi,
      preventiviAnnui,
      contrattiAttuali,
      contrattiAttesi,
    };
  }, [roiExplain.convAttesa, roiInputs.conversioneAttuale, roiInputs.preventiviMese, roiLive.payload, totals.annualTotal]);

  async function applyDiscountCode() {
    setDiscountCodeMessage(null);
    const raw = discountCodeInput.trim().toUpperCase();
    if (!raw) {
      setManualDiscount(null);
      return;
    }

    setDiscountValidating(true);
    const res = await fetch("/api/discount-codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: raw }),
    });
    const data = await res.json().catch(() => ({}));
    setDiscountValidating(false);

    if (!res.ok || !data?.valid) {
      setManualDiscount(null);
      setDiscountCodeMessage(data?.error || "Codice non valido.");
      return;
    }

    const pct = Number(data.discountPercent || 0);
    const amt = Number(data.discountAmount || 0);
    if (pct <= 0 && amt <= 0) {
      setManualDiscount(null);
      setDiscountCodeMessage("Codice senza valore sconto configurato.");
      return;
    }

    setManualDiscount({
      code: String(data.code || raw).toUpperCase(),
      discountPercent: pct > 0 ? pct : 0,
      discountAmount: amt > 0 ? amt : 0,
    });
    setDiscountCodeInput(String(data.code || raw).toUpperCase());
    setDiscountCodeMessage("Codice applicato: sostituisce lo sconto volume automatico.");
  }

  function clearDiscountCode() {
    setDiscountCodeInput("");
    setDiscountCodeMessage(null);
    setManualDiscount(null);
  }

  function toggleProduct(code: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(code)) {
        next.delete(code);
        return next;
      }
      if (code === DIAGNOSI_CODE) {
        next.delete(AUDIT_LAMPO_CODE);
      } else if (code === AUDIT_LAMPO_CODE) {
        next.delete(DIAGNOSI_CODE);
      }
      if (DCE_ALLOWED_CODES.includes(code as (typeof DCE_ALLOWED_CODES)[number])) {
        for (const c of DCE_ALLOWED_CODES) {
          if (c !== code) next.delete(c);
        }
      }
      clearPeerCanoneSelections(next, code);
      next.set(code, 1);
      return next;
    });
  }

  function updateQuantity(code: string, qty: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(code);
      else if (code === DIAGNOSI_CODE || code === AUDIT_LAMPO_CODE) next.set(code, 1);
      else if (DCE_ALLOWED_CODES.includes(code as (typeof DCE_ALLOWED_CODES)[number]) && qty > 0) {
        for (const c of DCE_ALLOWED_CODES) {
          if (c !== code) next.delete(c);
        }
        next.set(code, 1);
      } else if (qty > 0) {
        for (const s of exclusiveCanoneCodeSets) {
          if (s.has(code)) {
            for (const c of s) {
              if (c !== code) next.delete(c);
            }
            next.set(code, qty);
            return next;
          }
        }
        next.set(code, qty);
      } else next.set(code, qty);
      return next;
    });
  }

  function toggleBlock(block: string) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(block)) next.delete(block);
      else next.add(block);
      return next;
    });
  }

  function toggleDetails(code: string) {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSubmit() {
    if (!clientName.trim()) {
      setError("Il nome del cliente è obbligatorio.");
      return;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una voce dal listino.");
      return;
    }

    setError("");
    setSaving(true);

    const items = Array.from(selected.entries())
      .map(([code, quantity]) => {
        const p = products.find((x) => x.code === code);
        if (!p) return null;
        return {
          productCode: p.code,
          productName: p.name,
          price: p.price,
          quantity,
          isMonthly: p.isMonthly,
        };
      })
      .filter(Boolean);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays || 30));

    const res = await fetch("/api/quotes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim() || null,
        clientEmail: clientEmail.trim() || null,
        clientPhone: clientPhone.trim() || null,
        clientNotes: clientNotes.trim() || null,
        crmCustomerId: crmCustomerId || null,
        clientAddress: clientAddress.trim() || null,
        clientPostalCode: clientPostalCode.trim() || null,
        clientCity: clientCity.trim() || null,
        clientProvince: clientProvince.trim() || null,
        clientVat: clientVat.trim() || null,
        clientSdi: clientSdi.trim() || null,
        originCliente: originCliente.trim() || null,
        estrattoDiagnosi: estrattoDiagnosi.trim() || null,
        diagnosiGiaPagata,
        roiPreventiviMese: roiInputs.preventiviMese,
        roiImportoMedio: roiInputs.importoMedio,
        roiConversioneAttuale: roiInputs.conversioneAttuale,
        roiMargineCommessa: roiInputs.margineCommessa,
        roiSnapshot: roiLive.snapshot,
        items,
        dceProductId: (() => {
          for (const c of DCE_ALLOWED_CODES) {
            if (selected.has(c)) {
              return products.find((p) => p.code === c)?.id ?? null;
            }
          }
          return null;
        })(),
        voucherAuditApplied,
        notes: notes.trim() || null,
        expiresAt,
        // Una tantum complessiva: voci setup (al netto sconti sul setup) + eventuali canoni
        // CRM/AI/WA pagati in anticipo annuale. `totalMonthly` è già al netto di quelle quote.
        totalSetup: totals.oneTimeTotal,
        totalMonthly: totals.monthlyAfterPrepay,
        totalAnnual: totals.annualTotal,
        setupBeforeDiscount: totals.setupGross,
        discountType: totals.discountType,
        discountAmount: totals.discountAmount,
        discountCode: totals.discountCode,
        discountPercent: totals.discountPercent,
        scontoCrmAnnuale,
        scontoAiVocaleAnnuale,
        scontoWaAnnuale,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const quote = await res.json();
      router.push(`/preventivi/${quote.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Errore nel salvataggio.");
    }
  }

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
          <span className="text-sm">Caricamento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="text-4xl mb-1">Nuovo preventivo</h1>
        <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
          Componi l&apos;offerta e salva il Piano Operativo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>

            <div className="mb-4">
              <div className="label">Importa dal CRM (opzionale)</div>
              <CrmCustomerSearch
                onSelect={(c: CrmCustomer) => {
                  setCrmCustomerId(c.crmId || null);
                  setClientName(c.fullName || `${c.firstName} ${c.lastName}`.trim());
                  setClientCompany(c.company || "");
                  setClientEmail(c.email || "");
                  setClientPhone(c.phone || "");
                  setClientAddress(c.address || "");
                  setClientPostalCode(c.postalCode || "");
                  setClientCity(c.city || "");
                  setClientProvince(c.province || "");
                  setClientVat(c.vat || "");
                  setClientSdi(c.sdi || "");
                }}
              />

              {crmCustomerId && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="badge badge-accent">
                    <span className="badge-dot" />
                    CRM #{crmCustomerId}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setCrmCustomerId(null)}
                  >
                    Rimuovi collegamento CRM
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Nome referente <span style={{ color: "var(--mc-accent)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Mario Rossi"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Ragione sociale</label>
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
              <div className="sm:col-span-2">
                <label className="label">Note cliente</label>
                <textarea
                  rows={2}
                  className="input"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Contesto, esigenze emerse in call..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Indirizzo</label>
                <input
                  type="text"
                  className="input"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Via e numero civico"
                />
              </div>
              <div>
                <label className="label">CAP</label>
                <input
                  type="text"
                  className="input"
                  value={clientPostalCode}
                  onChange={(e) => setClientPostalCode(e.target.value)}
                  placeholder="00000"
                />
              </div>
              <div>
                <label className="label">Città</label>
                <input
                  type="text"
                  className="input"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  placeholder="Comune"
                />
              </div>
              <div>
                <label className="label">Provincia</label>
                <input
                  type="text"
                  className="input"
                  value={clientProvince}
                  onChange={(e) => setClientProvince(e.target.value.toUpperCase())}
                  placeholder="BG"
                />
              </div>
              <div>
                <label className="label">Partita IVA</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={clientVat}
                  onChange={(e) => setClientVat(e.target.value)}
                  placeholder="IT..."
                />
              </div>
              <div>
                <label className="label">Codice SDI</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={clientSdi}
                  onChange={(e) => setClientSdi(e.target.value.toUpperCase())}
                  placeholder="XXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Diagnosi &amp; ROI (prima della proposta)</h2>
            <p className="text-sm mb-4" style={{ color: "var(--mc-text-secondary)" }}>
              Seleziona <strong>Diagnosi Strategica</strong> o <strong>Audit Lampo</strong> sotto, nel
              listino: indicano l&apos;importo come già versato (credito, una sola tra le due). I totali
              a destra li mostrano in verde con il segno meno.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Origine cliente</label>
                <input
                  type="text"
                  className="input"
                  value={originCliente}
                  onChange={(e) => setOriginCliente(e.target.value)}
                  placeholder="es. Passaparola, Ads, Partner..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Estratto diagnosi</label>
                <textarea
                  rows={3}
                  className="input"
                  value={estrattoDiagnosi}
                  onChange={(e) => setEstrattoDiagnosi(e.target.value)}
                  placeholder="Sintesi problemi/opportunità emersi..."
                />
              </div>

              <div>
                <label className="label">Preventivi / mese</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={roiInputs.preventiviMese}
                  onChange={(e) =>
                    setRoiInputs((p) => ({
                      ...p,
                      preventiviMese: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Importo medio (€)</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={roiInputs.importoMedio}
                  onChange={(e) =>
                    setRoiInputs((p) => ({ ...p, importoMedio: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <label className="label">Conversione attuale (%)</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={roiInputs.conversioneAttuale}
                  onChange={(e) =>
                    setRoiInputs((p) => ({
                      ...p,
                      conversioneAttuale: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Margine commessa (%)</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={roiInputs.margineCommessa}
                  onChange={(e) =>
                    setRoiInputs((p) => ({ ...p, margineCommessa: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Componi l&apos;offerta</h2>
            <p className="text-sm mb-4" style={{ color: "var(--mc-text-secondary)" }}>
              <strong>Direzione Commerciale Esterna (DCE)</strong> è l&apos;ultimo blocco in pagina (come nel
              listino), dopo ADS: stesse voci DCE Base / Strutturato / Enterprise; al massimo un livello.
              Diagnosi e Audit si scelgono in <strong>Front-end</strong> (voucher, non insieme).
            </p>

            <div className="space-y-2.5">
              {blockOrder.map((block) => {
                const list = (productsByBlock.get(block) || []) as Product[];
                if (list.length === 0) return null;
                const isExpanded = expandedBlocks.has(block);
                const selectedCount = list.filter((p) => selected.has(p.code)).length;

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
                        <span className="font-semibold text-sm">{blockLabels[block] || block}</span>
                        {selectedCount > 0 && (
                          <span className="badge badge-accent">
                            <span className="badge-dot" />
                            {selectedCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
                        {list.length} voci
                      </span>
                    </button>

                    {isExpanded && (
                      <>
                        {(block === "CANONI_CRM" ||
                          block === "CANONI_AIVOCALE" ||
                          block === "CANONI_WA") && (
                          <div
                            className="px-4 py-2.5 text-xs border-b"
                            style={{
                              color: "var(--mc-text-secondary)",
                              background: "var(--mc-bg-inset)",
                              borderColor: "var(--mc-border)",
                            }}
                          >
                            <strong>{blockLabels[block] || block}</strong>: puoi attivare{" "}
                            <strong>una sola</strong> tra le voci sotto; scegliendone un&apos;altra, la
                            precedente si deseleziona.
                          </div>
                        )}
                        <div className="divide-mc">
                        {list.map((p) => {
                          const isSelected = selected.has(p.code);
                          const qty = selected.get(p.code) || 1;
                          const showDetails = expandedDetails.has(p.code);
                          const includesArr = safeParseIncludes(p.includes);

                          return (
                            <div
                              key={p.id}
                              className="p-4"
                              style={{
                                background: isSelected ? "var(--mc-bg-selected)" : "transparent",
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProduct(p.code)}
                                  className="checkbox mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
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
                                          <span
                                            className="text-xs font-normal ml-1"
                                            style={{ color: "var(--mc-text-muted)" }}
                                          >
                                            /mese
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleDetails(p.code)}
                                      className="btn-ghost text-xs px-2 py-1"
                                    >
                                      {showDetails ? "Nascondi dettagli" : "Mostra dettagli"}
                                    </button>

                                    {isSelected &&
                                      (p.code === DIAGNOSI_CODE ||
                                      p.code === AUDIT_LAMPO_CODE ||
                                      DCE_ALLOWED_CODES.includes(p.code as (typeof DCE_ALLOWED_CODES)[number]) ? (
                                        <div
                                          className="ml-auto text-xs"
                                          style={{ color: "var(--mc-text-muted)" }}
                                        >
                                          Qtà 1
                                        </div>
                                      ) : (
                                        <div className="ml-auto flex items-center gap-2 text-xs">
                                          <span style={{ color: "var(--mc-text-muted)" }}>
                                            {p.isMonthly ? "Mesi" : "Qtà"}
                                          </span>
                                          <input
                                            type="number"
                                            min={1}
                                            className="input"
                                            style={{ width: 88, padding: "6px 10px" }}
                                            value={qty}
                                            onChange={(e) =>
                                              updateQuantity(p.code, Number(e.target.value) || 1)
                                            }
                                          />
                                        </div>
                                      ))}
                                  </div>

                                  {showDetails && (
                                    <div
                                      className="mt-3 p-4 rounded-lg"
                                      style={{
                                        background: "var(--mc-bg-inset)",
                                        border: "1px solid var(--mc-border)",
                                      }}
                                    >
                                      {includesArr.length > 0 && (
                                        <div className="mb-3">
                                          <div className="label">Cosa include</div>
                                          <ul className="mt-2 space-y-1 text-sm">
                                            {includesArr.map((it, i) => (
                                              <li key={i} className="flex gap-2">
                                                <span style={{ color: "var(--mc-accent)" }}>•</span>
                                                <span>{it}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {p.objection && p.response && (
                                        <div className="alert alert-danger">
                                          <span className="text-xs font-semibold">
                                            &quot;{p.objection}&quot;
                                          </span>
                                          <span className="text-xs" style={{ opacity: 0.9 }}>
                                            {p.response}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Scadenza e note</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Validità (giorni)</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value) || 30)}
                />
                <p className="helper-text">
                  Scadenza:{" "}
                  {new Date(
                    Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("it-IT")}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Note interne</label>
              <textarea
                rows={3}
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note operative, condizioni speciali, follow-up..."
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 lg:sticky lg:top-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--mc-text-secondary)" }}
                >
                  Setup una tantum
                </div>
                {totals.setupBreakdown.length === 0 ? (
                  <div className="text-xs pl-0 mb-2" style={{ color: "var(--mc-text-muted)" }}>
                    Nessuna voce a setup. Aggiungila dai blocchi listino.
                  </div>
                ) : (
                  <ul className="space-y-1.5 mb-2 pl-0 list-none">
                    {totals.setupBreakdown.map((row) => (
                      <li key={row.code} className="flex justify-between gap-2 text-xs">
                        <span className="min-w-0" style={{ color: "var(--mc-text-secondary)" }}>
                          {row.name}
                          {row.quantity > 1 ? (
                            <span className="opacity-80"> · {row.quantity}×</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatEuro(row.lineTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div
                  className="flex justify-between gap-2 pt-1 border-t"
                  style={{ borderColor: "var(--mc-border)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--mc-text)" }}>
                    Setup totale
                  </span>
                  <span className="font-bold tabular-nums">{formatEuro(totals.setupGross)}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                  Somma delle voci «una tantum» selezionate.
                </p>

                {(totals.crmMonthly > 0 || totals.aiMonthly > 0 || totals.waMonthly > 0) && (
                  <div
                    className="mt-3 pt-3 border-t"
                    style={{ borderColor: "var(--mc-border)" }}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mc-text-secondary)" }}>
                      Canoni a pagamento annuale anticipato
                    </div>
                    <p className="text-[10px] mb-3" style={{ color: "var(--mc-text-muted)" }}>
                      Se attivo, l’importo dell’annuo anticipato (al netto dello sconto) confluisce nelle
                      voci una tantum del primo anno; la stessa voce scompare da «Ricorrenza mensile».
                    </p>
                    {totals.crmMonthly > 0 && (
                      <div className="mt-2 first:mt-0">
                        <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="checkbox mt-0.5"
                            checked={scontoCrmAnnuale}
                            onChange={(e) => setScontoCrmAnnuale(e.target.checked)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">Canone CRM — pagamento annuale anticipato (−20%)</div>
                            {scontoCrmAnnuale && totals.crmPrepayBreakdown && (
                              <div
                                className="mt-1.5 space-y-0.5 pl-0.5"
                                style={{ color: "var(--mc-text-secondary)" }}
                              >
                                <div className="flex justify-between gap-2">
                                  <span>12× canone ({formatEuro(totals.crmMonthly)}/mese)</span>
                                  <span className="tabular-nums">
                                    {formatEuro(totals.crmPrepayBreakdown.fullAnnual)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                  <span>Sconto 20% su quell’importo</span>
                                  <span className="tabular-nums">
                                    −{formatEuro(totals.crmPrepayBreakdown.discountAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2 font-semibold" style={{ color: "var(--mc-text)" }}>
                                  <span>Anticipo da versare (una tantum)</span>
                                  <span className="tabular-nums" style={{ color: "var(--mc-success)" }}>
                                    {formatEuro(totals.crmPrepayBreakdown.netOneTime)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                    {totals.aiMonthly > 0 && (
                      <div className="mt-2">
                        <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="checkbox mt-0.5"
                            checked={scontoAiVocaleAnnuale}
                            onChange={(e) => setScontoAiVocaleAnnuale(e.target.checked)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">AI Vocale — pagamento annuale anticipato (−15%)</div>
                            {scontoAiVocaleAnnuale && totals.aiPrepayBreakdown && (
                              <div
                                className="mt-1.5 space-y-0.5 pl-0.5"
                                style={{ color: "var(--mc-text-secondary)" }}
                              >
                                <div className="flex justify-between gap-2">
                                  <span>12× canone ({formatEuro(totals.aiMonthly)}/mese)</span>
                                  <span className="tabular-nums">
                                    {formatEuro(totals.aiPrepayBreakdown.fullAnnual)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                  <span>Sconto 15% su quell’importo</span>
                                  <span className="tabular-nums">
                                    −{formatEuro(totals.aiPrepayBreakdown.discountAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2 font-semibold" style={{ color: "var(--mc-text)" }}>
                                  <span>Anticipo da versare (una tantum)</span>
                                  <span className="tabular-nums" style={{ color: "var(--mc-success)" }}>
                                    {formatEuro(totals.aiPrepayBreakdown.netOneTime)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                    {totals.waMonthly > 0 && (
                      <div className="mt-2">
                        <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="checkbox mt-0.5"
                            checked={scontoWaAnnuale}
                            onChange={(e) => setScontoWaAnnuale(e.target.checked)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">WhatsApp — pagamento annuale anticipato (−15%)</div>
                            {scontoWaAnnuale && totals.waPrepayBreakdown && (
                              <div
                                className="mt-1.5 space-y-0.5 pl-0.5"
                                style={{ color: "var(--mc-text-secondary)" }}
                              >
                                <div className="flex justify-between gap-2">
                                  <span>12× canone ({formatEuro(totals.waMonthly)}/mese)</span>
                                  <span className="tabular-nums">
                                    {formatEuro(totals.waPrepayBreakdown.fullAnnual)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                  <span>Sconto 15% su quell’importo</span>
                                  <span className="tabular-nums">
                                    −{formatEuro(totals.waPrepayBreakdown.discountAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2 font-semibold" style={{ color: "var(--mc-text)" }}>
                                  <span>Anticipo da versare (una tantum)</span>
                                  <span className="tabular-nums" style={{ color: "var(--mc-success)" }}>
                                    {formatEuro(totals.waPrepayBreakdown.netOneTime)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {diagnosiGiaPagata && (
                <div className="flex justify-between" style={{ color: "var(--mc-success)" }}>
                  <span className="text-xs">Diagnosi Strategica (già versata)</span>
                  <span className="font-semibold text-xs tabular-nums">−{formatEuro(DIAGNOSI_VOUCHER_AMOUNT)}</span>
                </div>
              )}

              {voucherAuditApplied && (
                <div className="flex justify-between" style={{ color: "var(--mc-success)" }}>
                  <span className="text-xs">Audit Lampo (già versato)</span>
                  <span className="font-semibold text-xs tabular-nums">−{formatEuro(AUDIT_VOUCHER_AMOUNT)}</span>
                </div>
              )}

              {totals.discountAmount > 0 &&
                totals.discountType !== "volume_5" &&
                totals.discountType !== "volume_10" && (
                  <div className="flex justify-between" style={{ color: "var(--mc-success)" }}>
                    <span className="text-xs">
                      {totals.discountType === "manual"
                        ? `Codice ${totals.discountCode || ""}`.trim()
                        : totals.volumeDiscount?.label || "Sconto"}
                    </span>
                    <span className="font-semibold text-xs tabular-nums">
                      −{formatEuro(totals.discountAmount)}
                    </span>
                  </div>
                )}

              {(totals.discountType === "volume_5" || totals.discountType === "volume_10") &&
                totals.discountAmount > 0 && (
                  <div className="flex justify-between" style={{ color: "var(--mc-text-secondary)" }}>
                    <span className="text-xs">Credito MC (10% sul setup, 12 mesi)</span>
                    <span className="font-semibold text-xs tabular-nums" style={{ color: "var(--mc-success)" }}>
                      {formatEuro(Math.round(totals.setupAfterVoucher * 0.1))}
                    </span>
                  </div>
                )}

              {totals.discountAmount > 0 &&
                totals.discountType !== "volume_5" &&
                totals.discountType !== "volume_10" && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Setup dopo sconto</span>
                    <span className="font-semibold tabular-nums">{formatEuro(totals.setupNet)}</span>
                  </div>
                )}

              {(totals.discountType === "volume_5" || totals.discountType === "volume_10") && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Totale setup</span>
                  <span className="font-semibold tabular-nums">{formatEuro(totals.setupNet)}</span>
                </div>
              )}

              <div
                className="pt-3"
                style={{ borderTop: "1px solid var(--mc-border)" }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--mc-text-secondary)" }}
                >
                  Ricorrenza mensile
                </div>
                {totals.monthlyBreakdown.length === 0 && totals.monthlyAfterPrepay <= 0 ? (
                  <div className="text-xs mb-2" style={{ color: "var(--mc-text-muted)" }}>
                    {totals.monthly > 0
                      ? "I canoni CRM / AI / WA risultano tutti a pagamento annuale anticipato: cfr. sopra in «Setup»."
                      : "Nessun canone mensile. Aggiungilo dai blocchi listino."}
                  </div>
                ) : (
                  <ul className="space-y-1.5 mb-2 pl-0 list-none">
                    {totals.monthlyBreakdown.map((row) => (
                      <li key={row.code} className="flex justify-between gap-2 text-xs">
                        <span className="min-w-0" style={{ color: "var(--mc-text-secondary)" }}>
                          {row.name}
                          {row.quantity > 1 ? (
                            <span className="opacity-80"> · {row.quantity}×</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatEuro(row.lineTotal)}/mese
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div
                  className="flex justify-between gap-2 pt-1 border-t"
                  style={{ borderColor: "var(--mc-border)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--mc-text)" }}>
                    Totale canoni mensili
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatEuro(totals.monthlyAfterPrepay)}/mese
                  </span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                  Solo voci a ricorrenza non coperte da anticipo annuale; le anticipate sono indicate più
                  sopra in «Canoni a pagamento annuale anticipato».
                </p>
              </div>
            </div>

            <div className="pt-4" style={{ borderTop: "2px solid var(--mc-text)" }}>
              <div className="label">Totale primo anno</div>
              <div
                className="text-3xl font-bold tabular-nums mt-0.5"
                style={{ color: "var(--mc-accent)", letterSpacing: "-0.02em" }}
              >
                {formatEuro(totals.annualTotal)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--mc-text-muted)" }}>
                IVA esclusa
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: "1px solid var(--mc-border)" }}>
              <div className="label">Codice sconto (opzionale)</div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  className="input font-mono"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                  placeholder="es. AMICO-15"
                />
                <button
                  type="button"
                  className="btn-secondary text-xs px-3 py-2"
                  onClick={() => void applyDiscountCode()}
                  disabled={discountValidating}
                >
                  {discountValidating ? "..." : "Applica"}
                </button>
              </div>
              {manualDiscount && (
                <button type="button" className="btn-ghost text-xs mt-2 px-2 py-1" onClick={clearDiscountCode}>
                  Rimuovi codice
                </button>
              )}
              {discountCodeMessage && (
                <p className="helper-text" style={{ color: "var(--mc-text-secondary)" }}>
                  {discountCodeMessage}
                </p>
              )}
              <p className="helper-text">Si applica al setup; sostituisce lo sconto volume automatico.</p>
            </div>

            <div className="card-muted p-4">
              <div className="text-xs font-bold uppercase tracking-wider mb-2">ROI (live)</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Peso ROI totale</span>
                  <span className="font-semibold tabular-nums">{roiExplain.peso.toFixed(0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Conversione attesa</span>
                  <span className="font-semibold tabular-nums">
                    {(roiExplain.convAttesa * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Margine baseline</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiLive.payload.margineAnnuoBaseline)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Margine stimato proposta</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiLive.payload.margineStimatoProposta)}
                  </span>
                </div>
                <div
                  className="pt-2 mt-2 space-y-1"
                  style={{ borderTop: "1px solid var(--mc-border)" }}
                >
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Investimento (1° anno)</span>
                    <span className="font-semibold tabular-nums">
                      {formatEuro(roiQuick.investimento)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Δ margine (stima)</span>
                    <span className="font-semibold tabular-nums">
                      {formatEuro(roiQuick.deltaMargine)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Rientro stimato</span>
                    <span className="font-semibold tabular-nums">
                      {roiQuick.paybackMesi == null
                        ? "—"
                        : `${roiQuick.paybackMesi.toFixed(1)} mesi`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "var(--mc-text-secondary)" }}>Contratti/anno</span>
                    <span className="font-semibold tabular-nums">
                      {roiQuick.contrattiAttuali.toFixed(1)} → {roiQuick.contrattiAttesi.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Quota diagnosi</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiLive.payload.valoreQuotaDiagnosi)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Indice</span>
                  <span className="font-semibold tabular-nums">
                    {roiLive.payload.indice != null ? roiLive.payload.indice.toFixed(2) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || selected.size === 0}
              className="btn-primary w-full"
            >
              {saving ? "Salvataggio..." : "Salva preventivo"}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--mc-text-muted)" }}>
              Dopo il salvataggio puoi scaricare il PDF dalla pagina dettaglio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
