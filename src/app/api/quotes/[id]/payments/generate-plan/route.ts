import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";
import { buildDefaultPaymentPlan, paymentRowsToCreateMany } from "@/lib/quote-payment-plan";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const replaceExisting = body?.replaceExisting !== false;

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
    body?.acquisitionDate != null && String(body.acquisitionDate).trim().length > 0;
  const acquisitionDate = explicitAcquisition
    ? new Date(String(body.acquisitionDate))
    : quote.wonAt ?? new Date();

  let deliveryExpectedAt: Date | null =
    body?.deliveryExpectedAt !== undefined
      ? String(body.deliveryExpectedAt || "").trim()
        ? new Date(String(body.deliveryExpectedAt))
        : null
      : quote.deliveryExpectedAt;

  const depositPercent =
    body?.depositPercent !== undefined
      ? Math.min(100, Math.max(0, Math.round(Number(body.depositPercent))))
      : quote.depositPercent;

  if (quote.totalMonthly > 0 && !deliveryExpectedAt) {
    return NextResponse.json(
      { error: "Imposta la data di consegna prevista per generare le mensilità canone." },
      { status: 400 }
    );
  }

  const deliveryForPlan = deliveryExpectedAt ?? acquisitionDate;

  const rows = buildDefaultPaymentPlan({
    quote: { ...quote, depositPercent },
    items: quote.items,
    productsByCode,
    acquisitionDate,
    deliveryExpectedAt: deliveryForPlan,
    depositPercent,
  });

  const created = await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        deliveryExpectedAt,
        depositPercent,
        wonAt: explicitAcquisition ? acquisitionDate : quote.wonAt ?? acquisitionDate,
      },
    });

    if (replaceExisting) {
      await tx.quotePayment.deleteMany({ where: { quoteId: quote.id } });
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

  return NextResponse.json({ payments: created, plannedCount: rows.length });
}
