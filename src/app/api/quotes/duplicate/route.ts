import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";
import { computeQuoteCosts } from "@/lib/costs";
import { loadQuoteDetailById } from "@/lib/quotes/serialize-quote-detail";

function buildNextQuoteNumber(prev: string | null, year: number) {
  const prefix = `Q${year}-`;
  const prevNum = prev && prev.startsWith(prefix) ? Number(prev.slice(prefix.length)) : 0;
  const nextNum = Number.isFinite(prevNum) ? prevNum + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  const body = await req.json().catch(() => null);
  const quoteId = body?.quoteId;
  if (typeof quoteId !== "string" || !quoteId.trim()) {
    return NextResponse.json({ error: "quoteId mancante" }, { status: 400 });
  }

  const source = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && source.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;
  // Il numero è sempre nuovo (progressivo nell’anno), mai una copia del source — anche se il
  // preventivo originale era già inviato.

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  let created: { id: string; quoteNumber: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const last = await prisma.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: "desc" },
        select: { quoteNumber: true },
      });
      const quoteNumber = buildNextQuoteNumber(last?.quoteNumber ?? null, year);

      created = await prisma.$transaction(async (tx) => {
        const createdQuote = await tx.quote.create({
          data: {
          quoteNumber,
          userId: session.user.id,
          dceProductId: source.dceProductId,
          clientName: source.clientName,
          clientCompany: source.clientCompany,
          clientEmail: source.clientEmail,
          clientPhone: source.clientPhone,
          clientNotes: source.clientNotes,
          crmCustomerId: source.crmCustomerId,
          clientAddress: source.clientAddress,
          clientPostalCode: source.clientPostalCode,
          clientCity: source.clientCity,
          clientProvince: source.clientProvince,
          originCliente: source.originCliente,
          estrattoDiagnosi: source.estrattoDiagnosi,
          diagnosiGiaPagata: source.diagnosiGiaPagata,
          roiPreventiviMese: source.roiPreventiviMese,
          roiImportoMedio: source.roiImportoMedio,
          roiConversioneAttuale: source.roiConversioneAttuale,
          roiMargineCommessa: source.roiMargineCommessa,
          roiSnapshot: source.roiSnapshot,
          clientVat: source.clientVat,
          clientSdi: source.clientSdi,
          totalSetup: source.totalSetup,
          totalMonthly: source.totalMonthly,
          totalAnnual: source.totalAnnual,
          setupBeforeDiscount: source.setupBeforeDiscount,
          discountType: source.discountType,
          discountAmount: source.discountAmount,
          discountCode: source.discountCode,
          discountPercent: source.discountPercent,
          scontoCrmAnnuale: source.scontoCrmAnnuale,
          scontoAiVocaleAnnuale: source.scontoAiVocaleAnnuale,
          scontoWaAnnuale: source.scontoWaAnnuale,
          voucherAuditApplied: source.voucherAuditApplied,
          kind: source.kind,
          status: "draft",
          sentAt: null,
          viewedAt: null,
          publicPdfToken: null,
          salesStage: "open",
          deliveryStage: "not_started",
          wonAt: null,
          kickoffAt: null,
          closedAt: null,
          expiresAt: source.expiresAt ?? defaultExpiry,
          notes: source.notes,
          items: {
            create: source.items.map((it) => ({
              productCode: it.productCode,
              productName: it.productName,
              price: it.price,
              quantity: it.quantity,
              isMonthly: it.isMonthly,
              isCustom: it.isCustom,
              notes: it.notes,
            })),
          },
        },
        include: { items: true },
        });

        const productCodes = createdQuote.items.map((it) => it.productCode);
        const products = await tx.product.findMany({
          where: { code: { in: productCodes } },
          select: {
            code: true,
            costs: {
              where: { active: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                unitCostCents: true,
                unit: true,
                multiplierKind: true,
                multiplierValue: true,
                conditionsJson: true,
                active: true,
              },
            },
          },
        });
        const costsByCode = new Map(products.map((p) => [p.code, p.costs]));
        const computed = computeQuoteCosts({
          ctx: {
            scontoCrmAnnuale: createdQuote.scontoCrmAnnuale,
            scontoAiVocaleAnnuale: createdQuote.scontoAiVocaleAnnuale,
            scontoWaAnnuale: createdQuote.scontoWaAnnuale,
          },
          revenueAnnual: createdQuote.totalAnnual,
          items: createdQuote.items.map((it) => ({
            id: it.id,
            productCode: it.productCode,
            quantity: it.quantity,
            isMonthly: it.isMonthly,
          })),
          costsByProductCode: costsByCode,
        });

        if (computed.itemCosts.length > 0) {
          await tx.quoteItemCost.createMany({
            data: computed.itemCosts.map((c) => ({
              quoteItemId: c.quoteItemId,
              productCostId: c.productCostId,
              name: c.name,
              unitCostCents: c.unitCostCents,
              unit: c.unit,
              multiplier: c.multiplier,
              lineCostCents: c.lineCostCents,
            })),
          });
        }

        const finalQuote = await tx.quote.update({
          where: { id: createdQuote.id },
          data: {
            costSetup: computed.costSetup,
            costMonthly: computed.costMonthly,
            costAnnual: computed.costAnnual,
            marginAnnual: computed.marginAnnual,
            marginPercentAnnual: computed.marginPercentAnnual,
          },
          select: { id: true, quoteNumber: true },
        });

        return finalQuote;
      });

      break;
    } catch (e: any) {
      if (e?.code === "P2002") continue;
      throw e;
    }
  }

  if (!created) {
    return NextResponse.json({ error: "Impossibile generare quoteNumber" }, { status: 500 });
  }

  const detail = await loadQuoteDetailById(created.id);
  if (!detail) {
    return NextResponse.json({ error: "Preventivo duplicato ma non recuperabile." }, { status: 500 });
  }
  return NextResponse.json(detail);
}

