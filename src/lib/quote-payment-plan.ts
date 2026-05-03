import type { Prisma, Quote, QuoteItem } from "@prisma/client";
import {
  computePricing,
  type PricingInput,
  type PricingManualDiscount,
  type PricingProductInfo,
} from "@/lib/pricing/engine";

export const PAYMENT_KIND = {
  SETUP_DEPOSIT: "SETUP_DEPOSIT",
  PREPAY_CRM: "PREPAY_CRM",
  PREPAY_AIVOCALE: "PREPAY_AIVOCALE",
  PREPAY_WA: "PREPAY_WA",
  MONTHLY_CANONE: "MONTHLY_CANONE",
  /** Rata del saldo dopo l'acconto, in piano pagamenti custom. */
  INSTALLMENT: "INSTALLMENT",
} as const;

/** Metodi di pagamento standardizzati. */
export const PAYMENT_METHOD = {
  BANK: "bank",
  CARD: "card",
} as const;

/** Soglia default sopra la quale il metodo proposto e' bonifico, sotto carta. */
export const PAYMENT_METHOD_THRESHOLD_EUR = 500;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

function suggestMethod(amount: number, threshold = PAYMENT_METHOD_THRESHOLD_EUR): PaymentMethod {
  return amount >= threshold ? PAYMENT_METHOD.BANK : PAYMENT_METHOD.CARD;
}

/**
 * Input per buildCustomPaymentPlan: descrive il piano "manuale" che il
 * commerciale costruisce nel drawer (acconto + N rate del saldo + canoni
 * mensili che restano automatici).
 */
export type CustomPlanInput = {
  /** Totale del setup da rateizzare (al netto di anticipi annuali e voucher).
   * Tipicamente quote.totalOneTime - sum(anticipi annuali). */
  totalToSplit: number;
  /** Acconto: importo libero in € oppure % sul totalToSplit. */
  deposit:
    | { mode: "amount"; amount: number }
    | { mode: "percent"; percent: number };
  /** Data dell'acconto. */
  depositDate: Date;
  /** Metodo dell'acconto (override del default suggerito). */
  depositMethod?: PaymentMethod;
  /** Numero di rate per il saldo (dopo l'acconto). */
  numInstallments: number;
  /** Data della prima rata. Le successive sono +1 mese ciascuna se autoReplicateMonthly e' true. */
  firstInstallmentDate: Date;
  /** Date custom per le singole rate (se non si vuole replica mensile automatica).
   *  Se presente e ha length === numInstallments, le date qui dentro sostituiscono il default mensile. */
  installmentDates?: Date[];
  /** Soglia per autoselezione metodo (default PAYMENT_METHOD_THRESHOLD_EUR). */
  methodThreshold?: number;
  /** Override metodo per ogni rata. Se presente e ha length === numInstallments, vince. */
  installmentMethods?: PaymentMethod[];
};

export type CustomPlanResult = {
  rows: PlanRowInput[];
  /** Acconto calcolato (importo finale). */
  depositAmount: number;
  /** Saldo totale dopo acconto. */
  remainder: number;
  /** Importo "tipico" della rata (le prime N-1; l'ultima e' adjusted per pareggiare). */
  installmentBase: number;
  /** Importo dell'ultima rata (potrebbe differire di pochi euro per arrotondamento). */
  installmentLast: number;
};

/**
 * Costruisce un piano pagamenti su misura: acconto in €/% + N rate del saldo
 * con auto-replica mensile e arrotondamento sull'ultima rata cosi' tornano gli interi.
 *
 * Le rate sono SOLO sul setup (ovvero totalToSplit). I canoni mensili e gli
 * anticipi annuali NON entrano qui: il drawer li gestisce separatamente
 * con la logica esistente di buildDefaultPaymentPlan.
 */
export function buildCustomPaymentPlan(input: CustomPlanInput): CustomPlanResult {
  const total = Math.max(0, Math.round(input.totalToSplit));
  const depositAmount = Math.max(
    0,
    Math.min(
      total,
      input.deposit.mode === "amount"
        ? Math.round(input.deposit.amount)
        : Math.round((total * input.deposit.percent) / 100)
    )
  );
  const remainder = Math.max(0, total - depositAmount);
  const n = Math.max(0, Math.floor(input.numInstallments));

  const threshold = input.methodThreshold ?? PAYMENT_METHOD_THRESHOLD_EUR;

  const rows: PlanRowInput[] = [];

  if (depositAmount > 0) {
    rows.push({
      amount: depositAmount,
      dueDate: input.depositDate,
      kind: PAYMENT_KIND.SETUP_DEPOSIT,
      notes: `Acconto · ${input.depositMethod ?? suggestMethod(depositAmount, threshold)}`,
    });
  }

  let installmentBase = 0;
  let installmentLast = 0;

  if (n > 0 && remainder > 0) {
    // Rata "base": importo intero diviso N. L'ultima compensa lo scarto di arrotondamento
    // cosi' la somma delle rate fa esattamente remainder.
    installmentBase = Math.floor(remainder / n);
    installmentLast = remainder - installmentBase * (n - 1);

    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const amount = isLast ? installmentLast : installmentBase;
      const dueDate = input.installmentDates && input.installmentDates[i]
        ? input.installmentDates[i]
        : addMonthsStartOfDay(input.firstInstallmentDate, i);
      const method = input.installmentMethods && input.installmentMethods[i]
        ? input.installmentMethods[i]
        : suggestMethod(amount, threshold);
      rows.push({
        amount,
        dueDate,
        kind: PAYMENT_KIND.INSTALLMENT,
        notes: `Rata ${i + 1} di ${n} · ${method}`,
      });
    }
  }

  return { rows, depositAmount, remainder, installmentBase, installmentLast };
}

type ProductLite = { code: string; block: string; isMonthly: boolean };

export type PlanRowInput = {
  amount: number;
  dueDate: Date;
  kind: string;
  notes: string;
};

function addMonthsStartOfDay(d: Date, months: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  x.setMonth(x.getMonth() + months);
  return x;
}

/**
 * Costruisce un input per il pricing engine a partire da un Quote DB.
 *
 * Il payment-plan ha una piccola peculiarità storica rispetto al QuoteEditor:
 * se il preventivo ha `discountPercent > 0` e `discountType` non è "manual"
 * (es. "volume_5", "volume_10", legacy), il vecchio codice applicava comunque
 * la percentuale al setup per calcolare il deposit. Replichiamo questo
 * comportamento costruendo un "manualDiscount sintetico". Per il calcolo del
 * Credito MC (che non è usato dal payment-plan) il comportamento legacy
 * "volume_*" è invece gestito a parte nel template PDF.
 */
function syntheticManualDiscount(
  quote: Pick<
    Quote,
    "discountType" | "discountCode" | "discountAmount" | "discountPercent"
  >
): PricingManualDiscount {
  if (quote.discountType === "manual" && quote.discountCode) {
    return {
      code: quote.discountCode,
      percent: quote.discountPercent || 0,
      fixedAmount:
        (quote.discountAmount || 0) > 0 ? quote.discountAmount : undefined,
    };
  }
  if ((quote.discountPercent || 0) > 0) {
    return {
      code: quote.discountType || "LEGACY",
      percent: quote.discountPercent,
    };
  }
  return null;
}

/**
 * Costruisce l'input per l'engine partendo da Quote + items + listino corrente.
 * `productsByCode` contiene i prodotti del listino di OGGI: gli items del
 * preventivo che riferiscono a un product non più in listino vengono saltati
 * (è il comportamento storico del payment-plan).
 */
function buildPricingInputFromQuote(
  quote: Pick<
    Quote,
    | "diagnosiGiaPagata"
    | "voucherAuditApplied"
    | "scontoCrmAnnuale"
    | "scontoAiVocaleAnnuale"
    | "scontoWaAnnuale"
    | "discountType"
    | "discountCode"
    | "discountAmount"
    | "discountPercent"
  >,
  items: Pick<QuoteItem, "productCode" | "price" | "quantity" | "isMonthly">[],
  productsByCode: Map<string, ProductLite>
): PricingInput {
  const catalog: PricingProductInfo[] = Array.from(productsByCode.entries()).map(
    ([code, p]) => ({
      code,
      // Il name non è rilevante per i totali: serve solo per UI breakdown.
      name: code,
      block: p.block,
      // Il prezzo "vero" è quello storico salvato sull'item, non quello del
      // catalogo corrente: lo passiamo come override sull'item.
      price: 0,
      isMonthly: p.isMonthly,
    })
  );

  return {
    catalog,
    items: items.map((it) => ({
      productCode: it.productCode,
      quantity: it.quantity || 1,
      price: it.price,
      isMonthly: it.isMonthly,
      // NB: NON passiamo productName. Così se il product non è più in catalog
      // l'engine fa skip della riga (compat con vecchio computeSetupNetForDeposit).
    })),
    diagnosiGiaPagata: !!quote.diagnosiGiaPagata,
    voucherAuditApplied: !!quote.voucherAuditApplied,
    prepayments: {
      CRM: !!quote.scontoCrmAnnuale,
      AIVOCALE: !!quote.scontoAiVocaleAnnuale,
      WA: !!quote.scontoWaAnnuale,
    },
    manualDiscount: syntheticManualDiscount(quote),
    // Il payment-plan non guarda il credito MC: passare i legacy non serve.
    legacyDiscountType: null,
    legacyDiscountAmount: null,
    legacyDiscountPercent: null,
  };
}

/**
 * Setup netto per il calcolo del deposit (acconto setup).
 * = solo moduli setup (no canoni), dopo voucher Diagnosi/Audit e dopo eventuale
 * sconto sul setup. Non include anticipi canoni (CRM/AI/WA): quelli sono
 * computati separatamente da `computePrepayAmounts`.
 */
export function computeSetupNetForDeposit(
  quote: Pick<
    Quote,
    | "diagnosiGiaPagata"
    | "voucherAuditApplied"
    | "discountType"
    | "discountCode"
    | "discountPercent"
    | "discountAmount"
  >,
  items: Pick<QuoteItem, "productCode" | "price" | "quantity" | "isMonthly">[],
  productsByCode: Map<string, ProductLite>
): number {
  // Costruisco l'input riempiendo i prepayments a "false": al payment-plan
  // del deposit non interessa l'effetto dei prepay sul setup (sono calcolati a parte).
  const out = computePricing(
    buildPricingInputFromQuote(
      {
        ...quote,
        scontoCrmAnnuale: false,
        scontoAiVocaleAnnuale: false,
        scontoWaAnnuale: false,
      } as any,
      items,
      productsByCode
    )
  );
  return out.setupNet;
}

export function computePrepayAmounts(
  quote: Pick<Quote, "scontoCrmAnnuale" | "scontoAiVocaleAnnuale" | "scontoWaAnnuale">,
  items: Pick<QuoteItem, "productCode" | "price" | "quantity" | "isMonthly">[],
  productsByCode: Map<string, ProductLite>
): { crm: number; ai: number; wa: number } {
  // Per i prepay non servono i campi sconto: passo zero/default.
  const out = computePricing(
    buildPricingInputFromQuote(
      {
        diagnosiGiaPagata: false,
        voucherAuditApplied: false,
        scontoCrmAnnuale: !!quote.scontoCrmAnnuale,
        scontoAiVocaleAnnuale: !!quote.scontoAiVocaleAnnuale,
        scontoWaAnnuale: !!quote.scontoWaAnnuale,
        discountType: null,
        discountCode: null,
        discountAmount: 0,
        discountPercent: 0,
      } as any,
      items,
      productsByCode
    )
  );
  return { crm: out.prepaidCrm, ai: out.prepaidAi, wa: out.prepaidWa };
}

export function buildDefaultPaymentPlan(opts: {
  quote: Quote;
  items: QuoteItem[];
  productsByCode: Map<string, ProductLite>;
  acquisitionDate: Date;
  deliveryExpectedAt: Date;
  depositPercent?: number;
}): PlanRowInput[] {
  const { quote, items, productsByCode, acquisitionDate, deliveryExpectedAt } = opts;
  const pct = Math.min(
    100,
    Math.max(0, Number(opts.depositPercent ?? quote.depositPercent ?? 30))
  );

  const setupNet = computeSetupNetForDeposit(quote, items, productsByCode);
  const depositAmount = Math.round((setupNet * pct) / 100);
  const prepay = computePrepayAmounts(quote, items, productsByCode);

  const rows: PlanRowInput[] = [];

  const acq = new Date(acquisitionDate);
  acq.setHours(12, 0, 0, 0);

  if (depositAmount > 0) {
    rows.push({
      amount: depositAmount,
      dueDate: acq,
      kind: PAYMENT_KIND.SETUP_DEPOSIT,
      notes: `Acconto setup ${pct}%`,
    });
  }
  if (prepay.crm > 0) {
    rows.push({
      amount: prepay.crm,
      dueDate: acq,
      kind: PAYMENT_KIND.PREPAY_CRM,
      notes: "Canone CRM annuo anticipato (netto)",
    });
  }
  if (prepay.ai > 0) {
    rows.push({
      amount: prepay.ai,
      dueDate: acq,
      kind: PAYMENT_KIND.PREPAY_AIVOCALE,
      notes: "Canone AI Vocale annuo anticipato (netto)",
    });
  }
  if (prepay.wa > 0) {
    rows.push({
      amount: prepay.wa,
      dueDate: acq,
      kind: PAYMENT_KIND.PREPAY_WA,
      notes: "Canone WhatsApp annuo anticipato (netto)",
    });
  }

  const monthly = Math.max(0, Number(quote.totalMonthly || 0));
  if (monthly > 0) {
    const del = new Date(deliveryExpectedAt);
    del.setHours(12, 0, 0, 0);
    for (let i = 1; i <= 12; i++) {
      rows.push({
        amount: monthly,
        dueDate: addMonthsStartOfDay(del, i),
        kind: PAYMENT_KIND.MONTHLY_CANONE,
        notes: `Canone mensile ${i}/12 (da dopo consegna)`,
      });
    }
  }

  return rows;
}

export function paymentRowsToCreateMany(
  quoteId: string,
  rows: PlanRowInput[]
): Prisma.QuotePaymentCreateManyInput[] {
  return rows.map((r) => ({
    quoteId,
    amount: r.amount,
    dueDate: r.dueDate,
    paidAt: null,
    method: null,
    notes: r.notes,
    kind: r.kind,
  }));
}
