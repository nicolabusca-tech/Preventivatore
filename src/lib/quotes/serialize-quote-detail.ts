import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { QuoteDetail, QuoteDetailItem } from "@/lib/types/quote";

/** Include per GET /api/quotes/[id] — solo ciò che entra in `QuoteDetail`. */
export const quoteDetailInclude = {
  user: { select: { name: true, email: true } },
  items: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.QuoteInclude;

export type QuoteDetailDb = Prisma.QuoteGetPayload<{ include: typeof quoteDetailInclude }>;

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function mapItem(row: QuoteDetailDb["items"][number]): QuoteDetailItem {
  return {
    id: row.id,
    productCode: row.productCode,
    productName: row.productName,
    price: row.price,
    quantity: row.quantity,
    isMonthly: row.isMonthly,
  };
}

/** Converte una riga Prisma nel contratto JSON `QuoteDetail` (date ISO, senza relazioni extra). */
export function toQuoteDetail(quote: QuoteDetailDb): QuoteDetail {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    clientName: quote.clientName,
    clientCompany: quote.clientCompany,
    clientEmail: quote.clientEmail,
    clientPhone: quote.clientPhone,
    clientNotes: quote.clientNotes,
    clientAddress: quote.clientAddress,
    clientPostalCode: quote.clientPostalCode,
    clientCity: quote.clientCity,
    clientProvince: quote.clientProvince,
    clientVat: quote.clientVat,
    clientSdi: quote.clientSdi,
    crmCustomerId: quote.crmCustomerId,
    originCliente: quote.originCliente,
    estrattoDiagnosi: quote.estrattoDiagnosi,
    diagnosiGiaPagata: quote.diagnosiGiaPagata,
    roiPreventiviMese: quote.roiPreventiviMese,
    roiImportoMedio: quote.roiImportoMedio,
    roiConversioneAttuale: quote.roiConversioneAttuale,
    roiMargineCommessa: quote.roiMargineCommessa,
    roiSnapshot: quote.roiSnapshot,
    notes: quote.notes,
    totalSetup: quote.totalSetup,
    totalMonthly: quote.totalMonthly,
    totalAnnual: quote.totalAnnual,
    costSetup: quote.costSetup,
    costMonthly: quote.costMonthly,
    costAnnual: quote.costAnnual,
    marginAnnual: quote.marginAnnual,
    marginPercentAnnual: quote.marginPercentAnnual,
    kind: quote.kind,
    salesStage: quote.salesStage,
    deliveryStage: quote.deliveryStage,
    wonAt: toIso(quote.wonAt),
    kickoffAt: toIso(quote.kickoffAt),
    closedAt: toIso(quote.closedAt),
    setupBeforeDiscount: quote.setupBeforeDiscount,
    discountType: quote.discountType,
    discountAmount: quote.discountAmount,
    discountCode: quote.discountCode,
    discountPercent: quote.discountPercent,
    scontoCrmAnnuale: quote.scontoCrmAnnuale,
    scontoAiVocaleAnnuale: quote.scontoAiVocaleAnnuale,
    scontoWaAnnuale: quote.scontoWaAnnuale,
    voucherAuditApplied: quote.voucherAuditApplied,
    creditoMcEnabled: quote.creditoMcEnabled,
    status: quote.status,
    sentAt: toIso(quote.sentAt),
    viewedAt: toIso(quote.viewedAt),
    expiresAt: toIso(quote.expiresAt),
    createdAt: quote.createdAt.toISOString(),
    user: { name: quote.user.name, email: quote.user.email },
    items: quote.items.map(mapItem),
  };
}

/** Ricarica dal DB e serializza come `QuoteDetail` (POST create / duplicate / manual). */
export async function loadQuoteDetailById(id: string): Promise<QuoteDetail | null> {
  const row = await prisma.quote.findUnique({
    where: { id },
    include: quoteDetailInclude,
  });
  if (!row) return null;
  return toQuoteDetail(row);
}
