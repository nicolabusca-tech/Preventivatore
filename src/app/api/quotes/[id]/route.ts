import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";
import { computeQuoteCosts } from "@/lib/costs";
import { quoteDetailInclude, toQuoteDetail } from "@/lib/quotes/serialize-quote-detail";
import type { QuoteDetail } from "@/lib/types/quote";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  await ensureQuoteSchema();

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: quoteDetailInclude,
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });

  // Solo admin o owner
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const body: QuoteDetail = toQuoteDetail(quote);
  return NextResponse.json(body);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  const data = await req.json();

  // Supporta due modalità:
  // - Update veloce (status/notes/expiresAt/DCE) usato in passato
  // - Update completo della bozza (draft) dal nuovo editor UI
  const wantsFullUpdate = data && (data.items !== undefined || data.clientName !== undefined);

  if (!wantsFullUpdate && data.status !== undefined) {
    const allowed = ["draft", "sent", "viewed"];
    if (typeof data.status !== "string" || !allowed.includes(data.status)) {
      return NextResponse.json(
        { error: "Stato non valido. Valori ammessi: draft, sent, viewed." },
        { status: 400 }
      );
    }
  }

  if (!wantsFullUpdate && data.salesStage !== undefined) {
    const allowed = ["open", "won", "lost"];
    if (typeof data.salesStage !== "string" || !allowed.includes(data.salesStage)) {
      return NextResponse.json(
        { error: "salesStage non valido. Valori ammessi: open, won, lost." },
        { status: 400 }
      );
    }
  }

  if (!wantsFullUpdate && data.deliveryStage !== undefined) {
    const allowed = ["not_started", "in_progress", "done"];
    if (typeof data.deliveryStage !== "string" || !allowed.includes(data.deliveryStage)) {
      return NextResponse.json(
        { error: "deliveryStage non valido. Valori ammessi: not_started, in_progress, done." },
        { status: 400 }
      );
    }
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!quote) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  if (wantsFullUpdate) {
    // Compat legacy: alcuni record storici usano "pending" come bozza.
    if (quote.status !== "draft" && quote.status !== "pending") {
      return NextResponse.json(
        { error: "Preventivo non modificabile: non è più in bozza." },
        { status: 400 }
      );
    }
    if (typeof data.clientName !== "string" || !data.clientName.trim()) {
      return NextResponse.json({ error: "clientName mancante" }, { status: 400 });
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "items mancanti" }, { status: 400 });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
        await tx.quoteItem.createMany({
          data: data.items.map((it: any) => ({
            quoteId: quote.id,
            productCode: String(it.productCode),
            productName: String(it.productName || it.productCode),
            price: Number(it.price || 0),
            quantity: Number(it.quantity || 1),
            isMonthly: !!it.isMonthly,
            notes: it.notes ?? null,
          })),
        });

        const updatedQuote = await tx.quote.update({
          where: { id: quote.id },
          data: {
            clientName: data.clientName.trim(),
            clientCompany: data.clientCompany ?? null,
            clientEmail: data.clientEmail ?? null,
            clientPhone: data.clientPhone ?? null,
            clientNotes: data.clientNotes ?? null,
            crmCustomerId: data.crmCustomerId ?? null,
            clientAddress: data.clientAddress ?? null,
            clientPostalCode: data.clientPostalCode ?? null,
            clientCity: data.clientCity ?? null,
            clientProvince: data.clientProvince ?? null,
            clientVat: data.clientVat ?? null,
            clientSdi: data.clientSdi ?? null,
            originCliente: data.originCliente ?? null,
            estrattoDiagnosi: data.estrattoDiagnosi ?? null,
            diagnosiGiaPagata: data.diagnosiGiaPagata !== undefined ? !!data.diagnosiGiaPagata : quote.diagnosiGiaPagata,
            roiPreventiviMese: data.roiPreventiviMese ?? null,
            roiImportoMedio: data.roiImportoMedio ?? null,
            roiConversioneAttuale: data.roiConversioneAttuale ?? null,
            roiMargineCommessa: data.roiMargineCommessa ?? null,
            roiSnapshot: data.roiSnapshot ?? null,
            notes: data.notes ?? null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : quote.expiresAt,
            voucherAuditApplied: !!data.voucherAuditApplied,
            totalSetup: Number(data.totalSetup || 0),
            totalMonthly: Number(data.totalMonthly || 0),
            totalAnnual: Number(data.totalAnnual || 0),
            setupBeforeDiscount: Number(data.setupBeforeDiscount || 0),
            discountType: data.discountType ?? null,
            discountAmount: Number(data.discountAmount || 0),
            discountCode: data.discountCode ?? null,
            discountPercent: Number(data.discountPercent || 0),
            scontoCrmAnnuale: data.scontoCrmAnnuale !== undefined ? !!data.scontoCrmAnnuale : quote.scontoCrmAnnuale,
            scontoAiVocaleAnnuale: data.scontoAiVocaleAnnuale !== undefined ? !!data.scontoAiVocaleAnnuale : quote.scontoAiVocaleAnnuale,
            scontoWaAnnuale: data.scontoWaAnnuale !== undefined ? !!data.scontoWaAnnuale : quote.scontoWaAnnuale,
            // dceProductId viene mantenuto/aggiornato da create route (enforced); qui lo accettiamo se passato
            dceProductId: data.dceProductId !== undefined ? (data.dceProductId || null) : quote.dceProductId,
          },
          include: {
            user: { select: { name: true, email: true } },
            items: { orderBy: { createdAt: "asc" } },
          },
        });

        // --- Costi e margini (ricalcolo + snapshot) ---
        const itemsFresh = await tx.quoteItem.findMany({
          where: { quoteId: updatedQuote.id },
          select: { id: true, productCode: true, quantity: true, isMonthly: true },
          orderBy: { createdAt: "asc" },
        });
        const productCodes = itemsFresh.map((it) => it.productCode);
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
            scontoCrmAnnuale: updatedQuote.scontoCrmAnnuale,
            scontoAiVocaleAnnuale: updatedQuote.scontoAiVocaleAnnuale,
            scontoWaAnnuale: updatedQuote.scontoWaAnnuale,
          },
          revenueAnnual: updatedQuote.totalAnnual,
          items: itemsFresh,
          costsByProductCode: costsByCode,
        });

        // Elimina eventuali snapshot costi precedenti (defensivo)
        await tx.quoteItemCost.deleteMany({
          where: { quoteItemId: { in: itemsFresh.map((it) => it.id) } },
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
          where: { id: updatedQuote.id },
          data: {
            costSetup: computed.costSetup,
            costMonthly: computed.costMonthly,
            costAnnual: computed.costAnnual,
            marginAnnual: computed.marginAnnual,
            marginPercentAnnual: computed.marginPercentAnnual,
          },
          include: {
            user: { select: { name: true, email: true } },
            items: { orderBy: { createdAt: "asc" } },
          },
        });

        return finalQuote;
      });

      return NextResponse.json(updated);
    } catch (e) {
      console.error("Errore aggiornamento bozza:", e);
      return NextResponse.json({ error: "Errore durante l'aggiornamento della bozza" }, { status: 500 });
    }
  }

  const wantsDceUpdate = data.dceProductId !== undefined;
  const dceProductId: string | null =
    wantsDceUpdate && typeof data.dceProductId === "string" && data.dceProductId.length > 0
      ? data.dceProductId
      : wantsDceUpdate
        ? null
        : quote.dceProductId;

  const prevDceMonthly = quote.items
    .filter((i) => i.isMonthly && DCE_ALLOWED_CODES.includes(i.productCode as any))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  try {
    const updated = await prisma.$transaction(async (tx) => {
    let nextTotalMonthly = quote.totalMonthly;
    let nextTotalAnnual = quote.totalAnnual;

    if (wantsDceUpdate && dceProductId) {
      const dceProduct = await tx.product.findUnique({
        where: { id: dceProductId },
        select: { id: true, code: true, name: true, price: true, isMonthly: true },
      });

      if (!dceProduct || !DCE_ALLOWED_CODES.includes(dceProduct.code as any) || !dceProduct.isMonthly) {
        throw new Error("DCE_INVALID");
      }

      const newDceMonthly = dceProduct.price;
      nextTotalMonthly = Math.max(0, quote.totalMonthly - prevDceMonthly + newDceMonthly);
      nextTotalAnnual = Math.max(0, quote.totalAnnual - prevDceMonthly * 12 + newDceMonthly * 12);

      await tx.quoteItem.deleteMany({
        where: { quoteId: quote.id, isMonthly: true, productCode: { in: [...DCE_ALLOWED_CODES] as any } },
      });
      await tx.quoteItem.create({
        data: {
          quoteId: quote.id,
          productCode: dceProduct.code,
          productName: dceProduct.name,
          price: dceProduct.price,
          quantity: 1,
          isMonthly: true,
        },
      });
    } else if (wantsDceUpdate && dceProductId === null) {
      nextTotalMonthly = Math.max(0, quote.totalMonthly - prevDceMonthly);
      nextTotalAnnual = Math.max(0, quote.totalAnnual - prevDceMonthly * 12);
      await tx.quoteItem.deleteMany({
        where: { quoteId: quote.id, isMonthly: true, productCode: { in: [...DCE_ALLOWED_CODES] as any } },
      });
    }

    return await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: data.status ?? quote.status,
        notes: data.notes ?? quote.notes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : quote.expiresAt,
        dceProductId: wantsDceUpdate ? dceProductId : quote.dceProductId,
        totalMonthly: nextTotalMonthly,
        totalAnnual: nextTotalAnnual,
        salesStage: data.salesStage ?? quote.salesStage,
        deliveryStage: data.deliveryStage ?? quote.deliveryStage,
        wonAt: data.wonAt !== undefined ? (data.wonAt ? new Date(data.wonAt) : null) : quote.wonAt,
        kickoffAt: data.kickoffAt !== undefined ? (data.kickoffAt ? new Date(data.kickoffAt) : null) : quote.kickoffAt,
        closedAt: data.closedAt !== undefined ? (data.closedAt ? new Date(data.closedAt) : null) : quote.closedAt,
        deliveryExpectedAt:
          data.deliveryExpectedAt !== undefined
            ? data.deliveryExpectedAt
              ? new Date(String(data.deliveryExpectedAt))
              : null
            : quote.deliveryExpectedAt,
        depositPercent:
          data.depositPercent !== undefined
            ? Math.min(100, Math.max(0, Math.round(Number(data.depositPercent))))
            : quote.depositPercent,
      },
      include: {
        user: { select: { name: true, email: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "DCE_INVALID") {
      return NextResponse.json(
        { error: "Livello DCE non valido. Seleziona DCE_BASE, DCE_STRUTTURATO o DCE_ENTERPRISE." },
        { status: 400 }
      );
    }
    console.error("Errore aggiornamento preventivo:", e);
    return NextResponse.json({ error: "Errore durante l'aggiornamento del preventivo" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  await prisma.quote.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
