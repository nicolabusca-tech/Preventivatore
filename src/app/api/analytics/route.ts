import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const where: any = {
    createdAt: { gte: from },
  };
  if (!isAdmin) where.userId = userId;

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      user: { select: { name: true } },
      payments: true,
      adjustments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  function adjustmentToAnnual(a: any): { revenue: number; cost: number } {
    const amt = Number(a?.amount || 0);
    const kind = String(a?.kind || "").toLowerCase();
    const freq = String(a?.frequency || "ONE_TIME").toUpperCase();
    const annual = freq === "MONTH" ? amt * 12 : amt;
    if (kind === "revenue") return { revenue: annual, cost: 0 };
    if (kind === "cost") return { revenue: 0, cost: annual };
    return { revenue: 0, cost: 0 };
  }

  const enrichedQuotes = quotes.map((q: any) => {
    const adj = (q.adjustments || []).reduce(
      (acc: any, a: any) => {
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

  const summary = enrichedQuotes.reduce(
    (acc, q: any) => {
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

  const pipeline = {
    open: enrichedQuotes.filter((q: any) => q.salesStage === "open").length,
    won: enrichedQuotes.filter((q: any) => q.salesStage === "won").length,
    lost: enrichedQuotes.filter((q: any) => q.salesStage === "lost").length,
    not_started: enrichedQuotes.filter((q: any) => q.deliveryStage === "not_started" && q.salesStage === "won").length,
    in_progress: enrichedQuotes.filter((q: any) => q.deliveryStage === "in_progress" && q.salesStage === "won").length,
    done: enrichedQuotes.filter((q: any) => q.deliveryStage === "done" && q.salesStage === "won").length,
  };

  const payments = enrichedQuotes.flatMap((q: any) =>
    (q.payments || []).map((p: any) => ({
      ...p,
      quoteId: q.id,
      quoteNumber: q.quoteNumber,
      clientName: q.clientName,
      userName: q.user?.name || "",
    }))
  );

  const cash = payments.reduce(
    (acc, p: any) => {
      if (p.paidAt) acc.paid += p.amount || 0;
      else acc.outstanding += p.amount || 0;
      return acc;
    },
    { paid: 0, outstanding: 0 }
  );

  return NextResponse.json({
    rangeDays,
    from,
    summary,
    pipeline,
    quotes: enrichedQuotes,
    payments,
    cash,
  });
}

