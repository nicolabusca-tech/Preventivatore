// Libreria sconti Metodo Cantiere v1.4
// =====================================
// Centralizza tutta la logica di calcolo sconti, soglie bonus e totali del preventivo.
//
// Novità v1.4 (B3):
// - Sconto pagamento annuale anticipato PER CATEGORIA di canone
//   (CRM -20%, AI Vocale -15%, WhatsApp -15%) - canone diventa una tantum
// - Sistema bonus a soglie (3+ / 5+ / 7+ moduli con almeno un canone)
// - Indicatore "manca X moduli per prossimo sconto/soglia"
//
// v1.5: niente più sconto automatico a volume sul listino; al suo posto solo Credito MC (10% sul netto setup modulo listino).

// ============================================================
// TYPES
// ============================================================

export type Product = {
  id: string;
  code: string;
  name: string;
  block: string;
  type: string;
  price: number;
  isMonthly: boolean;
  bundleItems?: string | null;
};

export type SelectedItem = {
  code: string;
  qty: number;
  price: number;
  isMonthly: boolean;
  block: string;
};

export type DiscountResult = {
  type: "none" | "volume_5" | "volume_10" | "manual";
  amount: number;
  percent: number;
  label: string;
};

// Categoria di canone: CRM, AI Vocale, WhatsApp.
// Determinata dal block del prodotto.
export type CanoneCategory = "CRM" | "AIVOCALE" | "WA";

export type AnnualPrepayments = {
  CRM: boolean;
  AIVOCALE: boolean;
  WA: boolean;
};

// Sconti annuali per categoria
export const ANNUAL_DISCOUNT_PERCENT: Record<CanoneCategory, number> = {
  CRM: 20,
  AIVOCALE: 15,
  WA: 15,
};

/**
 * Incasso anticipato: canone mensile del listino scelto × 12, poi sconto % **solo** su quell'importo.
 * Coerente con PDF (arretrato: sconto = round(annuo × p/100), netto = annuo − sconto).
 */
export function canonePrepayFromMonthly(
  monthlyAmount: number,
  category: CanoneCategory
): { fullAnnual: number; discountAmount: number; netOneTime: number } {
  if (monthlyAmount <= 0) {
    return { fullAnnual: 0, discountAmount: 0, netOneTime: 0 };
  }
  const pct = ANNUAL_DISCOUNT_PERCENT[category];
  const fullAnnual = monthlyAmount * 12;
  const discountAmount = Math.round((fullAnnual * pct) / 100);
  const netOneTime = fullAnnual - discountAmount;
  return { fullAnnual, discountAmount, netOneTime };
}

// Mappa block -> categoria canone
export function blockToCanoneCategory(block: string): CanoneCategory | null {
  if (block === "CANONI_CRM") return "CRM";
  if (block === "CANONI_AIVOCALE") return "AIVOCALE";
  if (block === "CANONI_WA") return "WA";
  return null;
}

// ============================================================
// FORMATTAZIONE
// ============================================================

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================
// SCONTO VOLUME — dismesso (solo Credito MC, vedi sotto)
// ============================================================
// Manteniamo la firma per compatibilità con codice esistente; non applica più sconti automatici.

export function calcolaScontoVolume(_items: SelectedItem[]): DiscountResult {
  return { type: "none", amount: 0, percent: 0, label: "" };
}

/** @deprecated Non più usato (nessuno sconto a gradini sul listino). */
export function prossimoScontoVolume(
  _items: SelectedItem[]
): { needed: number; nextPercent: number } | null {
  return null;
}

// ============================================================
// CREDITO METODO CANTIERE (10% sul netto setup modulo listino)
// ============================================================
// Base: somma voci setup listino (`setupBeforeDiscount`), meno voucher Diagnosi/Audit già versati,
// meno sconto manuale/codice applicato al setup. I canoni in anticipo annuo non entrano in setupBeforeDiscount.
// Preventivi storici con discountType volume_*: il “sconto volume” non decurtava il listino → non lo sottraiamo dalla base credito.

const VOUCHER_DIAGNOSI_SETUP = 497;
const VOUCHER_AUDIT_SETUP = 147;

export type CreditoMcInput = {
  setupBeforeDiscount: number;
  diagnosiGiaPagata: boolean;
  voucherAuditApplied: boolean;
  discountType: string | null | undefined;
  discountAmount: number | null | undefined;
  discountPercent: number | null | undefined;
};

export function computeCreditoMetodoCantiere(input: CreditoMcInput): number {
  const gross = Math.max(0, Math.round(Number(input.setupBeforeDiscount) || 0));
  let afterVouchers = gross;
  if (input.diagnosiGiaPagata) {
    afterVouchers = Math.max(0, afterVouchers - VOUCHER_DIAGNOSI_SETUP);
  }
  if (input.voucherAuditApplied) {
    afterVouchers = Math.max(0, afterVouchers - VOUCHER_AUDIT_SETUP);
  }

  const isVolumeLegacy =
    input.discountType === "volume_5" || input.discountType === "volume_10";
  const stored = Math.max(0, Math.round(Number(input.discountAmount) || 0));
  const pct = Math.max(0, Math.round(Number(input.discountPercent) || 0));
  const fromPct = pct > 0 ? Math.round((afterVouchers * pct) / 100) : 0;
  const rawDiscount = stored > 0 ? Math.min(stored, afterVouchers) : fromPct;
  const setupDiscount = isVolumeLegacy ? 0 : Math.min(rawDiscount, afterVouchers);
  const base = Math.max(0, afterVouchers - setupDiscount);
  return Math.round(base * 0.1);
}

// ============================================================
// CODICE SCONTO MANUALE
// ============================================================

export function applicaCodiceManuale(
  setupTotal: number,
  percent: number,
  code: string,
  opts?: { fixedAmount?: number }
): DiscountResult {
  const fixed = opts?.fixedAmount;
  if (fixed != null && fixed > 0) {
    const amount = Math.min(Math.round(fixed), Math.max(0, setupTotal));
    return {
      type: "manual",
      amount,
      percent: 0,
      label: `Codice ${code} (−${amount} €)`,
    };
  }

  const amount = Math.round(setupTotal * (percent / 100));
  return {
    type: "manual",
    amount,
    percent,
    label: `Codice ${code} (−${percent}%)`,
  };
}

// ============================================================
// BUNDLE SUGGERITI
// ============================================================
// Se l'utente ha selezionato singolarmente tutti i moduli che compongono
// un bundle, suggeriamo di sostituirli col bundle (più conveniente).

export type BundleSuggestion = {
  bundleCode: string;
  bundleName: string;
  bundlePrice: number;
  currentSum: number;
  savings: number;
  itemsToReplace: string[];
};

export function rilevaBundleSuggeriti(
  items: SelectedItem[],
  products: Product[]
): BundleSuggestion[] {
  const selectedCodes = new Set(items.map((i) => i.code));
  const suggestions: BundleSuggestion[] = [];

  for (const p of products) {
    if (p.type !== "bundle" || !p.bundleItems) continue;
    if (selectedCodes.has(p.code)) continue; // già selezionato

    let bundleItemCodes: string[];
    try {
      bundleItemCodes = JSON.parse(p.bundleItems);
    } catch {
      continue;
    }
    if (!Array.isArray(bundleItemCodes) || bundleItemCodes.length === 0) continue;

    // Controlliamo se tutti i moduli del bundle sono selezionati
    const allSelected = bundleItemCodes.every((code) => selectedCodes.has(code));
    if (!allSelected) continue;

    const currentSum = items
      .filter((i) => bundleItemCodes.includes(i.code))
      .reduce((sum, i) => sum + i.price * i.qty, 0);

    const savings = currentSum - p.price;
    if (savings <= 0) continue; // bundle non è conveniente

    suggestions.push({
      bundleCode: p.code,
      bundleName: p.name,
      bundlePrice: p.price,
      currentSum,
      savings,
      itemsToReplace: bundleItemCodes,
    });
  }

  return suggestions;
}

// ============================================================
// SISTEMA BONUS A SOGLIE (logica C, v1.4)
// ============================================================
// Soglia 1: 3+ moduli totali
// Soglia 2: 5+ moduli totali
// Soglia 3: 7+ moduli totali CON almeno un canone

export type BonusItem = {
  name: string;
  value: number; // valore stralciato in euro
};

export type SogliaInfo = {
  level: 0 | 1 | 2 | 3;
  bonuses: BonusItem[];
  totalValue: number;
  // Info per indicatore "manca X per prossima soglia"
  nextThreshold: {
    level: 1 | 2 | 3;
    needed: number; // numero moduli mancanti
    needsCanone: boolean; // serve anche almeno un canone?
  } | null;
};

const BONUS_SOGLIA_1: BonusItem[] = [
  { name: "Library 15 script edilizia (PDF)", value: 297 },
  { name: "30 giorni supporto prioritario", value: 497 },
];

const BONUS_SOGLIA_2_AGGIUNTIVI: BonusItem[] = [
  { name: "3 mesi canone CRM gratis", value: 261 },
  { name: "1 sessione coaching individuale titolare", value: 297 },
  { name: "Report mensile scritto (6 mesi)", value: 1782 },
];

const BONUS_SOGLIA_3_AGGIUNTIVI: BonusItem[] = [
  { name: "Giornata strategica con Nicola Busca on-site", value: 2997 },
];

export function calcolaSoglieBonus(items: SelectedItem[]): SogliaInfo {
  const totalModules = items.length;
  const hasCanone = items.some((i) => i.isMonthly);

  let level: 0 | 1 | 2 | 3 = 0;
  if (totalModules >= 7 && hasCanone) level = 3;
  else if (totalModules >= 5) level = 2;
  else if (totalModules >= 3) level = 1;

  const bonuses: BonusItem[] = [];
  if (level >= 1) bonuses.push(...BONUS_SOGLIA_1);
  if (level >= 2) bonuses.push(...BONUS_SOGLIA_2_AGGIUNTIVI);
  if (level >= 3) bonuses.push(...BONUS_SOGLIA_3_AGGIUNTIVI);

  const totalValue = bonuses.reduce((sum, b) => sum + b.value, 0);

  // Calcolo prossima soglia
  let nextThreshold: SogliaInfo["nextThreshold"] = null;
  if (level === 0) {
    nextThreshold = { level: 1, needed: 3 - totalModules, needsCanone: false };
  } else if (level === 1) {
    nextThreshold = { level: 2, needed: 5 - totalModules, needsCanone: false };
  } else if (level === 2) {
    if (!hasCanone) {
      // Serve almeno un canone per soglia 3
      const moduliMancanti = Math.max(0, 7 - totalModules);
      nextThreshold = {
        level: 3,
        needed: moduliMancanti,
        needsCanone: true,
      };
    } else {
      nextThreshold = {
        level: 3,
        needed: Math.max(0, 7 - totalModules),
        needsCanone: false,
      };
    }
  }

  return { level, bonuses, totalValue, nextThreshold };
}

// ============================================================
// CALCOLO TOTALI (con sconto annuale per categoria)
// ============================================================

export type TotalsResult = {
  // Voci setup
  setupBeforeDiscount: number;
  setupAfterDiscount: number;

  // Voci canoni mensili (categoria attiva = pagamento mese per mese)
  monthlyCrm: number;
  monthlyAiVocale: number;
  monthlyWa: number;
  monthlyOther: number; // canoni non categorizzati (es. ADS, DCE)
  monthlyTotal: number; // somma mensile totale (prima di eventuali sconti annuali)

  // Una tantum aggiuntive per pagamenti annuali anticipati
  annualPrepaymentCrm: number; // 12 * canone CRM * (1 - 0.20)
  annualPrepaymentAiVocale: number;
  annualPrepaymentWa: number;
  annualPrepaymentTotal: number;

  // Sconti annuali (info per UI)
  scontoCrmAnnuale: number; // risparmio in € applicando lo sconto 20% sui canoni CRM
  scontoAiVocaleAnnuale: number;
  scontoWaAnnuale: number;

  // Totali finali
  oneTimeTotal: number; // setupAfterDiscount (totale setup una tantum)
  annualTotal: number; // oneTimeTotal + (canoni mensili × 12) - risparmi sconti annuali
};

export function calcolaTotali(
  items: SelectedItem[],
  discount: DiscountResult,
  annualPrepayments: AnnualPrepayments,
  voucherAuditApplied: boolean
): TotalsResult {
  // Setup
  const setupItems = items.filter((i) => !i.isMonthly);
  const setupBeforeDiscount = setupItems.reduce(
    (sum, i) => sum + i.price * i.qty,
    0
  );
  let setupAfterDiscount = setupBeforeDiscount - discount.amount;
  if (voucherAuditApplied) setupAfterDiscount -= 147;
  if (setupAfterDiscount < 0) setupAfterDiscount = 0;

  // Canoni mensili separati per categoria
  const canoneItems = items.filter((i) => i.isMonthly);
  let monthlyCrm = 0;
  let monthlyAiVocale = 0;
  let monthlyWa = 0;
  let monthlyOther = 0;

  for (const c of canoneItems) {
    const cat = blockToCanoneCategory(c.block);
    const monthlyAmount = c.price; // i canoni sono sempre price/mese, qty=1
    if (cat === "CRM") monthlyCrm += monthlyAmount;
    else if (cat === "AIVOCALE") monthlyAiVocale += monthlyAmount;
    else if (cat === "WA") monthlyWa += monthlyAmount;
    else monthlyOther += monthlyAmount;
  }

  // Per ogni categoria con annualPrepayment attivo:
  // - rimuoviamo il canone mensile dal "monthlyTotal"
  // - calcoliamo l'importo annuale anticipato (12 mesi * (1 - sconto%))
  const computeAnnualPrepayment = (
    monthly: number,
    cat: CanoneCategory
  ): { prepayment: number; risparmio: number } => {
    const d = canonePrepayFromMonthly(monthly, cat);
    return { prepayment: d.netOneTime, risparmio: d.discountAmount };
  };

  const crmCalc = annualPrepayments.CRM
    ? computeAnnualPrepayment(monthlyCrm, "CRM")
    : { prepayment: 0, risparmio: 0 };
  const aiCalc = annualPrepayments.AIVOCALE
    ? computeAnnualPrepayment(monthlyAiVocale, "AIVOCALE")
    : { prepayment: 0, risparmio: 0 };
  const waCalc = annualPrepayments.WA
    ? computeAnnualPrepayment(monthlyWa, "WA")
    : { prepayment: 0, risparmio: 0 };

  // Canoni residui mensili (quelli senza prepayment annuale)
  const monthlyTotal = monthlyCrm + monthlyAiVocale + monthlyWa + monthlyOther;

  const annualDiscountSavings =
    (annualPrepayments.CRM ? crmCalc.risparmio : 0) +
    (annualPrepayments.AIVOCALE ? aiCalc.risparmio : 0) +
    (annualPrepayments.WA ? waCalc.risparmio : 0);

  const oneTimeTotal = setupAfterDiscount;
  const annualTotal = oneTimeTotal + monthlyTotal * 12 - annualDiscountSavings;

  return {
    setupBeforeDiscount,
    setupAfterDiscount,
    monthlyCrm,
    monthlyAiVocale,
    monthlyWa,
    monthlyOther,
    monthlyTotal,
    annualPrepaymentCrm: crmCalc.prepayment,
    annualPrepaymentAiVocale: aiCalc.prepayment,
    annualPrepaymentWa: waCalc.prepayment,
    annualPrepaymentTotal: crmCalc.prepayment + aiCalc.prepayment + waCalc.prepayment,
    scontoCrmAnnuale: crmCalc.risparmio,
    scontoAiVocaleAnnuale: aiCalc.risparmio,
    scontoWaAnnuale: waCalc.risparmio,
    oneTimeTotal,
    annualTotal,
  };
}
