// Pricing engine — sorgente unica di verità per i totali del preventivo.
//
// Tutto il calcolo "ricavi" del preventivatore Metodo Cantiere passa da qui:
// - QuoteEditor (UI live)
// - PDF template (numeri stampati)
// - Piano pagamenti (setupNet, prepay)
// - API quotes/create (snapshot salvato a DB) — opzionale, vedi step 2b
//
// Funzione `computePricing` è PURA: nessun accesso a DB, nessuna fetch.
// Riceve catalogo + voci selezionate + flag voucher/prepay/sconto e
// restituisce TUTTI i numeri che servono a UI/PDF/payment-plan, già pronti.
//
// Lo shape dell'output replica esattamente i campi che QuoteEditor.tsx oggi
// espone come `totals.*` (compresi `setupBreakdown`, `monthlyBreakdown`, i
// `*PrepayBreakdown`, `creditoMetodoCantiere`, `discountAmount/Code/...`)
// così il JSX non va toccato e la migrazione è risk-free.

// ----------------------------------------------------------------------------
// Costanti business (oggi sono ripetute in 4 punti diversi: qui diventano UNA).
// ----------------------------------------------------------------------------

export const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";
export const AUDIT_LAMPO_CODE = "AUDIT_LAMPO";
export const DIAGNOSI_VOUCHER_AMOUNT = 497;
export const AUDIT_VOUCHER_AMOUNT = 147;

export const PREPAY_PERCENT_CRM = 20;
export const PREPAY_PERCENT_AIVOCALE = 15;
export const PREPAY_PERCENT_WA = 15;

export const CREDITO_MC_PERCENT = 10;

// ----------------------------------------------------------------------------
// Tipi pubblici
// ----------------------------------------------------------------------------

export type PricingProductInfo = {
  code: string;
  name: string;
  block: string;
  price: number;
  isMonthly: boolean;
};

/**
 * Riga selezionata. Se la voce è in `catalog`, basta `productCode`+`quantity`.
 * Per voci "manuali" (preventivo manuale, prefix MANUAL_) si possono passare
 * gli override di name/price/isMonthly direttamente.
 */
export type PricingItem = {
  productCode: string;
  quantity?: number;
  price?: number;
  isMonthly?: boolean;
  productName?: string;
  block?: string;
};

export type PricingPrepayments = {
  CRM: boolean;
  AIVOCALE: boolean;
  WA: boolean;
};

export type PricingManualDiscount = {
  code: string;
  /** percentuale 0..100; ignorata se `fixedAmount` > 0 */
  percent: number;
  /** sconto fisso in € (vince sul percent se >0) */
  fixedAmount?: number;
} | null;

export type PricingInput = {
  catalog: PricingProductInfo[];
  items: PricingItem[];
  diagnosiGiaPagata: boolean;
  voucherAuditApplied: boolean;
  prepayments: PricingPrepayments;
  manualDiscount: PricingManualDiscount;
  /**
   * Solo per preventivi storici con discountType "volume_5"/"volume_10":
   * cambia il calcolo del Credito MC (lo sconto volume non decurtava il listino,
   * quindi non va sottratto dalla base credito).
   * Se è in corso uno sconto manuale, questo viene ignorato (il manuale vince).
   */
  legacyDiscountType?: string | null;
  /**
   * Fallback per il Credito MC quando si sta riaprendo un preventivo storico
   * salvato come "manual" e l'utente ha rimosso il codice in UI: in quel caso
   * il calcolo del credito deve comunque tener conto dello sconto storico.
   * Ignorati se è presente un `manualDiscount` attivo.
   */
  legacyDiscountAmount?: number | null;
  legacyDiscountPercent?: number | null;
  /**
   * Flag per attivare/disattivare il Credito Metodo Cantiere su questo
   * preventivo. Quando false, `creditoMetodoCantiere` esce sempre 0 e il
   * blocco non va mostrato in UI/PDF. Default true per coerenza con i
   * preventivi storici, ma la UI dei nuovi preventivi parte con false.
   */
  creditoMcEnabled?: boolean;
};

export type BreakdownLine = {
  name: string;
  lineTotal: number;
  quantity: number;
  code: string;
};

export type PrepayBreakdown = {
  fullAnnual: number;
  discountAmount: number;
  netOneTime: number;
};

export type PricingOutput = {
  // setup
  setupGross: number;
  setup: number; // dopo voucher (compat: era `baseTotals.setup`)
  setupAfterVoucher: number; // alias di `setup`
  setupNet: number; // dopo discount manuale
  voucherDiagnosi: number;
  voucherAudit: number;

  // breakdown UI
  setupBreakdown: BreakdownLine[];
  monthlyBreakdown: BreakdownLine[];

  // mensili lordi
  monthly: number;
  crmMonthly: number;
  aiMonthly: number;
  waMonthly: number;
  monthlyOther: number;

  // residui mensili (al netto dei prepay annuali)
  monthlyAfterPrepay: number;

  // prepay annuali — null se non attivati o canone della categoria a 0
  prepaidCrm: number;
  prepaidAi: number;
  prepaidWa: number;
  crmPrepayBreakdown: PrepayBreakdown | null;
  aiPrepayBreakdown: PrepayBreakdown | null;
  waPrepayBreakdown: PrepayBreakdown | null;

  // sconto manuale (compat con `totals.discount*`)
  discountType: "manual" | null;
  discountCode: string | null;
  discountPercent: number;
  discountAmount: number;
  discountLabel: string;

  // totali finali
  oneTimeTotal: number;
  annualTotal: number;

  // credito MC (10% sul setup netto, esclusi voucher e sconto manuale,
  // tranne discountType legacy "volume_*" che non decurta la base)
  creditoMetodoCantiere: number;
};

// ----------------------------------------------------------------------------
// Funzioni di supporto (esportate per riuso e per i test)
// ----------------------------------------------------------------------------

export type CanoneCategory = "CRM" | "AIVOCALE" | "WA";

export function blockToCategory(block: string): CanoneCategory | null {
  if (block === "CANONI_CRM") return "CRM";
  if (block === "CANONI_AIVOCALE") return "AIVOCALE";
  if (block === "CANONI_WA") return "WA";
  return null;
}

function categoryPercent(cat: CanoneCategory): number {
  if (cat === "CRM") return PREPAY_PERCENT_CRM;
  if (cat === "AIVOCALE") return PREPAY_PERCENT_AIVOCALE;
  return PREPAY_PERCENT_WA;
}

/** Anticipo annuale: (canone × 12) − sconto% di categoria. */
export function prepayFromMonthly(
  monthly: number,
  cat: CanoneCategory
): PrepayBreakdown {
  if (monthly <= 0) return { fullAnnual: 0, discountAmount: 0, netOneTime: 0 };
  const pct = categoryPercent(cat);
  const fullAnnual = monthly * 12;
  const discountAmount = Math.round((fullAnnual * pct) / 100);
  return { fullAnnual, discountAmount, netOneTime: fullAnnual - discountAmount };
}

/** Applica codice manuale (fixed o percentuale) a un setup già scontato di voucher. */
export function applyManualDiscount(
  setupAfterVoucher: number,
  discount: PricingManualDiscount
): { amount: number; percent: number; label: string; code: string | null } {
  if (!discount) return { amount: 0, percent: 0, label: "", code: null };
  const code = discount.code;
  const fixed = discount.fixedAmount;
  if (typeof fixed === "number" && fixed > 0) {
    const amount = Math.min(Math.round(fixed), Math.max(0, setupAfterVoucher));
    return { amount, percent: 0, label: `Codice ${code} (−${amount} €)`, code };
  }
  const percent = Math.max(0, Math.round(Number(discount.percent) || 0));
  const amount = Math.round(setupAfterVoucher * (percent / 100));
  return { amount, percent, label: `Codice ${code} (−${percent}%)`, code };
}

/**
 * Credito Metodo Cantiere = 10% del setup netto, dove "netto" è:
 *   setupGross − voucher Diagnosi − voucher Audit − sconto manuale
 * (ma NON sottrae lo sconto se il preventivo è "volume_*" legacy).
 */
export function computeCredito(args: {
  setupGross: number;
  diagnosiGiaPagata: boolean;
  voucherAuditApplied: boolean;
  manualDiscountAmount: number;
  manualDiscountPercent: number;
  legacyDiscountType: string | null | undefined;
}): number {
  const gross = Math.max(0, Math.round(args.setupGross || 0));
  let afterVouchers = gross;
  if (args.diagnosiGiaPagata) {
    afterVouchers = Math.max(0, afterVouchers - DIAGNOSI_VOUCHER_AMOUNT);
  }
  if (args.voucherAuditApplied) {
    afterVouchers = Math.max(0, afterVouchers - AUDIT_VOUCHER_AMOUNT);
  }

  const isVolumeLegacy =
    args.legacyDiscountType === "volume_5" || args.legacyDiscountType === "volume_10";

  const stored = Math.max(0, Math.round(args.manualDiscountAmount || 0));
  const pct = Math.max(0, Math.round(args.manualDiscountPercent || 0));
  const fromPct = pct > 0 ? Math.round((afterVouchers * pct) / 100) : 0;
  const rawDiscount = stored > 0 ? Math.min(stored, afterVouchers) : fromPct;
  const setupDiscount = isVolumeLegacy ? 0 : Math.min(rawDiscount, afterVouchers);
  const base = Math.max(0, afterVouchers - setupDiscount);
  return Math.round((base * CREDITO_MC_PERCENT) / 100);
}

// ----------------------------------------------------------------------------
// Engine principale
// ----------------------------------------------------------------------------

export function computePricing(input: PricingInput): PricingOutput {
  const catalogByCode = new Map(input.catalog.map((p) => [p.code, p]));

  // 1) Risoluzione voci: l'override su PricingItem vince sul catalogo.
  type ResolvedItem = {
    code: string;
    name: string;
    block: string;
    price: number;
    quantity: number;
    isMonthly: boolean;
  };
  const resolved: ResolvedItem[] = [];
  for (const it of input.items) {
    const catP = catalogByCode.get(it.productCode);
    if (!catP && !it.productName) continue;
    const name = it.productName ?? catP!.name;
    const block = it.block ?? (catP ? catP.block : "");
    const price = typeof it.price === "number" ? it.price : catP ? catP.price : 0;
    const isMonthly =
      typeof it.isMonthly === "boolean" ? it.isMonthly : catP ? catP.isMonthly : false;
    const quantity = Math.max(0, Number(it.quantity ?? 1));
    resolved.push({ code: it.productCode, name, block, price, quantity, isMonthly });
  }

  // 2) Sommatorie setup vs canoni mensili (le voci voucher sono escluse:
  //    contribuiscono al credito, non al setup pagato dal cliente).
  let setupGross = 0;
  let crmMonthly = 0;
  let aiMonthly = 0;
  let waMonthly = 0;
  let monthlyOther = 0;
  const setupBreakdown: BreakdownLine[] = [];
  const monthlyBreakdown: BreakdownLine[] = [];

  for (const it of resolved) {
    if (it.code === DIAGNOSI_CODE || it.code === AUDIT_LAMPO_CODE) continue;
    const lineTotal = it.price * it.quantity;

    if (it.isMonthly) {
      const cat = blockToCategory(it.block);
      if (cat === "CRM") crmMonthly += lineTotal;
      else if (cat === "AIVOCALE") aiMonthly += lineTotal;
      else if (cat === "WA") waMonthly += lineTotal;
      else monthlyOther += lineTotal;

      // Le voci con prepay annuale attivo escono dal "ricorrente mensile" UI:
      // saranno mostrate nel blocco anticipo annuale.
      const excludedFromMonthlyView =
        (cat === "CRM" && input.prepayments.CRM) ||
        (cat === "AIVOCALE" && input.prepayments.AIVOCALE) ||
        (cat === "WA" && input.prepayments.WA);
      if (!excludedFromMonthlyView) {
        monthlyBreakdown.push({
          name: it.name,
          lineTotal,
          quantity: it.quantity,
          code: it.code,
        });
      }
    } else {
      setupGross += lineTotal;
      setupBreakdown.push({
        name: it.name,
        lineTotal,
        quantity: it.quantity,
        code: it.code,
      });
    }
  }

  // 3) Voucher (Diagnosi/Audit) sul setup.
  const voucherDiagnosi = input.diagnosiGiaPagata ? DIAGNOSI_VOUCHER_AMOUNT : 0;
  const voucherAudit = input.voucherAuditApplied ? AUDIT_VOUCHER_AMOUNT : 0;
  let setupAfterVoucher = setupGross;
  if (voucherDiagnosi) {
    setupAfterVoucher = Math.max(0, setupAfterVoucher - voucherDiagnosi);
  }
  if (voucherAudit) {
    setupAfterVoucher = Math.max(0, setupAfterVoucher - voucherAudit);
  }

  // 4) Prepay annuali per categoria.
  const crmPrepayBreakdown =
    input.prepayments.CRM && crmMonthly > 0 ? prepayFromMonthly(crmMonthly, "CRM") : null;
  const aiPrepayBreakdown =
    input.prepayments.AIVOCALE && aiMonthly > 0
      ? prepayFromMonthly(aiMonthly, "AIVOCALE")
      : null;
  const waPrepayBreakdown =
    input.prepayments.WA && waMonthly > 0 ? prepayFromMonthly(waMonthly, "WA") : null;

  const prepaidCrm = crmPrepayBreakdown?.netOneTime ?? 0;
  const prepaidAi = aiPrepayBreakdown?.netOneTime ?? 0;
  const prepaidWa = waPrepayBreakdown?.netOneTime ?? 0;

  // 5) Mensili lordi vs residui dopo prepay.
  const monthly = crmMonthly + aiMonthly + waMonthly + monthlyOther;
  const monthlyAfterPrepay =
    monthly -
    (input.prepayments.CRM ? crmMonthly : 0) -
    (input.prepayments.AIVOCALE ? aiMonthly : 0) -
    (input.prepayments.WA ? waMonthly : 0);

  // 6) Sconto manuale sul setup post-voucher.
  const md = applyManualDiscount(setupAfterVoucher, input.manualDiscount);
  const setupNet = Math.max(0, setupAfterVoucher - md.amount);

  // 7) Totali finali.
  const oneTimeTotal = setupNet + prepaidCrm + prepaidAi + prepaidWa;
  const annualTotal = oneTimeTotal + monthlyAfterPrepay * 12;

  // 8) Credito MC. Se c'è un manuale "vero", il legacy "volume_*" non si
  //    applica e gli importi storici vanno ignorati: il manuale vince.
  //    Senza manuale, useremmo i valori storici (legacyDiscountType/Amount/
  //    Percent) per replicare esattamente il comportamento pre-engine.
  const hasActiveManual = md.amount > 0;
  const effectiveLegacyType = hasActiveManual
    ? null
    : input.legacyDiscountType ?? null;
  const effectiveAmount = hasActiveManual
    ? md.amount
    : Math.max(0, Math.round(Number(input.legacyDiscountAmount) || 0));
  const effectivePercent = hasActiveManual
    ? md.percent
    : Math.max(0, Math.round(Number(input.legacyDiscountPercent) || 0));
  // Se il flag e' esplicitamente false, il credito non si applica.
  // Se non e' passato (undefined) restiamo retro-compatibili: comportamento
  // attuale (credito calcolato come prima). Solo i preventivi nuovi mandano
  // false esplicito per spegnere la leva.
  const creditoMcEnabled = input.creditoMcEnabled !== false;
  const creditoMetodoCantiere = creditoMcEnabled
    ? computeCredito({
        setupGross,
        diagnosiGiaPagata: input.diagnosiGiaPagata,
        voucherAuditApplied: input.voucherAuditApplied,
        manualDiscountAmount: effectiveAmount,
        manualDiscountPercent: effectivePercent,
        legacyDiscountType: effectiveLegacyType,
      })
    : 0;

  return {
    setupGross,
    setup: setupAfterVoucher,
    setupAfterVoucher,
    setupNet,
    voucherDiagnosi,
    voucherAudit,

    setupBreakdown,
    monthlyBreakdown,

    monthly,
    crmMonthly,
    aiMonthly,
    waMonthly,
    monthlyOther,
    monthlyAfterPrepay,

    prepaidCrm,
    prepaidAi,
    prepaidWa,
    crmPrepayBreakdown,
    aiPrepayBreakdown,
    waPrepayBreakdown,

    discountType: md.code ? "manual" : null,
    discountCode: md.code,
    discountPercent: md.percent,
    discountAmount: md.amount,
    discountLabel: md.label,

    oneTimeTotal,
    annualTotal,

    creditoMetodoCantiere,
  };
}
