/**
 * Test Credito MC (10% sul netto setup modulo listino).
 * Esegui: npm run test:credito
 */
import assert from "node:assert/strict";
import { computeCreditoMetodoCantiere } from "../src/lib/discounts";

// 10.000 € lordi setup, nessun voucher, nessuno sconto → 1.000 €
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 10_000,
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    discountType: null,
    discountAmount: 0,
    discountPercent: 0,
  }),
  1_000
);

// Diagnosi già versata: (10.000 − 497) × 10% = 950,3 → 950
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 10_000,
    diagnosiGiaPagata: true,
    voucherAuditApplied: false,
    discountType: null,
    discountAmount: 0,
    discountPercent: 0,
  }),
  950
);

// Diagnosi + Audit: (10.000 − 497 − 147) × 10% = 935,6 → 936
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 10_000,
    diagnosiGiaPagata: true,
    voucherAuditApplied: true,
    discountType: null,
    discountAmount: 0,
    discountPercent: 0,
  }),
  936
);

// Sconto codice 500 € sul netto dopo voucher: (10.000 − 500) × 10% = 950
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 10_000,
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    discountType: "manual",
    discountAmount: 500,
    discountPercent: 0,
  }),
  950
);

// Storico volume_10: nessuna decurtazione dalla base credito → come 10.000 lordi
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 10_000,
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    discountType: "volume_10",
    discountAmount: 1_000,
    discountPercent: 10,
  }),
  1_000
);

// Base zero
assert.equal(
  computeCreditoMetodoCantiere({
    setupBeforeDiscount: 0,
    diagnosiGiaPagata: false,
    voucherAuditApplied: false,
    discountType: null,
    discountAmount: 0,
    discountPercent: 0,
  }),
  0
);

console.log("credito-mc: tutti i test OK.");
