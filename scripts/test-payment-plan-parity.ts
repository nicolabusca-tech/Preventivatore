/**
 * Test di parità per `quote-payment-plan.ts`.
 * Riproduce il comportamento della versione pre-engine usando direttamente
 * `applicaCodiceManuale` + `canonePrepayFromMonthly`, e verifica che il nuovo
 * codice (basato su `computePricing`) produca gli stessi numeri.
 *
 * Esegui: npm run test:payment-plan
 */
import assert from "node:assert/strict";
import {
  computeSetupNetForDeposit,
  computePrepayAmounts,
} from "../src/lib/quote-payment-plan";
import { applicaCodiceManuale, canonePrepayFromMonthly } from "../src/lib/discounts";

const SKIP_SETUP_CODES = new Set(["DIAGNOSI_STRATEGICA", "AUDIT_LAMPO"]);
const DIAG_VOUCHER = 497;
const AUDIT_VOUCHER = 147;

type ProductLite = { code: string; block: string; isMonthly: boolean };
type ItemLite = {
  productCode: string;
  price: number;
  quantity: number;
  isMonthly: boolean;
};

// Versione "vecchia" letterale di computeSetupNetForDeposit, prima dell'engine.
function legacyComputeSetupNetForDeposit(
  quote: any,
  items: ItemLite[],
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
    setupNet = Math.max(
      0,
      setup - Math.round((setup * (quote.discountPercent || 0)) / 100)
    );
  }
  return setupNet;
}

// Versione "vecchia" letterale di computePrepayAmounts.
function legacyComputePrepayAmounts(
  quote: any,
  items: ItemLite[],
  productsByCode: Map<string, ProductLite>
) {
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
  return {
    crm:
      quote.scontoCrmAnnuale && crmMonthly > 0
        ? canonePrepayFromMonthly(crmMonthly, "CRM").netOneTime
        : 0,
    ai:
      quote.scontoAiVocaleAnnuale && aiMonthly > 0
        ? canonePrepayFromMonthly(aiMonthly, "AIVOCALE").netOneTime
        : 0,
    wa:
      quote.scontoWaAnnuale && waMonthly > 0
        ? canonePrepayFromMonthly(waMonthly, "WA").netOneTime
        : 0,
  };
}

const PRODUCTS: Map<string, ProductLite> = new Map([
  ["MOD_A", { code: "MOD_A", block: "01", isMonthly: false }],
  ["MOD_B", { code: "MOD_B", block: "02", isMonthly: false }],
  ["MOD_C", { code: "MOD_C", block: "06", isMonthly: false }],
  ["MEGA", { code: "MEGA", block: "MEGABUNDLE", isMonthly: false }],
  ["DCE_BASE", { code: "DCE_BASE", block: "DCE", isMonthly: true }],
  ["CRM_PRO", { code: "CRM_PRO", block: "CANONI_CRM", isMonthly: true }],
  ["AI_VOC", { code: "AI_VOC", block: "CANONI_AIVOCALE", isMonthly: true }],
  ["WA_PRO", { code: "WA_PRO", block: "CANONI_WA", isMonthly: true }],
  ["DIAGNOSI_STRATEGICA", { code: "DIAGNOSI_STRATEGICA", block: "FRONTEND", isMonthly: false }],
  ["AUDIT_LAMPO", { code: "AUDIT_LAMPO", block: "FRONTEND", isMonthly: false }],
]);

let casi = 0;
function check(label: string, actual: number, expected: number) {
  casi += 1;
  assert.equal(actual, expected, `[${label}] atteso ${expected}, ricevuto ${actual}`);
}

function compareScenario(
  label: string,
  quote: any,
  items: ItemLite[]
) {
  const expectedSetup = legacyComputeSetupNetForDeposit(quote, items, PRODUCTS);
  const actualSetup = computeSetupNetForDeposit(quote, items, PRODUCTS);
  check(`${label}.setupNet`, actualSetup, expectedSetup);

  const expectedPrep = legacyComputePrepayAmounts(quote, items, PRODUCTS);
  const actualPrep = computePrepayAmounts(quote, items, PRODUCTS);
  check(`${label}.prepay.crm`, actualPrep.crm, expectedPrep.crm);
  check(`${label}.prepay.ai`, actualPrep.ai, expectedPrep.ai);
  check(`${label}.prepay.wa`, actualPrep.wa, expectedPrep.wa);
}

// ----------------------------------------------------------------------------
// Scenario 1 — solo setup, nessuno sconto
// ----------------------------------------------------------------------------
compareScenario(
  "s1",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "MOD_B", price: 2500, quantity: 1, isMonthly: false },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 2 — setup + voucher Diagnosi + voucher Audit
// ----------------------------------------------------------------------------
compareScenario(
  "s2",
  {
    diagnosiGiaPagata: true,
    voucherAuditApplied: true,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [{ productCode: "MEGA", price: 9000, quantity: 1, isMonthly: false }]
);

// ----------------------------------------------------------------------------
// Scenario 3 — sconto manuale percentuale 15%
// ----------------------------------------------------------------------------
compareScenario(
  "s3",
  {
    diagnosiGiaPagata: true,
    voucherAuditApplied: false,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: "manual",
    discountCode: "AMICO-15",
    discountAmount: 0,
    discountPercent: 15,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "MOD_B", price: 2500, quantity: 1, isMonthly: false },
    { productCode: "MOD_C", price: 4500, quantity: 1, isMonthly: false },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 4 — sconto manuale fisso (€200)
// ----------------------------------------------------------------------------
compareScenario(
  "s4",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: "manual",
    discountCode: "EVENTO",
    discountAmount: 200,
    discountPercent: 50,
  },
  [{ productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false }]
);

// ----------------------------------------------------------------------------
// Scenario 5 — preventivo legacy "volume_5"
// (vecchio comportamento payment-plan: applica il 5% al setup)
// ----------------------------------------------------------------------------
compareScenario(
  "s5",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: "volume_5",
    discountCode: null,
    discountAmount: 0,
    discountPercent: 5,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "MOD_B", price: 2500, quantity: 1, isMonthly: false },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 6 — prepay CRM attivo
// ----------------------------------------------------------------------------
compareScenario(
  "s6",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: true,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "CRM_PRO", price: 120, quantity: 1, isMonthly: true },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 7 — tutti i prepay attivi
// ----------------------------------------------------------------------------
compareScenario(
  "s7",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: true,
    scontoAiVocaleAnnuale: true,
    scontoWaAnnuale: true,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "CRM_PRO", price: 120, quantity: 1, isMonthly: true },
    { productCode: "AI_VOC", price: 90, quantity: 1, isMonthly: true },
    { productCode: "WA_PRO", price: 50, quantity: 1, isMonthly: true },
    { productCode: "DCE_BASE", price: 600, quantity: 1, isMonthly: true },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 8 — item con productCode non presente nel catalog corrente
// (simula prodotto eliminato dal listino: il vecchio code lo escludeva)
// ----------------------------------------------------------------------------
compareScenario(
  "s8",
  {
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "VECCHIO_RIMOSSO", price: 999, quantity: 1, isMonthly: false },
  ]
);

// ----------------------------------------------------------------------------
// Scenario 9 — items con DIAGNOSI/AUDIT in setup: vanno esclusi
// ----------------------------------------------------------------------------
compareScenario(
  "s9",
  {
    diagnosiGiaPagata: true,
    voucherAuditApplied: true,
    scontoCrmAnnuale: false,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: false,
    discountType: null,
    discountCode: null,
    discountAmount: 0,
    discountPercent: 0,
  },
  [
    { productCode: "MOD_A", price: 3000, quantity: 1, isMonthly: false },
    { productCode: "DIAGNOSI_STRATEGICA", price: 497, quantity: 1, isMonthly: false },
    { productCode: "AUDIT_LAMPO", price: 147, quantity: 1, isMonthly: false },
  ]
);

console.log(`payment-plan-parity: tutti i ${casi} casi OK.`);
