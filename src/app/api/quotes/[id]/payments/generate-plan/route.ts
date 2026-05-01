import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";
import {
  PAYMENT_KIND,
  buildDefaultPaymentPlan,
  paymentRowsToCreateMany,
} from "@/lib/quote-payment-plan";
import { toQuotePaymentJson } from "@/lib/quotes/serialize-nested";
import type { GeneratePlanResponseJson } from "@/lib/types/quote-nested";

type Scope = "all" | "monthly";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const payload = await req.json().catch(() => ({}));
  const scope: Scope = payload?.scope === "monthly" ? "monthly" : "all";
  const replaceExisting = payload?.replaceExisting !== false;

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const codes = [...new Set(quote.items.map((i) => i.productCode))];
  const products = await prisma.product.findMany({
    where: { code: { in: codes } },
    select: { code: true, block: true, isMonthly: true },
  });
  const productsByCode = new Map(products.map((p) => [p.code, p]));

  const explicitAcquisition =
    payload?.acquisitionDate != null && String(payload.acquisitionDate).trim().length > 0;
  const acquisitionDate = explicitAcquisition
    ? new Date(String(payload.acquisitionDate))
    : quote.wonAt ?? new Date();

  const deliveryExpectedAt: Date | null =
    payload?.deliveryExpectedAt !== undefined
      ? String(payload.deliveryExpectedAt || "").trim()
        ? new Date(String(payload.deliveryExpectedAt))
        : null
      : quote.deliveryExpectedAt;

  const depositPercent =
    payload?.depositPercent !== undefined
      ? Math.min(100, Math.max(0, Math.round(Number(payload.depositPercent))))
      : quote.depositPercent;

  if (scope === "monthly") {
    if (quote.totalMonthly <= 0) {
      return NextResponse.json(
        { error: "Questo preventivo non prevede canoni mensili." },
        { status: 400 }
      );
    }
    if (!deliveryExpectedAt) {
      return NextResponse.json(
        { error: "Imposta la data di consegna prevista per generare le mensilità canone." },
        { status: 400 }
      );
    }
  } else if (quote.totalMonthly > 0 && !deliveryExpectedAt) {
    return NextResponse.json(
      { error: "Imposta la data di consegna prevista per generare le mensilità canone." },
      { status: 400 }
    );
  }

  const deliveryForPlan = deliveryExpectedAt ?? acquisitionDate;

  const fullRows = buildDefaultPaymentPlan({
    quote: { ...quote, depositPercent },
    items: quote.items,
    productsByCode,
    acquisitionDate,
    deliveryExpectedAt: deliveryForPlan,
    depositPercent,
  });

  const rows =
    scope === "monthly"
      ? fullRows.filter((r) => r.kind === PAYMENT_KIND.MONTHLY_CANONE)
      : fullRows;

  const created = await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        deliveryExpectedAt,
        depositPercent,
        wonAt: explicitAcquisition ? acquisitionDate : quote.wonAt ?? acquisitionDate,
      },
    });

    if (scope === "all" && replaceExisting) {
      await tx.quotePayment.deleteMany({ where: { quoteId: quote.id } });
    }
    if (scope === "monthly") {
      // Sostituisce solo le mensilità canone, lascia intatti acconto/setup/prepay e rate manuali
      await tx.quotePayment.deleteMany({
        where: { quoteId: quote.id, kind: PAYMENT_KIND.MONTHLY_CANONE },
      });
    }

    const data = paymentRowsToCreateMany(quote.id, rows);
    if (data.length > 0) {
      await tx.quotePayment.createMany({ data });
    }

    return tx.quotePayment.findMany({
      where: { quoteId: quote.id },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });
  });

  const responseBody: GeneratePlanResponseJson = {
    payments: created.map(toQuotePaymentJson),
    plannedCount: rows.length,
    scope,
  };
  return NextResponse.json(responseBody);
}
