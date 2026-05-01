/**
 * Smoke test layout PDF: verifica spostamenti narrativi.
 * Esegui: npm run test:pdf-layout
 */
import assert from "node:assert/strict";
import { generateTemplate } from "../src/lib/pdf/template";
import type { Quote, QuoteItem, User } from "@prisma/client";

const quote = {
  id: "q1",
  quoteNumber: "QTEST-0001",
  publicPdfToken: null,
  userId: "u1",
  dceProductId: null,
  clientName: "Test",
  clientCompany: null,
  clientEmail: null,
  clientPhone: null,
  clientNotes: null,
  crmCustomerId: null,
  clientAddress: null,
  clientPostalCode: null,
  clientCity: null,
  clientProvince: null,
  originCliente: null,
  estrattoDiagnosi: null,
  diagnosiGiaPagata: false,
  roiPreventiviMese: 8,
  roiImportoMedio: 40000,
  roiConversioneAttuale: 18,
  roiMargineCommessa: 20,
  roiSnapshot: JSON.stringify({
    inputs: { preventiviMese: 8, importoMedio: 40000, conversioneAttuale: 18, margineCommessa: 20 },
    fatturatoAnnuoBaseline: 0,
    margineAnnuoBaseline: 138240,
    valoreFatturatoProposta: 23105,
    margineStimatoProposta: 186624,
    valoreQuotaDiagnosi: 0,
    indice: 2.09,
  }),
  clientVat: null,
  clientSdi: null,
  totalSetup: 20779,
  totalMonthly: 0,
  totalAnnual: 23105,
  costSetup: 0,
  costMonthly: 0,
  costAnnual: 0,
  marginAnnual: 0,
  marginPercentAnnual: 0,
  salesStage: "open",
  deliveryStage: "not_started",
  wonAt: null,
  kickoffAt: null,
  closedAt: null,
  deliveryExpectedAt: null,
  depositPercent: 30,
  setupBeforeDiscount: 20779,
  discountType: null,
  discountAmount: 0,
  discountCode: null,
  discountPercent: 0,
  scontoCrmAnnuale: false,
  scontoAiVocaleAnnuale: false,
  scontoWaAnnuale: false,
  voucherAuditApplied: false,
  kind: "STANDARD",
  status: "draft",
  sentAt: null,
  viewedAt: null,
  expiresAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Quote;

const items: QuoteItem[] = [
  {
    id: "i1",
    quoteId: "q1",
    productCode: "X_SETUP",
    productName: "Setup",
    price: 20779,
    quantity: 1,
    isMonthly: false,
  } as any,
];

const user = { name: "T", email: "t@example.com" } satisfies Pick<User, "name" | "email">;

const html = generateTemplate({ ...(quote as any), items, user });

// Pagina 03: non deve più contenere investimento/ROI inline
assert.ok(html.includes('pageHeader("03")') || html.includes(">03 Ritorno e danno evitato</div>"));
assert.ok(!html.includes("Investimento primo anno:"), "Pagina 03 contiene ancora investimento/ROI");

// Nuova pagina ROI (08) presente
assert.ok(html.includes("08 ROI e investimento"), "Manca pagina ROI 08");
assert.ok(html.includes("ROI stimato"), "Manca KPI ROI nella pagina 08");
assert.ok(html.includes("Investimento primo anno"), "Manca KPI investimento nella pagina 08");

// Pagina pagamenti (09) presente
assert.ok(html.includes("09 Modalità di pagamento"), "Manca pagina 09 pagamenti");
assert.ok(html.includes("Modalità di pagamento e sconti"), "Manca tabella pagamenti");

// Per partire (10) rinumerata
assert.ok(html.includes("10 Per partire davvero"), "Manca pagina 10 Per partire davvero");

console.log("pdf-layout: tutti i check OK.");

