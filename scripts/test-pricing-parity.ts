/**
 * Test di parità: il nuovo `computePricing` deve produrre gli stessi numeri
 * della logica preesistente (`computeCreditoMetodoCantiere`, `canonePrepayFromMonthly`,
 * `applicaCodiceManuale`) usata fino allo Step 1.
 *
 * Esegui: npx tsx scripts/test-pricing-parity.ts
 */
import assert from "node:assert/strict";
import { computePricing, type PricingProductInfo } from "../src/lib/pricing/engine";
import {
  computeCreditoMetodoCantiere,
  canonePrepayFromMonthly,
  applicaCodiceManuale,
} from "../src/lib/discounts";

// Catalogo di test minimale, simula il listino reale.
const CATALOG: PricingProductInfo[] = [
  { code: "MOD_A", name: "Modulo A", block: "01", price: 3000, isMonthly: false },
  { code: "MOD_B", name: "Modulo B", block: "02", price: 2500, isMonthly: false },
  { code: "MOD_C", name: "Modulo C", block: "06", price: 4500, isMonthly: false },
  { code: "MEGA", name: "Mega-bundle", block: "MEGABUNDLE", price: 9000, isMonthly: false },
  {
    code: "DCE_BASE",
    name: "DCE Base",
    block: "DCE",
    price: 600,
    isMonthly: true,
  },
  {
    code: "CRM_PRO",
    name: "Canone CRM Pro",
    block: "CANONI_CRM",
    price: 120,
    isMonthly: true,
  },
  {
    code: "AI_VOC",
    name: "Canone AI Vocale",
    block: "CANONI_AIVOCALE",
    price: 90,
    isMonthly: true,
  },
  {
    code: "WA_PRO",
    name: "Canone WhatsApp",
    block: "CANONI_WA",
    price: 50,
    isMonthly: true,
  },
];

let casi = 0;

function check(label: string, actual: number, expected: number) {
  casi += 1;
  assert.equal(
    actual,
    expected,
    `[${label}] atteso ${expected}, ricevuto ${actual}`
  );
}

// ----------------------------------------------------------------------------
// Caso 1 — Solo setup, nessuno sconto, nessun canone
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MOD_A" }, { productCode: "MOD_B" }],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: null,
  });
  check("c1.setupGross", out.setupGross, 3000 + 2500);
  check("c1.setupNet", out.setupNet, 3000 + 2500);
  check("c1.oneTimeTotal", out.oneTimeTotal, 5500);
  check("c1.annualTotal", out.annualTotal, 5500);
  check("c1.monthly", out.monthly, 0);
  check(
    "c1.creditoMC",
    out.creditoMetodoCantiere,
    computeCreditoMetodoCantiere({
      setupBeforeDiscount: 5500,
      diagnosiGiaPagata: false,
      voucherAuditApplied: false,
      discountType: null,
      discountAmount: 0,
      discountPercent: 0,
    })
  );
}

// ----------------------------------------------------------------------------
// Caso 2 — Setup + voucher Diagnosi
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MEGA" }],
    diagnosiGiaPagata: true,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: null,
  });
  check("c2.setupGross", out.setupGross, 9000);
  check("c2.voucherDiagnosi", out.voucherDiagnosi, 497);
  check("c2.setup", out.setup, 9000 - 497);
  check("c2.oneTimeTotal", out.oneTimeTotal, 9000 - 497);
  check(
    "c2.creditoMC",
    out.creditoMetodoCantiere,
    computeCreditoMetodoCantiere({
      setupBeforeDiscount: 9000,
      diagnosiGiaPagata: true,
      voucherAuditApplied: false,
      discountType: null,
      discountAmount: 0,
      discountPercent: 0,
    })
  );
}

// ----------------------------------------------------------------------------
// Caso 3 — Setup + canoni mensili senza prepay (paga mese per mese)
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [
      { productCode: "MOD_A" },
      { productCode: "CRM_PRO" },
      { productCode: "DCE_BASE" },
    ],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: null,
  });
  check("c3.setupGross", out.setupGross, 3000);
  check("c3.crmMonthly", out.crmMonthly, 120);
  check("c3.monthlyOther", out.monthlyOther, 600); // DCE è in block "DCE", non CRM/AI/WA
  check("c3.monthly", out.monthly, 720);
  check("c3.monthlyAfterPrepay", out.monthlyAfterPrepay, 720);
  check("c3.oneTimeTotal", out.oneTimeTotal, 3000);
  check("c3.annualTotal", out.annualTotal, 3000 + 720 * 12);
}

// ----------------------------------------------------------------------------
// Caso 4 — Prepay annuale CRM (-20%) attivo
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MOD_A" }, { productCode: "CRM_PRO" }],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: true, AIVOCALE: false, WA: false },
    manualDiscount: null,
  });
  // CRM: 120 * 12 = 1440 - 20% = 1152
  const expectedPrepayCrm = canonePrepayFromMonthly(120, "CRM");
  check("c4.crmPrepayBreakdown.full", out.crmPrepayBreakdown!.fullAnnual, expectedPrepayCrm.fullAnnual);
  check(
    "c4.crmPrepayBreakdown.discount",
    out.crmPrepayBreakdown!.discountAmount,
    expectedPrepayCrm.discountAmount
  );
  check(
    "c4.crmPrepayBreakdown.net",
    out.crmPrepayBreakdown!.netOneTime,
    expectedPrepayCrm.netOneTime
  );
  check("c4.prepaidCrm", out.prepaidCrm, expectedPrepayCrm.netOneTime);
  check("c4.monthlyAfterPrepay", out.monthlyAfterPrepay, 0); // CRM era l'unico canone
  check("c4.oneTimeTotal", out.oneTimeTotal, 3000 + expectedPrepayCrm.netOneTime);
  check("c4.annualTotal", out.annualTotal, 3000 + expectedPrepayCrm.netOneTime);
}

// ----------------------------------------------------------------------------
// Caso 5 — Sconto manuale percentuale 15% sul setup post-voucher
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MOD_A" }, { productCode: "MOD_B" }, { productCode: "MOD_C" }],
    diagnosiGiaPagata: true, // voucher 497
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: { code: "AMICO-15", percent: 15 },
  });
  const setupPostVoucher = 3000 + 2500 + 4500 - 497;
  const expectedManual = applicaCodiceManuale(setupPostVoucher, 15, "AMICO-15");
  check("c5.setupAfterVoucher", out.setupAfterVoucher, setupPostVoucher);
  check("c5.discountAmount", out.discountAmount, expectedManual.amount);
  check("c5.discountLabel", out.discountLabel.length > 0 ? 1 : 0, 1);
  check("c5.setupNet", out.setupNet, setupPostVoucher - expectedManual.amount);
  check("c5.oneTimeTotal", out.oneTimeTotal, setupPostVoucher - expectedManual.amount);
  check(
    "c5.creditoMC",
    out.creditoMetodoCantiere,
    computeCreditoMetodoCantiere({
      setupBeforeDiscount: 3000 + 2500 + 4500,
      diagnosiGiaPagata: true,
      voucherAuditApplied: false,
      discountType: "manual",
      discountAmount: expectedManual.amount,
      discountPercent: 15,
    })
  );
}

// ----------------------------------------------------------------------------
// Caso 6 — Sconto manuale fisso (€200), batte il percent
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MOD_A" }],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: { code: "EVENTO", percent: 50, fixedAmount: 200 },
  });
  const expected = applicaCodiceManuale(3000, 50, "EVENTO", { fixedAmount: 200 });
  check("c6.discountAmount", out.discountAmount, expected.amount);
  check("c6.discountAmount-eq-200", out.discountAmount, 200);
  check("c6.discountPercent-zero", out.discountPercent, 0);
}

// ----------------------------------------------------------------------------
// Caso 7 — Preventivo storico legacy "volume_10" senza manuale UI
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [{ productCode: "MOD_A" }, { productCode: "MOD_B" }],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: null,
    legacyDiscountType: "volume_10",
    legacyDiscountAmount: 550,
    legacyDiscountPercent: 10,
  });
  // Legacy volume non decurta la base credito.
  check(
    "c7.creditoMC",
    out.creditoMetodoCantiere,
    computeCreditoMetodoCantiere({
      setupBeforeDiscount: 5500,
      diagnosiGiaPagata: false,
      voucherAuditApplied: false,
      discountType: "volume_10",
      discountAmount: 550,
      discountPercent: 10,
    })
  );
  // Lo sconto manuale risultante è zero (UI non ha codice).
  check("c7.discountAmount", out.discountAmount, 0);
}

// ----------------------------------------------------------------------------
// Caso 8 — Tutti i prepay attivi insieme (CRM + AI + WA)
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [
      { productCode: "MOD_A" },
      { productCode: "CRM_PRO" },
      { productCode: "AI_VOC" },
      { productCode: "WA_PRO" },
    ],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: true, AIVOCALE: true, WA: true },
    manualDiscount: null,
  });
  const pCrm = canonePrepayFromMonthly(120, "CRM");
  const pAi = canonePrepayFromMonthly(90, "AIVOCALE");
  const pWa = canonePrepayFromMonthly(50, "WA");
  check("c8.prepaidCrm", out.prepaidCrm, pCrm.netOneTime);
  check("c8.prepaidAi", out.prepaidAi, pAi.netOneTime);
  check("c8.prepaidWa", out.prepaidWa, pWa.netOneTime);
  check("c8.monthlyAfterPrepay", out.monthlyAfterPrepay, 0);
  check(
    "c8.oneTimeTotal",
    out.oneTimeTotal,
    3000 + pCrm.netOneTime + pAi.netOneTime + pWa.netOneTime
  );
  check(
    "c8.annualTotal",
    out.annualTotal,
    3000 + pCrm.netOneTime + pAi.netOneTime + pWa.netOneTime
  );
}

// ----------------------------------------------------------------------------
// Caso 9 — Voce manuale (no catalogo, override price/isMonthly)
// ----------------------------------------------------------------------------
{
  const out = computePricing({
    catalog: CATALOG,
    items: [
      { productCode: "MANUAL_1", price: 1500, isMonthly: false, productName: "Servizio custom" },
      { productCode: "MANUAL_2", price: 80, isMonthly: true, productName: "Canone custom" },
    ],
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    prepayments: { CRM: false, AIVOCALE: false, WA: false },
    manualDiscount: null,
  });
  check("c9.setupGross", out.setupGross, 1500);
  check("c9.monthly", out.monthly, 80);
  check("c9.monthlyOther", out.monthlyOther, 80); // niente block CRM/AI/WA
  check("c9.annualTotal", out.annualTotal, 1500 + 80 * 12);
}

console.log(`pricing-parity: tutti i ${casi} casi OK.`);
