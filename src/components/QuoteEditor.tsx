"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildRoiSnapshot,
  computeConversioneAttesa,
  computeDiagnosiPesoTotale,
  computeDiagnosiShareValue,
  mergeRoiDefaults,
  type RoiFormInputs,
  type RoiSnapshotPayload,
} from "@/lib/roi";
import { CrmCustomerSearch, type CrmCustomer } from "@/components/CrmCustomerSearch";
import { ClienteForm } from "@/components/quote-editor/ClienteForm";
import { DiagnosiRoiInputs } from "@/components/quote-editor/DiagnosiRoiInputs";
import { ScadenzaENote } from "@/components/quote-editor/ScadenzaENote";
import { computePricing, type PricingInput } from "@/lib/pricing/engine";
import type { QuoteEditorInitialData } from "@/lib/types/quote";

export type { QuoteEditorInitialData } from "@/lib/types/quote";

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

type Props = {
  initial?: QuoteEditorInitialData;
};

export function QuoteEditor({ initial }: Props) {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [quoteId, setQuoteId] = useState<string | null>(initial?.id ?? null);

  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientCompany, setClientCompany] = useState(initial?.clientCompany ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [clientNotes, setClientNotes] = useState(initial?.clientNotes ?? "");
  const [crmCustomerId, setCrmCustomerId] = useState<string | null>(initial?.crmCustomerId ?? null);

  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? "");
  const [clientPostalCode, setClientPostalCode] = useState(initial?.clientPostalCode ?? "");
  const [clientCity, setClientCity] = useState(initial?.clientCity ?? "");
  const [clientProvince, setClientProvince] = useState(initial?.clientProvince ?? "");
  const [clientVat, setClientVat] = useState(initial?.clientVat ?? "");
  const [clientSdi, setClientSdi] = useState(initial?.clientSdi ?? "");

  const [originCliente, setOriginCliente] = useState(initial?.originCliente ?? "");
  const [estrattoDiagnosi, setEstrattoDiagnosi] = useState(initial?.estrattoDiagnosi ?? "");

  const [roiInputs, setRoiInputs] = useState<RoiFormInputs>(() =>
    mergeRoiDefaults(
      initial
        ? {
            preventiviMese: initial.roiPreventiviMese ?? undefined,
            importoMedio: initial.roiImportoMedio ?? undefined,
            conversioneAttuale: initial.roiConversioneAttuale ?? undefined,
            margineCommessa: initial.roiMargineCommessa ?? undefined,
          }
        : null
    )
  );

  const [selected, setSelected] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (initial?.items?.length) {
      for (const it of initial.items) {
        if (!it?.productCode) continue;
        // In questo preventivatore le voci sono solo selezionabili (quantità sempre 1).
        map.set(it.productCode, 1);
      }
    }
    // I voucher Diagnosi/Audit sono salvati come flag su Quote (non come QuoteItem,
    // perchè rappresentano un credito già versato dal cliente, non una voce comprata).
    // L'API /api/quotes/create li toglie dagli items prima di persistere. Senza queste
    // due righe, al re-open del preventivo la spunta sparirebbe e il commerciale
    // perderebbe il voucher di -497€ / -147€ senza accorgersene.
    if (initial?.diagnosiGiaPagata) map.set(DIAGNOSI_CODE, 1);
    if (initial?.voucherAuditApplied) map.set(AUDIT_LAMPO_CODE, 1);
    return map;
  });

  const diagnosiGiaPagata = selected.has(DIAGNOSI_CODE);
  const voucherAuditApplied = selected.has(AUDIT_LAMPO_CODE);

  const [scontoCrmAnnuale, setScontoCrmAnnuale] = useState(initial?.scontoCrmAnnuale ?? true);
  const [scontoAiVocaleAnnuale, setScontoAiVocaleAnnuale] = useState(initial?.scontoAiVocaleAnnuale ?? false);
  const [scontoWaAnnuale, setScontoWaAnnuale] = useState(initial?.scontoWaAnnuale ?? false);
  // Credito MC: default UI = false (leva spenta). Sui preventivi gia' salvati si legge dal flag persistito.
  const [creditoMcEnabled, setCreditoMcEnabled] = useState(initial?.creditoMcEnabled ?? false);

  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [expiresInDays, setExpiresInDays] = useState(30);

  const [discountCodeInput, setDiscountCodeInput] = useState(initial?.discountCode ?? "");
  const [discountCodeMessage, setDiscountCodeMessage] = useState<string | null>(null);
  const [discountValidating, setDiscountValidating] = useState(false);
  const [manualDiscount, setManualDiscount] = useState<{
    code: string;
    discountPercent: number;
    discountAmount: number;
  } | null>(
    initial?.discountType === "manual" && initial.discountCode
      ? {
          code: initial.discountCode,
          discountPercent: Number(initial.discountPercent || 0),
          discountAmount: Number(initial.discountAmount || 0),
        }
      : null
  );

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(["FRONTEND", "01"]));
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string>(() => {
    return initial ? "INITIAL" : "";
  });

  // In alcune navigazioni Next può riusare l'istanza del componente (cache/back/soft nav).
  // In quel caso, se passi da "bozza" a "nuovo", dobbiamo resettare lo stato locale.
  const initialId = initial?.id ?? null;
  const pdfDisabledByKind = initial?.kind === "MANUAL";
  useEffect(() => {
    setError("");
    setSavingDraft(false);
    setSending(false);
    setQuoteId(initial?.id ?? null);

    setClientName(initial?.clientName ?? "");
    setClientCompany(initial?.clientCompany ?? "");
    setClientEmail(initial?.clientEmail ?? "");
    setClientPhone(initial?.clientPhone ?? "");
    setClientNotes(initial?.clientNotes ?? "");
    setCrmCustomerId(initial?.crmCustomerId ?? null);

    setClientAddress(initial?.clientAddress ?? "");
    setClientPostalCode(initial?.clientPostalCode ?? "");
    setClientCity(initial?.clientCity ?? "");
    setClientProvince(initial?.clientProvince ?? "");
    setClientVat(initial?.clientVat ?? "");
    setClientSdi(initial?.clientSdi ?? "");

    setOriginCliente(initial?.originCliente ?? "");
    setEstrattoDiagnosi(initial?.estrattoDiagnosi ?? "");

    setRoiInputs(
      mergeRoiDefaults(
        initial
          ? {
              preventiviMese: initial.roiPreventiviMese ?? undefined,
              importoMedio: initial.roiImportoMedio ?? undefined,
              conversioneAttuale: initial.roiConversioneAttuale ?? undefined,
              margineCommessa: initial.roiMargineCommessa ?? undefined,
            }
          : null
      )
    );

    setSelected(() => {
      const map = new Map<string, number>();
      if (initial?.items?.length) {
        for (const it of initial.items) {
          if (!it?.productCode) continue;
          map.set(it.productCode, 1);
        }
      }
      // Vedi nota nel useState init: i voucher Diagnosi/Audit sono flag, non items.
      if (initial?.diagnosiGiaPagata) map.set(DIAGNOSI_CODE, 1);
      if (initial?.voucherAuditApplied) map.set(AUDIT_LAMPO_CODE, 1);
      return map;
    });

    setScontoCrmAnnuale(initial?.scontoCrmAnnuale ?? true);
    setScontoAiVocaleAnnuale(initial?.scontoAiVocaleAnnuale ?? false);
    setScontoWaAnnuale(initial?.scontoWaAnnuale ?? false);
    setCreditoMcEnabled(initial?.creditoMcEnabled ?? false);

    setNotes(initial?.notes ?? "");

    // Reset codice sconto: sul "nuovo" deve essere vuoto; sulla bozza ripristiniamo il valore.
    setDiscountCodeInput(initial?.discountCode ?? "");
    setDiscountCodeMessage(null);
    setDiscountValidating(false);
    setManualDiscount(
      initial?.discountType === "manual" && initial.discountCode
        ? {
            code: initial.discountCode,
            discountPercent: Number(initial.discountPercent || 0),
            discountAmount: Number(initial.discountAmount || 0),
          }
        : null
    );

    setExpandedBlocks(new Set(["FRONTEND", "01"]));
    setExpandedDetails(new Set());

    setLastSavedFingerprint(initial ? "INITIAL" : "");
  }, [initialId]);

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

      if (!initial) {
        setRoiInputs(
          mergeRoiDefaults({
            preventiviMese: roiData?.defaultPreventiviMese,
            importoMedio: roiData?.defaultImportoMedio,
            conversioneAttuale: roiData?.defaultConversione,
            margineCommessa: roiData?.defaultMargine,
          })
        );
      }

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
  }, [initial]);

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

  // Tutto il calcolo prezzi/sconti/credito MC vive in un unico posto:
  // src/lib/pricing/engine.ts (puro, senza IO). Lo shape dell'output replica
  // i campi che il JSX qui sotto consuma da `totals.*`, quindi nessun
  // cambio di rendering. Vedi commenti nell'engine per le costanti business.
  const totals = useMemo(() => {
    const items = Array.from(selected.entries()).map(([productCode, quantity]) => ({
      productCode,
      quantity,
    }));
    const input: PricingInput = {
      catalog: products.map((p) => ({
        code: p.code,
        name: p.name,
        block: p.block,
        price: p.price,
        isMonthly: p.isMonthly,
      })),
      items,
      diagnosiGiaPagata,
      voucherAuditApplied,
      prepayments: {
        CRM: scontoCrmAnnuale,
        AIVOCALE: scontoAiVocaleAnnuale,
        WA: scontoWaAnnuale,
      },
      manualDiscount: manualDiscount
        ? {
            code: manualDiscount.code,
            percent: manualDiscount.discountPercent,
            fixedAmount:
              manualDiscount.discountAmount > 0 ? manualDiscount.discountAmount : undefined,
          }
        : null,
      legacyDiscountType: initial?.discountType ?? null,
      legacyDiscountAmount: initial?.discountAmount ?? null,
      legacyDiscountPercent: initial?.discountPercent ?? null,
      creditoMcEnabled,
    };
    return computePricing(input);
  }, [
    products,
    selected,
    diagnosiGiaPagata,
    voucherAuditApplied,
    scontoAiVocaleAnnuale,
    scontoCrmAnnuale,
    scontoWaAnnuale,
    manualDiscount,
    initial?.discountType,
    initial?.discountAmount,
    initial?.discountPercent,
    creditoMcEnabled,
  ]);

  const roiLive = useMemo(() => {
    // Senza alcuna voce dal listino non ha senso mostrare baseline/conversione/contratti:
    // sarebbero solo ipotesi da Impostazioni ROI, non legate al preventivo corrente.
    if (selected.size === 0) {
      const payload: RoiSnapshotPayload = {
        inputs: { ...roiInputs },
        fatturatoAnnuoBaseline: 0,
        margineAnnuoBaseline: 0,
        valoreFatturatoProposta: 0,
        margineStimatoProposta: 0,
        valoreQuotaDiagnosi: 0,
        indice: null,
        investimentoOrizzonteMesi: 12,
        diagnosiPesoTotale: 0,
        conversioneAttesa: 0,
      };
      return { snapshot: JSON.stringify(payload), payload };
    }

    const hasDce = DCE_ALLOWED_CODES.some((c) => selected.has(c));
    const investimentoOrizzonteMesi = hasDce ? 6 : 12;

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
      diagnosiPesoTotale,
      investimentoOrizzonteMesi
    );
  }, [products, roiInputs, selected, totals.monthlyAfterPrepay, totals.oneTimeTotal]);

  const roiExplain = useMemo(() => {
    if (selected.size === 0) {
      return { peso: 0, convAttesa: 0 };
    }

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
    if (selected.size === 0) {
      return {
        investimento: 0,
        deltaMargine: 0,
        paybackMesi: null as number | null,
        preventiviAnnui: (roiInputs.preventiviMese || 0) * 12,
        contrattiAttuali: 0,
        contrattiAttesi: 0,
      };
    }

    const payload = roiLive.payload;
    const investimento = payload.valoreFatturatoProposta;
    const deltaMargine = payload.margineStimatoProposta - payload.margineAnnuoBaseline;
    // Evita rientri "infinito" quando Δ margine è quasi zero (es. 0.01€/anno).
    // In quei casi il valore è tecnicamente corretto ma inutilizzabile in UI.
    const EPS_DELTA_MARGINE = 1; // €/anno
    const paybackMesi =
      deltaMargine > EPS_DELTA_MARGINE && investimento > 0 ? (investimento / deltaMargine) * 12 : null;

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
  }, [
    selected.size,
    roiExplain.convAttesa,
    roiInputs.conversioneAttuale,
    roiInputs.preventiviMese,
    roiLive.payload,
  ]);

  const paybackLabel = useMemo(() => {
    const v = roiQuick.paybackMesi;
    if (v == null || !Number.isFinite(v) || v <= 0) return "—";
    if (v >= 360) return "oltre 360 mesi";
    return `${v.toFixed(1)} mesi`;
  }, [roiQuick.paybackMesi]);

  const investimentoLabel = useMemo(() => {
    const mesi = roiLive.payload.investimentoOrizzonteMesi ?? 12;
    return mesi === 6 ? "Investimento (6 mesi)" : "Investimento (1° anno)";
  }, [roiLive.payload.investimentoOrizzonteMesi]);

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
    setDiscountCodeMessage("Codice applicato sul setup.");
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

  function buildPayloadForSave() {
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

    return {
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
      totalOneTime: totals.oneTimeTotal,
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
      creditoMcEnabled,
    };
  }

  function fingerprintPayload() {
    const payload = buildPayloadForSave();
    const sortedItems = [...(payload.items as any[])].sort((a, b) =>
      String(a.productCode).localeCompare(String(b.productCode))
    );
    return JSON.stringify({
      ...payload,
      items: sortedItems.map((it) => ({ code: it.productCode, q: it.quantity })),
      expiresAt: undefined,
    });
  }

  const hasUnsavedChanges = useMemo(() => {
    if (!products.length) return false;
    const fp = fingerprintPayload();
    return lastSavedFingerprint !== fp;
  }, [products.length, selected, clientName, clientCompany, clientEmail, clientPhone, clientNotes, crmCustomerId, clientAddress, clientPostalCode, clientCity, clientProvince, clientVat, clientSdi, originCliente, estrattoDiagnosi, roiInputs, notes, expiresInDays, totals, manualDiscount, scontoCrmAnnuale, scontoAiVocaleAnnuale, scontoWaAnnuale, lastSavedFingerprint]);

  async function saveDraft() {
    if (!clientName.trim()) {
      setError("Il nome del cliente è obbligatorio.");
      return null;
    }
    if (selected.size === 0) {
      setError("Seleziona almeno una voce dal listino.");
      return null;
    }

    setError("");
    setSavingDraft(true);

    const payload = buildPayloadForSave();

    const res = await fetch(quoteId ? `/api/quotes/${quoteId}` : "/api/quotes/create", {
      method: quoteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingDraft(false);

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      let message = `Errore nel salvataggio bozza (HTTP ${res.status}).`;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) message = String(parsed.error);
        } catch {
          message = `${message} ${raw.slice(0, 220)}`;
        }
      }
      setError(message);
      return null;
    }

    const quote = await res.json().catch(() => null);
    const newId = quote?.id ? String(quote.id) : quoteId;
    if (newId && !quoteId) setQuoteId(newId);
    setLastSavedFingerprint(fingerprintPayload());
    return newId || null;
  }

  async function sendQuote() {
    if (!quoteId) return;
    if (!clientEmail.trim()) return;
    const ok = window.confirm("Confermi l'invio del preventivo al cliente?");
    if (!ok) return;

    setSending(true);
    try {
      if (hasUnsavedChanges) {
        const savedId = await saveDraft();
        if (!savedId) return;
      }

      const res = await fetch("/api/quotes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let message = `Errore invio preventivo (HTTP ${res.status}).`;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.error) message = String(parsed.error);
          } catch {
            message = `${message} ${raw.slice(0, 220)}`;
          }
        }
        setError(message);
        return;
      }

      const sentBody = await res.json().catch(() => null);
      const crmWarnings =
        sentBody &&
        typeof sentBody === "object" &&
        Array.isArray((sentBody as { crmWarnings?: unknown }).crmWarnings)
          ? (sentBody as { crmWarnings: string[] }).crmWarnings.filter(
              (w) => typeof w === "string" && w.trim()
            )
          : [];
      if (crmWarnings.length > 0) {
        window.alert(
          "Preventivo inviato e bloccato, ma la sincronizzazione con Framework360 potrebbe essere incompleta:\n\n" +
            crmWarnings.join("\n\n")
        );
      }

      router.push(`/preventivi/${quoteId}`);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  if (loading) {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <ClienteForm
          clientName={clientName}
          setClientName={setClientName}
          clientCompany={clientCompany}
          setClientCompany={setClientCompany}
          clientEmail={clientEmail}
          setClientEmail={setClientEmail}
          clientPhone={clientPhone}
          setClientPhone={setClientPhone}
          clientNotes={clientNotes}
          setClientNotes={setClientNotes}
          clientAddress={clientAddress}
          setClientAddress={setClientAddress}
          clientPostalCode={clientPostalCode}
          setClientPostalCode={setClientPostalCode}
          clientCity={clientCity}
          setClientCity={setClientCity}
          clientProvince={clientProvince}
          setClientProvince={setClientProvince}
          clientVat={clientVat}
          setClientVat={setClientVat}
          clientSdi={clientSdi}
          setClientSdi={setClientSdi}
          crmCustomerId={crmCustomerId}
          setCrmCustomerId={setCrmCustomerId}
          onCrmSelect={(c) => {
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
          onClearCrm={() => setCrmCustomerId(null)}
        />

        <DiagnosiRoiInputs
          originCliente={originCliente}
          setOriginCliente={setOriginCliente}
          estrattoDiagnosi={estrattoDiagnosi}
          setEstrattoDiagnosi={setEstrattoDiagnosi}
          roiInputs={roiInputs}
          setRoiInputs={setRoiInputs}
        />

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
                      {(block === "CANONI_CRM" || block === "CANONI_AIVOCALE" || block === "CANONI_WA") && (
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
                          const showDetails = expandedDetails.has(p.code);
                          const includesArr = safeParseIncludes(p.includes);

                          return (
                            <div
                              key={p.id}
                              className="p-4"
                              style={{ background: isSelected ? "var(--mc-bg-selected)" : "transparent" }}
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
                                      <div className="text-sm italic mt-0.5" style={{ color: "var(--mc-text-secondary)" }}>
                                        {p.positioning}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-bold text-lg tabular-nums" style={{ color: "var(--mc-accent)" }}>
                                        {p.priceLabel || formatEuro(p.price)}
                                        {p.isMonthly && (
                                          <span className="text-xs font-normal ml-1" style={{ color: "var(--mc-text-muted)" }}>
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

        <ScadenzaENote
          expiresInDays={expiresInDays}
          setExpiresInDays={setExpiresInDays}
          notes={notes}
          setNotes={setNotes}
        />
      </div>

      <div className="lg:col-span-1 lg:self-start">
        {/* Sticky sotto la navbar (h-14 = 56px). top-20 = 80px lascia 24px di
           aria fra navbar e sidebar; max-h calcolato in modo speculare per non
           tagliare il bottone "Invia" quando la sidebar è più alta del viewport. */}
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto lg:overscroll-contain">
          <div className="card p-5 space-y-4">
          {/* (Sidebar totals e ROI: manteniamo le stesse classi/stili già usate in pagina nuovo) */}

          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mc-text-secondary)" }}>
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
                        {row.quantity > 1 ? <span className="opacity-80"> · {row.quantity}×</span> : null}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatEuro(row.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--mc-border)" }}>
                <span className="font-semibold" style={{ color: "var(--mc-text)" }}>
                  Setup totale
                </span>
                <span className="font-bold tabular-nums">{formatEuro(totals.setupGross)}</span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--mc-text-muted)" }}>
                Somma delle voci «una tantum» selezionate.
              </p>

              {(totals.crmMonthly > 0 || totals.aiMonthly > 0 || totals.waMonthly > 0) && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--mc-border)" }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--mc-text-secondary)" }}>
                    Canoni a pagamento annuale anticipato
                  </div>
                  <p className="text-[10px] mb-3" style={{ color: "var(--mc-text-muted)" }}>
                    Se attivo, l’importo dell’annuo anticipato (al netto dello sconto) confluisce nelle voci una tantum del
                    primo anno; la stessa voce scompare da «Ricorrenza mensile».
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
                            <div className="mt-1.5 space-y-0.5 pl-0.5" style={{ color: "var(--mc-text-secondary)" }}>
                              <div className="flex justify-between gap-2">
                                <span>12× canone ({formatEuro(totals.crmMonthly)}/mese)</span>
                                <span className="tabular-nums">{formatEuro(totals.crmPrepayBreakdown.fullAnnual)}</span>
                              </div>
                              <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                <span>Sconto 20% su quell’importo</span>
                                <span className="tabular-nums">−{formatEuro(totals.crmPrepayBreakdown.discountAmount)}</span>
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
                            <div className="mt-1.5 space-y-0.5 pl-0.5" style={{ color: "var(--mc-text-secondary)" }}>
                              <div className="flex justify-between gap-2">
                                <span>12× canone ({formatEuro(totals.aiMonthly)}/mese)</span>
                                <span className="tabular-nums">{formatEuro(totals.aiPrepayBreakdown.fullAnnual)}</span>
                              </div>
                              <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                <span>Sconto 15% su quell’importo</span>
                                <span className="tabular-nums">−{formatEuro(totals.aiPrepayBreakdown.discountAmount)}</span>
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
                            <div className="mt-1.5 space-y-0.5 pl-0.5" style={{ color: "var(--mc-text-secondary)" }}>
                              <div className="flex justify-between gap-2">
                                <span>12× canone ({formatEuro(totals.waMonthly)}/mese)</span>
                                <span className="tabular-nums">{formatEuro(totals.waPrepayBreakdown.fullAnnual)}</span>
                              </div>
                              <div className="flex justify-between gap-2" style={{ color: "var(--mc-success)" }}>
                                <span>Sconto 15% su quell’importo</span>
                                <span className="tabular-nums">−{formatEuro(totals.waPrepayBreakdown.discountAmount)}</span>
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

            {totals.discountAmount > 0 && (
              <div className="flex justify-between gap-2 pt-1" style={{ color: "var(--mc-success)" }}>
                <span className="text-xs min-w-0">{totals.discountLabel}</span>
                <span className="font-semibold text-xs tabular-nums shrink-0">−{formatEuro(totals.discountAmount)}</span>
              </div>
            )}

            {/* Toggle Credito Metodo Cantiere: leva commerciale on/off.
               Visibile solo se c'è almeno una voce in preventivo. Default UI off:
               si accende caso per caso quando il commerciale vuole offrirlo come bonus. */}
            {selected.size > 0 && (
              <div
                className="mt-3 rounded-lg p-3 flex items-start gap-3"
                style={{
                  background: creditoMcEnabled
                    ? "linear-gradient(135deg, rgba(45, 122, 62, 0.14), rgba(45, 122, 62, 0.05))"
                    : "var(--mc-bg-elevated)",
                  border: creditoMcEnabled
                    ? "1px solid rgba(45, 122, 62, 0.4)"
                    : "1px solid var(--mc-border)",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  id="credito-mc-toggle"
                  type="checkbox"
                  checked={creditoMcEnabled}
                  onChange={(e) => setCreditoMcEnabled(e.target.checked)}
                  className="mt-0.5 cursor-pointer"
                  style={{ accentColor: "#2D7A3E" }}
                />
                <label htmlFor="credito-mc-toggle" className="flex-1 cursor-pointer min-w-0">
                  <div
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: creditoMcEnabled ? "#2D7A3E" : "var(--mc-text-secondary)" }}
                  >
                    Credito Metodo Cantiere
                  </div>
                  {creditoMcEnabled ? (
                    <>
                      <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: "#2D7A3E" }}>
                        {formatEuro(totals.creditoMetodoCantiere)}
                      </div>
                      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--mc-text-secondary)" }}>
                        10% sul netto setup modulo listino (dopo voucher Diagnosi/Audit e sconto codice sul setup). I canoni
                        in anticipo annuo non entrano in questa base. Spendibile entro 12 mesi su qualunque voce del listino.
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--mc-text-muted)" }}>
                      Leva commerciale spenta. Attivala se vuoi offrire al cliente un credito del 10% sul setup, spendibile
                      entro 12 mesi su qualunque voce del listino.
                    </p>
                  )}
                </label>
              </div>
            )}
          </div>

          <div className="pt-4" style={{ borderTop: "2px solid var(--mc-text)" }}>
            <div className="label">Totale primo anno</div>
            <div className="text-3xl font-bold tabular-nums mt-0.5" style={{ color: "var(--mc-accent)", letterSpacing: "-0.02em" }}>
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
            <p className="helper-text">Si applica al netto setup (dopo voucher Diagnosi/Audit).</p>
          </div>

          <div className="card-muted p-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2">ROI (live)</div>
            {selected.size === 0 && (
              <p className="text-[11px] leading-snug mb-2" style={{ color: "var(--mc-text-muted)" }}>
                Seleziona almeno una voce dal listino per calcolare conversione, margini e contratti sul preventivo.
              </p>
            )}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span style={{ color: "var(--mc-text-secondary)" }}>Peso ROI totale</span>
                <span className="font-semibold tabular-nums">{roiExplain.peso.toFixed(0)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: "var(--mc-text-secondary)" }}>Conversione attesa</span>
                <span className="font-semibold tabular-nums">{(roiExplain.convAttesa * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: "var(--mc-text-secondary)" }}>Margine baseline</span>
                <span className="font-semibold tabular-nums">{formatEuro(roiLive.payload.margineAnnuoBaseline)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span style={{ color: "var(--mc-text-secondary)" }}>Margine stimato proposta</span>
                <span className="font-semibold tabular-nums">{formatEuro(roiLive.payload.margineStimatoProposta)}</span>
              </div>
              <div className="pt-2 mt-2 space-y-1" style={{ borderTop: "1px solid var(--mc-border)" }}>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>{investimentoLabel}</span>
                  <span className="font-semibold tabular-nums">{formatEuro(roiQuick.investimento)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Δ margine (stima)</span>
                  <span className="font-semibold tabular-nums">{formatEuro(roiQuick.deltaMargine)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Rientro stimato</span>
                  <span className="font-semibold tabular-nums">
                    {paybackLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Contratti/anno</span>
                  <span className="font-semibold tabular-nums">
                    {roiQuick.contrattiAttuali.toFixed(1)} → {roiQuick.contrattiAttesi.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={savingDraft || selected.size === 0}
            className="btn-primary w-full"
          >
            {savingDraft ? "Salvataggio..." : "Salva bozza"}
          </button>

          {/* Stampa PDF: sempre visibile (tranne preventivi manuali, che non hanno PDF di listino).
             Disabilitato finché non c'è una bozza salvata, così il commerciale capisce che il PDF
             esiste e cosa serve fare per generarlo. */}
          {!pdfDisabledByKind && (
            <>
              {quoteId ? (
                <a
                  href={`/api/quotes/${quoteId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full text-center block"
                >
                  Stampa / scarica PDF
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-secondary w-full text-center block"
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                  title="Salva la bozza per generare il PDF di anteprima"
                >
                  Stampa / scarica PDF
                </button>
              )}
              {quoteId && hasUnsavedChanges && (
                <p className="text-[11px] text-center leading-snug" style={{ color: "var(--mc-accent)" }}>
                  Salva la bozza prima di stampare così il PDF riflette le ultime modifiche.
                </p>
              )}
              {!quoteId && (
                <p className="text-[11px] text-center leading-snug" style={{ color: "var(--mc-text-muted)" }}>
                  Salva la bozza per generare il PDF di anteprima.
                </p>
              )}
            </>
          )}

          {quoteId && pdfDisabledByKind && (
            <p className="text-[11px] text-center" style={{ color: "var(--mc-text-muted)" }}>
              PDF listino non disponibile per preventivi manuali.
            </p>
          )}

          {/* Invia preventivo: sempre visibile (tranne preventivi manuali). Disabilitato finché non
             ci sono bozza salvata + email cliente. Hint sotto spiega cosa manca. */}
          {!pdfDisabledByKind && (() => {
            const missingDraft = !quoteId;
            const missingEmail = !clientEmail.trim();
            const canSend = !missingDraft && !missingEmail;
            const hint = missingDraft
              ? "Salva la bozza per abilitare l'invio al cliente."
              : missingEmail
                ? "Aggiungi un'email cliente per poter inviare il preventivo."
                : "";
            return (
              <>
                <button
                  type="button"
                  onClick={() => void sendQuote()}
                  disabled={sending || !canSend}
                  className="w-full font-semibold rounded-lg px-4 py-3 transition-all"
                  style={{
                    background: "#FF6A00",
                    color: "white",
                    border: "1px solid rgba(0,0,0,0.06)",
                    opacity: sending || !canSend ? 0.5 : 1,
                    cursor: !canSend && !sending ? "not-allowed" : "pointer",
                  }}
                  title={hint || undefined}
                >
                  {sending ? "Invio..." : "Invia preventivo"}
                </button>
                {hint && (
                  <p className="text-[11px] text-center leading-snug" style={{ color: "var(--mc-text-muted)" }}>
                    {hint}
                  </p>
                )}
              </>
            );
          })()}

          <p className="text-xs text-center" style={{ color: "var(--mc-text-muted)" }}>
            {quoteId
              ? hasUnsavedChanges
                ? "Hai modifiche non salvate."
                : "Bozza salvata: puoi stampare il PDF e inviare al cliente."
              : "Salva la bozza almeno una volta per ottenere il PDF e poter inviare al cliente."}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

