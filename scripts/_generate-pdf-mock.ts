import fs from "node:fs";
import path from "node:path";
import type { Quote, QuoteItem, User } from "@prisma/client";
import { generatePdf } from "../src/lib/pdf/generate-pdf";

async function main() {
  const quote = {
    id: "q_mock",
    quoteNumber: "QMOCK-0001",
    publicPdfToken: null,
    userId: "u_mock",
    dceProductId: null,
    clientName: "Mock Cliente",
    clientCompany: "Mock Srl",
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
    roiPreventiviMese: 12,
    roiImportoMedio: 44000,
    roiConversioneAttuale: 18,
    roiMargineCommessa: 20,
    roiSnapshot: JSON.stringify({
      inputs: {
        preventiviMese: 12,
        importoMedio: 44000,
        conversioneAttuale: 18,
        margineCommessa: 20,
      },
      fatturatoAnnuoBaseline: 0,
      margineAnnuoBaseline: 228096,
      valoreFatturatoProposta: 19828,
      margineStimatoProposta: 307930,
      valoreQuotaDiagnosi: 0,
      indice: 4.03,
    }),
    clientVat: null,
    clientSdi: null,
    totalOneTime: 16973,
    totalMonthly: 149,
    totalAnnual: 19828,
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
    setupBeforeDiscount: 16973,
    discountType: null,
    discountAmount: 0,
    discountCode: null,
    discountPercent: 0,
    scontoCrmAnnuale: true,
    scontoAiVocaleAnnuale: false,
    scontoWaAnnuale: true,
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
      id: "i_setup",
      quoteId: quote.id,
      productCode: "SETUP_SISTEMA",
      productName: "Setup sistema",
      price: 16973,
      quantity: 1,
      isMonthly: false,
    } as any,
    {
      id: "i_crm",
      quoteId: quote.id,
      productCode: "CANONE_CRM_5",
      productName: "CRM - fino a 5 licenze",
      price: 79,
      quantity: 1,
      isMonthly: true,
    } as any,
    {
      id: "i_wa",
      quoteId: quote.id,
      productCode: "CANONE_WA_AVVIO",
      productName: "WhatsApp - Avvio",
      price: 79,
      quantity: 1,
      isMonthly: true,
    } as any,
  ];

  const user = { name: "Metodo Cantiere", email: "info@metodocantiere.com" } satisfies Pick<
    User,
    "name" | "email"
  >;

  const pdf = await generatePdf({ ...(quote as any), items, user });

  const out = path.join(process.cwd(), "tmp", "_pdf_mock_layout.pdf");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, pdf);
  process.stdout.write(out);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

