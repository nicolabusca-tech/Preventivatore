import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  AnalyticsPaymentRow,
  AnalyticsPipeline,
  AnalyticsQuote,
  AnalyticsResponse,
  AnalyticsSummary,
  AcquiredCumulativePoint,
} from "@/lib/types/analytics";

const analyticsInclude = {
  user: { select: { name: true } },
  payments: true,
  adjustments: true,
} as const satisfies Prisma.QuoteInclude;

type QuoteDb = Prisma.QuoteGetPayload<{ include: typeof analyticsInclude }>;

type EnrichedQuote = QuoteDb & {
  effectiveRevenueAnnual: number;
  effectiveCostAnnual: number;
  effectiveMarginAnnual: number;
  effectiveMarginPercentAnnual: number;
  adjustmentsAnnualRevenue: number;
  adjustmentsAnnualCost: number;
};

function adjustmentToAnnual(a: QuoteDb["adjustments"][number]): { revenue: number; cost: number } {
  const amt = Number(a.amount || 0);
  const kind = String(a.kind || "").toLowerCase();
  const freq = String(a.frequency || "ONE_TIME").toUpperCase();
  const annual = freq === "MONTH" ? amt * 12 : amt;
  if (kind === "revenue") return { revenue: annual, cost: 0 };
  if (kind === "cost") return { revenue: 0, cost: annual };
  return { revenue: 0, cost: 0 };
}

function toAnalyticsQuote(q: EnrichedQuote): AnalyticsQuote {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientName: q.clientName,
    clientCompany: q.clientCompany,
    createdAt: q.createdAt.toISOString(),
    user: { name: q.user.name },
    totalOneTime: q.totalOneTime,
    totalMonthly: q.totalMonthly,
    totalAnnual: q.totalAnnual,
    costAnnual: q.costAnnual,
    effectiveRevenueAnnual: q.effectiveRevenueAnnual,
    effectiveCostAnnual: q.effectiveCostAnnual,
    effectiveMarginAnnual: q.effectiveMarginAnnual,
    effectiveMarginPercentAnnual: q.effectiveMarginPercentAnnual,
    adjustmentsAnnualRevenue: q.adjustmentsAnnualRevenue,
    adjustmentsAnnualCost: q.adjustmentsAnnualCost,
    salesStage: q.salesStage,
    deliveryStage: q.deliveryStage,
    wonAt: q.wonAt ? q.wonAt.toISOString() : null,
    deliveryExpectedAt: q.deliveryExpectedAt ? q.deliveryExpectedAt.toISOString() : null,
    depositPercent: q.depositPercent,
  };
}

function toAnalyticsPaymentRow(
  q: EnrichedQuote,
  p: QuoteDb["payments"][number]
): AnalyticsPaymentRow {
  return {
    id: p.id,
    amount: p.amount,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    notes: p.notes,
    kind: p.kind,
    quoteId: q.id,
    quoteNumber: q.quoteNumber,
    clientName: q.clientName,
    userName: q.user.name,
    method: p.method ?? null,
  };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "180d";

  const now = Date.now();
  const rangeDays = (() => {
    if (range === "30d") return 30;
    if (range === "90d") return 90;
    if (range === "365d") return 365;
    return 180;
  })();
  const from = new Date(now - rangeDays * 24 * 60 * 60 * 1000);

  const where: Prisma.QuoteWhereInput = {
    createdAt: { gte: from },
  };
  if (!isAdmin) where.userId = userId;

  const quotes = await prisma.quote.findMany({
    where,
    include: analyticsInclude,
    orderBy: { createdAt: "desc" },
  });

  const enrichedQuotes: EnrichedQuote[] = quotes.map((q) => {
    const adj = q.adjustments.reduce(
      (acc, a) => {
        const r = adjustmentToAnnual(a);
        acc.revenue += r.revenue;
        acc.cost += r.cost;
        return acc;
      },
      { revenue: 0, cost: 0 }
    );

    const effectiveRevenueAnnual = (q.totalAnnual || 0) + adj.revenue;
    const effectiveCostAnnual = (q.costAnnual || 0) + adj.cost;
    const effectiveMarginAnnual = effectiveRevenueAnnual - effectiveCostAnnual;
    const effectiveMarginPercentAnnual =
      effectiveRevenueAnnual > 0 ? (effectiveMarginAnnual / effectiveRevenueAnnual) * 100 : 0;

    return {
      ...q,
      effectiveRevenueAnnual,
      effectiveCostAnnual,
      effectiveMarginAnnual,
      effectiveMarginPercentAnnual,
      adjustmentsAnnualRevenue: adj.revenue,
      adjustmentsAnnualCost: adj.cost,
    };
  });

  const summary: AnalyticsSummary = enrichedQuotes.reduce(
    (acc, q) => {
      acc.count += 1;
      acc.revenueAnnual += q.effectiveRevenueAnnual || 0;
      acc.costAnnual += q.effectiveCostAnnual || 0;
      acc.marginAnnual += q.effectiveMarginAnnual || 0;
      if (q.salesStage === "won") acc.wonCount += 1;
      if (q.salesStage === "lost") acc.lostCount += 1;
      return acc;
    },
    { count: 0, wonCount: 0, lostCount: 0, revenueAnnual: 0, costAnnual: 0, marginAnnual: 0 }
  );

  const pipeline: AnalyticsPipeline = {
    open: enrichedQuotes.filter((q) => q.salesStage === "open").length,
    won: enrichedQuotes.filter((q) => q.salesStage === "won").length,
    lost: enrichedQuotes.filter((q) => q.salesStage === "lost").length,
    not_started: enrichedQuotes.filter((q) => q.deliveryStage === "not_started" && q.salesStage === "won")
      .length,
    in_progress: enrichedQuotes.filter((q) => q.deliveryStage === "in_progress" && q.salesStage === "won")
      .length,
    done: enrichedQuotes.filter((q) => q.deliveryStage === "done" && q.salesStage === "won").length,
  };

  const flatPayments: AnalyticsPaymentRow[] = enrichedQuotes.flatMap((q) =>
    q.payments.map((p) => toAnalyticsPaymentRow(q, p))
  );

  const cash = flatPayments.reduce(
    (acc, p) => {
      if (p.paidAt) acc.paid += p.amount || 0;
      else acc.outstanding += p.amount || 0;
      return acc;
    },
    { paid: 0, outstanding: 0 }
  );

  function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const acquiredByMonth = new Map<string, number>();
  let earliestWon: Date | null = null;

  for (const q of enrichedQuotes) {
    if (q.salesStage !== "won" || !q.wonAt) continue;
    const d = new Date(q.wonAt);
    if (Number.isNaN(d.getTime())) continue;
    if (!earliestWon || d < earliestWon) earliestWon = d;
    // Vedi nota in analisi/page.tsx:valoreContratto. totalOneTime salvato a DB
    // è oneTimeTotal e si trova già dentro totalAnnual: sommarli duplicava il
    // setup nei punti di acquisito cumulativo per mese.
    const value = q.effectiveRevenueAnnual || q.totalAnnual || 0;
    const k = monthKey(d);
    acquiredByMonth.set(k, (acquiredByMonth.get(k) || 0) + value);
  }

  function* monthRange(start: Date, end: Date) {
    const a = new Date(start.getFullYear(), start.getMonth(), 1, 12);
    const b = new Date(end.getFullYear(), end.getMonth(), 1, 12);
    while (a.getTime() <= b.getTime()) {
      yield new Date(a);
      a.setMonth(a.getMonth() + 1);
    }
  }

  const acquiredCumulative: AcquiredCumulativePoint[] = [];
  if (acquiredByMonth.size > 0) {
    const start = earliestWon ? new Date(earliestWon) : new Date(from);
    const end = new Date();
    let running = 0;
    for (const m of monthRange(start, end)) {
      const k = monthKey(m);
      const inc = acquiredByMonth.get(k) || 0;
      running += inc;
      acquiredCumulative.push({
        month: k,
        label: m.toLocaleDateString("it-IT", { month: "short", year: "numeric" }),
        monthValue: inc,
        cumulative: running,
      });
    }
  }

  const quotesJson: AnalyticsQuote[] = enrichedQuotes.map(toAnalyticsQuote);

  const body: AnalyticsResponse = {
    rangeDays,
    from: from.toISOString(),
    summary,
    pipeline,
    quotes: quotesJson,
    payments: flatPayments,
    cash,
    acquiredCumulative,
  };

  return NextResponse.json(body);
}
