import type { Prisma, Quote, QuoteItem } from "@prisma/client";
import { applicaCodiceManuale, canonePrepayFromMonthly } from "@/lib/discounts";

/** Esclusi dal setup moduli come in QuoteEditor */
const SKIP_SETUP_CODES = new Set(["DIAGNOSI_STRATEGICA", "AUDIT_LAMPO"]);
const DIAG_VOUCHER = 497;
const AUDIT_VOUCHER = 147;

export const PAYMENT_KIND = {
  SETUP_DEPOSIT: "SETUP_DEPOSIT",
  PREPAY_CRM: "PREPAY_CRM",
  PREPAY_AIVOCALE: "PREPAY_AIVOCALE",
  PREPAY_WA: "PREPAY_WA",
  MONTHLY_CANONE: "MONTHLY_CANONE",
} as const;

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
 * Setup netto (solo moduli una tantum listino, dopo voucher Diagnosi/Audit e sconto sul setup).
 * Non include anticipi canoni (CRM/AI/WA) nel deposit %.
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
  let setupModules = 0;

  for (const it of items) {
    if (SKIP_SETUP_CODES.has(it.productCode)) continue;
    const p = productsByCode.get(it.productCode);
    if (!p || p.isMonthly) continue;
    setupModules += it.price * (it.quantity || 1);
  }

  let setup = setupModules;
  if (quote.diagnosiGiaPagata) setup = Math.max(0, setup - DIAG_VOUCHER);
  if (quote.voucherAuditApplied) setup = Math.max(0, setup - AUDIT_VOUCHER);

  let setupNet = setup;
  if (quote.discountType === "manual" && quote.discountCode) {
    const r = applicaCodiceManuale(
      setup,
      quote.discountPercent || 0,
      quote.discountCode,
      quote.discountAmount > 0 ? { fixedAmount: quote.discountAmount } : undefined
    );
    setupNet = Math.max(0, setup - r.amount);
  } else if ((quote.discountPercent || 0) > 0) {
    setupNet = Math.max(0, setup - Math.round((setup * (quote.discountPercent || 0)) / 100));
  }

  return setupNet;
}

export function computePrepayAmounts(
  quote: Pick<Quote, "scontoCrmAnnuale" | "scontoAiVocaleAnnuale" | "scontoWaAnnuale">,
  items: Pick<QuoteItem, "productCode" | "price" | "quantity" | "isMonthly">[],
  productsByCode: Map<string, ProductLite>
): { crm: number; ai: number; wa: number } {
  let crmMonthly = 0;
  let aiMonthly = 0;
  let waMonthly = 0;

  for (const it of items) {
    const p = productsByCode.get(it.productCode);
    if (!p || !p.isMonthly) continue;
    const line = it.price * (it.quantity || 1);
    if (p.block === "CANONI_CRM") crmMonthly += line;
    else if (p.block === "CANONI_AIVOCALE") aiMonthly += line;
    else if (p.block === "CANONI_WA") waMonthly += line;
  }

  const crm =
    quote.scontoCrmAnnuale && crmMonthly > 0 ? canonePrepayFromMonthly(crmMonthly, "CRM").netOneTime : 0;
  const ai =
    quote.scontoAiVocaleAnnuale && aiMonthly > 0
      ? canonePrepayFromMonthly(aiMonthly, "AIVOCALE").netOneTime
      : 0;
  const wa =
    quote.scontoWaAnnuale && waMonthly > 0 ? canonePrepayFromMonthly(waMonthly, "WA").netOneTime : 0;

  return { crm, ai, wa };
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
  const pct = Math.min(100, Math.max(0, Number(opts.depositPercent ?? quote.depositPercent ?? 30)));

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
