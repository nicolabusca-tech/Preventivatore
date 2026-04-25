// Libreria sconti Metodo Cantiere v1.4
// =====================================
// Centralizza tutta la logica di calcolo sconti, soglie bonus e totali del preventivo.
//
// Novità v1.4 (B3):
// - Sconto pagamento annuale anticipato PER CATEGORIA di canone
//   (CRM -20%, AI Vocale -15%, WhatsApp -15%) - canone diventa una tantum
// - Sistema bonus a soglie (3+ / 5+ / 7+ moduli con almeno un canone)
// - Indicatore "manca X moduli per prossimo sconto/soglia"

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
// SCONTO VOLUME (automatico, su moduli setup)
// ============================================================
// 3+ moduli setup distinti = -5%
// 5+ moduli setup distinti = -10%
// I canoni mensili NON contano nel volume.

export function calcolaScontoVolume(items: SelectedItem[]): DiscountResult {
  const setupItems = items.filter((i) => !i.isMonthly);
  const numSetup = setupItems.length;
  const setupTotal = setupItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (numSetup >= 5) {
    const amount = Math.round(setupTotal * 0.1);
    return {
      type: "volume_10",
      amount,
      percent: 10,
      label: "Sconto volume −10% (5+ moduli)",
    };
  }
  if (numSetup >= 3) {
    const amount = Math.round(setupTotal * 0.05);
    return {
      type: "volume_5",
      amount,
      percent: 5,
      label: "Sconto volume −5% (3+ moduli)",
    };
  }
  return { type: "none", amount: 0, percent: 0, label: "" };
}

// Quanti moduli mancano per il prossimo gradino di sconto volume.
// Restituisce null se siamo già al massimo (10%).
export function prossimoScontoVolume(
  items: SelectedItem[]
): { needed: number; nextPercent: number } | null {
  const numSetup = items.filter((i) => !i.isMonthly).length;
  if (numSetup >= 5) return null;
  if (numSetup >= 3) return { needed: 5 - numSetup, nextPercent: 10 };
  return { needed: 3 - numSetup, nextPercent: 5 };
}

// ============================================================
// CODICE SCONTO MANUALE
// ============================================================

export function applicaCodiceManuale(
  setupTotal: number,
  percent: number,
  code: string
): DiscountResult {
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
    if (monthly === 0) return { prepayment: 0, risparmio: 0 };
    const fullAnnual = monthly * 12;
    const sconto = ANNUAL_DISCOUNT_PERCENT[cat];
    const prepayment = Math.round(fullAnnual * (1 - sconto / 100));
    const risparmio = fullAnnual - prepayment;
    return { prepayment, risparmio };
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
