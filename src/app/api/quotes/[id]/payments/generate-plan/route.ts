import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";
import {
  PAYMENT_KIND,
  buildDefaultPaymentPlan,
  buildCustomPaymentPlan,
  paymentRowsToCreateMany,
  type CustomPlanInput,
} from "@/lib/quote-payment-plan";

function addMonthsStartOfDay(d: Date, months: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  x.setMonth(x.getMonth() + months);
  return x;
}
import { toQuotePaymentJson } from "@/lib/quotes/serialize-nested";
import type { GeneratePlanResponseJson } from "@/lib/types/quote-nested";

type Scope = "all" | "monthly" | "custom";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const payload = await req.json().catch(() => ({}));
  const scope: Scope = payload?.scope === "monthly"
    ? "monthly"
    : payload?.scope === "custom"
      ? "custom"
      : "all";
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

  // ============================================================
  // Modalita' "custom": il commerciale ha definito un piano nel drawer
  // (acconto libero in € o %, N rate del saldo, prima data, metodi).
  // I canoni mensili e gli anticipi annuali vengono comunque generati
  // automaticamente come prima per non rompere il pattern.
  // ============================================================
  if (scope === "custom") {
    const cp = payload?.customPlan;
    if (!cp || typeof cp !== "object") {
      return NextResponse.json({ error: "customPlan mancante" }, { status: 400 });
    }
    // Default: split solo il setup (totalOneTime - prepay annuali NON sono da rateizzare,
    // sono pagamenti separati).
    const totalToSplit = typeof cp.totalToSplit === "number" && cp.totalToSplit >= 0
      ? Math.round(cp.totalToSplit)
      : Math.round(quote.totalOneTime || 0);
    const numInstallments = Math.max(0, Math.min(60, Math.floor(Number(cp.numInstallments) || 0)));
    const depositMode = cp.deposit?.mode === "percent" ? "percent" : "amount";
    const depositValue = Number(
      depositMode === "percent" ? cp.deposit?.percent : cp.deposit?.amount
    ) || 0;
    const customInput: CustomPlanInput = {
      totalToSplit,
      deposit: depositMode === "percent"
        ? { mode: "percent", percent: depositValue }
        : { mode: "amount", amount: depositValue },
      depositDate: cp.depositDate ? new Date(String(cp.depositDate)) : acquisitionDate,
      depositMethod: cp.depositMethod === "card" ? "card" : cp.depositMethod === "bank" ? "bank" : undefined,
      numInstallments,
      firstInstallmentDate: cp.firstInstallmentDate
        ? new Date(String(cp.firstInstallmentDate))
        : addMonthsStartOfDay(acquisitionDate, 1),
      installmentDates: Array.isArray(cp.installmentDates)
        ? cp.installmentDates.map((s: unknown) => new Date(String(s)))
        : undefined,
      installmentMethods: Array.isArray(cp.installmentMethods)
        ? cp.installmentMethods.map((m: unknown) => (m === "card" ? "card" : "bank"))
        : undefined,
      methodThreshold: typeof cp.methodThreshold === "number" ? cp.methodThreshold : undefined,
    };

    const customResult = buildCustomPaymentPlan(customInput);

    // Aggiungo i canoni mensili (se ce ne sono) usando il generatore default
    // ma estraendo solo le righe MONTHLY_CANONE.
    const defaultRows = buildDefaultPaymentPlan({
      quote: { ...quote, depositPercent },
      items: quote.items,
      productsByCode,
      acquisitionDate,
      deliveryExpectedAt: deliveryForPlan,
      depositPercent,
    });
    const monthlyCanoneRows = defaultRows.filter((r) => r.kind === PAYMENT_KIND.MONTHLY_CANONE);
    const prepayRows = defaultRows.filter((r) =>
      r.kind === PAYMENT_KIND.PREPAY_CRM ||
      r.kind === PAYMENT_KIND.PREPAY_AIVOCALE ||
      r.kind === PAYMENT_KIND.PREPAY_WA
    );
    const allCustomRows = [...customResult.rows, ...prepayRows, ...monthlyCanoneRows];

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
      const data = paymentRowsToCreateMany(quote.id, allCustomRows);
      if (data.length > 0) {
        await tx.quotePayment.createMany({ data });
      }
      return tx.quotePayment.findMany({
        where: { quoteId: quote.id },
        orderBy: { dueDate: "asc" },
      });
    });

    const response: GeneratePlanResponseJson = {
      payments: created.map(toQuotePaymentJson),
      plannedCount: created.length,
      scope: "all",
    };
    return NextResponse.json(response);
  }

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
