import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  AnalyticsPaymentRow,
  AnalyticsPipeline,
  AnalyticsPipelineByStage,
  AnalyticsFunnelStep,
  AnalyticsQuote,
  AnalyticsResponse,
  AnalyticsSummary,
  AnalyticsYoYView,
  AcquiredCumulativePoint,
  CashflowPoint,
  MonthlyPoint,
  AnalyticsByOrigin,
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

  // Cap di sicurezza: oltre 2000 preventivi nel range il calcolo e' sospetto e
  // puo' far timeoutare il deploy su Vercel functions. La UI di Analisi ha gia'
  // i filtri di range; se mai si arrivera' a piu' di 2000 si rifa' come stream.
  const quotes = await prisma.quote.findMany({
    where,
    include: analyticsInclude,
    orderBy: { createdAt: "desc" },
    take: 2000,
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

  // ============================================================
  // Aggregati per i widget della pagina Analisi YoY:
  // - Pipeline per fase (Pipeline widget)
  // - Funnel di conversione (Funnel widget)
  // - Cashflow previsionale (Cashflow widget)
  // - Vista anno-su-anno (YoY widget + KPI)
  // ============================================================

  const fnUrl = new URL(req.url);
  const yearParam = Number(fnUrl.searchParams.get("year") || NaN);
  const compareYearParam = fnUrl.searchParams.get("compareYear");
  const yearForYoY = Number.isFinite(yearParam) && yearParam > 2000 && yearParam < 3000
    ? yearParam
    : new Date().getFullYear();
  const compareYearForYoY = compareYearParam === "none"
    ? null
    : compareYearParam !== null && Number.isFinite(Number(compareYearParam))
      ? Number(compareYearParam)
      : yearForYoY - 1;

  // Per il YoY caricho TUTTI i preventivi dell'anno corrente e dell'anno
  // precedente (ignoro il range filter perche' YoY ha un filtro separato).
  const yoyFrom = new Date(Math.min(yearForYoY, compareYearForYoY ?? yearForYoY), 0, 1, 0, 0, 0);
  const yoyTo = new Date(yearForYoY + 1, 0, 1, 0, 0, 0);
  const yoyWhereCommon: Prisma.QuoteWhereInput = isAdmin ? {} : { userId };
  const yoyWhere: Prisma.QuoteWhereInput = {
    ...yoyWhereCommon,
    OR: [
      { createdAt: { gte: yoyFrom, lt: yoyTo } },
      { wonAt: { gte: yoyFrom, lt: yoyTo } },
      { sentAt: { gte: yoyFrom, lt: yoyTo } },
    ],
  };
  const yoyRows = await prisma.quote.findMany({
    where: yoyWhere,
    select: {
      id: true,
      totalAnnual: true,
      salesStage: true,
      status: true,
      createdAt: true,
      sentAt: true,
      wonAt: true,
    },
    take: 5000,
  });
  type YoyRow = (typeof yoyRows)[number];

  function emptyMonthlySeries(): MonthlyPoint[] {
    const labels = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
    return labels.map((l, i) => ({
      month: i + 1,
      label: l,
      acquired: 0,
      wonCount: 0,
      newCount: 0,
      sentCount: 0,
    }));
  }

  function buildMonthlyForYear(rows: YoyRow[], year: number): MonthlyPoint[] {
    const series = emptyMonthlySeries();
    for (const r of rows) {
      const cAt = r.createdAt;
      if (cAt && cAt.getFullYear() === year) {
        series[cAt.getMonth()].newCount++;
      }
      if (r.sentAt && r.sentAt.getFullYear() === year) {
        series[r.sentAt.getMonth()].sentCount++;
      }
      if (r.wonAt && r.wonAt.getFullYear() === year) {
        const idx = r.wonAt.getMonth();
        series[idx].wonCount++;
        series[idx].acquired += r.totalAnnual || 0;
      }
    }
    return series;
  }

  const monthly = buildMonthlyForYear(yoyRows, yearForYoY);
  const monthlyPrev = compareYearForYoY != null
    ? buildMonthlyForYear(yoyRows, compareYearForYoY)
    : [];

  const todayMd = (() => {
    const d = new Date();
    return { m: d.getMonth(), d: d.getDate() };
  })();
  function ytdSum(series: MonthlyPoint[], rows: YoyRow[], year: number, key: "acquired" | "wonCount"): number {
    // Sommatoria dei mesi 0..todayMd.m, e per il mese corrente solo i wonAt fino a today.
    let total = 0;
    for (let m = 0; m < todayMd.m; m++) {
      total += series[m][key];
    }
    // mese corrente: filtro per giorno <= todayMd.d
    for (const r of rows) {
      if (!r.wonAt) continue;
      if (r.wonAt.getFullYear() !== year) continue;
      if (r.wonAt.getMonth() !== todayMd.m) continue;
      if (r.wonAt.getDate() > todayMd.d) continue;
      total += key === "acquired" ? (r.totalAnnual || 0) : 1;
    }
    return total;
  }

  const acquiredYTD = ytdSum(monthly, yoyRows, yearForYoY, "acquired");
  const wonCountYTD = ytdSum(monthly, yoyRows, yearForYoY, "wonCount");
  const acquiredYTDPrev = compareYearForYoY != null
    ? ytdSum(monthlyPrev, yoyRows, compareYearForYoY, "acquired")
    : 0;
  const wonCountYTDPrev = compareYearForYoY != null
    ? ytdSum(monthlyPrev, yoyRows, compareYearForYoY, "wonCount")
    : 0;

  function deltaPct(curr: number, prev: number): number | null {
    if (prev === 0) return curr === 0 ? 0 : null; // null = nuovo, non confrontabile
    return ((curr - prev) / prev) * 100;
  }
  function safeRate(num: number, den: number): number {
    return den > 0 ? (num / den) * 100 : 0;
  }
  // Conversion rate: usiamo wonCount / newCount nello stesso periodo YTD invece
  // di wonCount / sentCount. Motivo: un preventivo puo' essere stato sent un
  // anno fa e wonAt quest'anno; se conto solo i sent dell'anno corrente posso
  // ottenere ratio >100% (anomalia visiva). La metrica commercialmente piu'
  // onesta e' "dei preventivi che ho aperto in questo periodo, quanti ho vinto?".
  function ytdNewCount(rows: YoyRow[], year: number): number {
    let n = 0;
    for (const r of rows) {
      if (!r.createdAt) continue;
      if (r.createdAt.getFullYear() !== year) continue;
      const m = r.createdAt.getMonth();
      const d = r.createdAt.getDate();
      if (m < todayMd.m) n++;
      else if (m === todayMd.m && d <= todayMd.d) n++;
    }
    return n;
  }
  const newCountYTD = ytdNewCount(yoyRows, yearForYoY);
  const newCountYTDPrev = compareYearForYoY != null ? ytdNewCount(yoyRows, compareYearForYoY) : 0;

  // Pipeline open value: somma di totalAnnual su tutti i preventivi salesStage='open' attivi adesso
  const pipelineOpenAggr = await prisma.quote.aggregate({
    where: { ...yoyWhereCommon, salesStage: "open" },
    _sum: { totalAnnual: true },
  });
  const pipelineOpenValue = pipelineOpenAggr._sum.totalAnnual || 0;

  const yoy: AnalyticsYoYView = {
    year: yearForYoY,
    compareYear: compareYearForYoY,
    kpi: {
      acquired: acquiredYTD,
      acquiredPrev: acquiredYTDPrev,
      acquiredDeltaPct: deltaPct(acquiredYTD, acquiredYTDPrev),
      wonCount: wonCountYTD,
      wonCountPrev: wonCountYTDPrev,
      conversionRate: safeRate(wonCountYTD, newCountYTD),
      conversionRatePrev: safeRate(wonCountYTDPrev, newCountYTDPrev),
      pipelineOpenValue,
    },
    monthly,
    monthlyPrev,
  };

  // Pipeline per fase (intero spazio admin/utente, niente filtro temporale: e' "stato attuale").
  const allQuotesForPipeline = await prisma.quote.findMany({
    where: yoyWhereCommon,
    select: { id: true, status: true, salesStage: true, totalAnnual: true },
    take: 5000,
  });

  function classifyStage(q: { status: string; salesStage: string }): AnalyticsPipelineByStage["stage"] {
    if (q.salesStage === "won") return "won";
    if (q.salesStage === "lost") return "lost";
    if (q.status === "draft" || q.status === "pending") return "draft";
    if (q.status === "sent" || q.status === "viewed") {
      // sent/viewed con salesStage open = "in trattativa"
      return q.salesStage === "open" ? "in_trattativa" : "sent";
    }
    return "draft";
  }
  const stageMap: Record<string, { count: number; value: number }> = {
    draft: { count: 0, value: 0 },
    sent: { count: 0, value: 0 },
    in_trattativa: { count: 0, value: 0 },
    won: { count: 0, value: 0 },
    lost: { count: 0, value: 0 },
  };
  for (const q of allQuotesForPipeline) {
    const s = classifyStage(q);
    stageMap[s].count++;
    stageMap[s].value += q.totalAnnual || 0;
  }
  const stageLabels: Record<AnalyticsPipelineByStage["stage"], string> = {
    draft: "Bozze",
    sent: "Inviati",
    in_trattativa: "In trattativa",
    won: "Acquisiti",
    lost: "Persi",
  };
  const pipelineByStage: AnalyticsPipelineByStage[] = (
    ["draft", "sent", "in_trattativa", "won", "lost"] as const
  ).map((s) => ({
    stage: s,
    label: stageLabels[s],
    count: stageMap[s].count,
    value: stageMap[s].value,
  }));

  // Funnel: bozze totali (incluse quelle poi inviate) -> inviati -> vinti.
  // Conta i preventivi unici, raggruppando per "ha mai raggiunto questo step".
  const funnelTotals = (() => {
    const drafts = allQuotesForPipeline.length; // ogni preventivo ha sempre toccato "draft"
    const sent = allQuotesForPipeline.filter((q) => q.status === "sent" || q.status === "viewed" || q.salesStage === "won" || q.salesStage === "lost").length;
    const won = allQuotesForPipeline.filter((q) => q.salesStage === "won").length;
    return { drafts, sent, won };
  })();
  const funnel: AnalyticsFunnelStep[] = [
    { stage: "drafts", label: "Bozze create", count: funnelTotals.drafts, conversionFromPrev: null },
    {
      stage: "sent",
      label: "Inviate al cliente",
      count: funnelTotals.sent,
      conversionFromPrev: funnelTotals.drafts > 0 ? (funnelTotals.sent / funnelTotals.drafts) * 100 : 0,
    },
    {
      stage: "won",
      label: "Acquisite",
      count: funnelTotals.won,
      conversionFromPrev: funnelTotals.sent > 0 ? (funnelTotals.won / funnelTotals.sent) * 100 : 0,
    },
  ];

  // Cashflow previsionale 12 mesi: somma dei pagamenti programmati (dueDate
  // futuro, non paidAt) sui preventivi acquisiti, raggruppati per mese.
  const today = new Date();
  const cashStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const cashEnd = new Date(today.getFullYear() + 1, today.getMonth(), 1);
  const futurePayments = await prisma.quotePayment.findMany({
    where: {
      paidAt: null,
      dueDate: { gte: cashStart, lt: cashEnd },
      quote: yoyWhereCommon,
    },
    select: { amount: true, dueDate: true },
  });
  const cashByMonth = new Map<string, number>();
  for (const p of futurePayments) {
    if (!p.dueDate) continue;
    const k = `${p.dueDate.getFullYear()}-${p.dueDate.getMonth()}`;
    cashByMonth.set(k, (cashByMonth.get(k) || 0) + (p.amount || 0));
  }
  const cashflow12m: CashflowPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(cashStart.getFullYear(), cashStart.getMonth() + i, 1);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    cashflow12m.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" }),
      expected: cashByMonth.get(k) || 0,
    });
  }

  // Win/Loss per origine cliente. Aggrega tutti i preventivi (usiamo
  // allQuotesForPipeline ma servono anche originCliente e wonAt valori).
  const allQuotesForOrigin = await prisma.quote.findMany({
    where: yoyWhereCommon,
    select: {
      originCliente: true,
      salesStage: true,
      status: true,
      totalAnnual: true,
    },
    take: 5000,
  });

  function normalizeOrigin(s: string | null | undefined): string {
    const t = (s || "").trim();
    if (!t) return "Non indicato";
    // Capitalize prima lettera, lower il resto
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  const originMap = new Map<string, AnalyticsByOrigin>();
  for (const q of allQuotesForOrigin) {
    const key = normalizeOrigin(q.originCliente);
    if (!originMap.has(key)) {
      originMap.set(key, {
        origin: key,
        total: 0,
        won: 0,
        lost: 0,
        open: 0,
        winRate: null,
        acquiredValue: 0,
      });
    }
    const row = originMap.get(key)!;
    row.total++;
    if (q.salesStage === "won") {
      row.won++;
      row.acquiredValue += q.totalAnnual || 0;
    } else if (q.salesStage === "lost") {
      row.lost++;
    } else {
      row.open++;
    }
  }
  for (const row of originMap.values()) {
    const decided = row.won + row.lost;
    row.winRate = decided > 0 ? (row.won / decided) * 100 : null;
  }
  const byOrigin: AnalyticsByOrigin[] = Array.from(originMap.values()).sort(
    (a, b) => b.acquiredValue - a.acquiredValue
  );

  const body: AnalyticsResponse = {
    rangeDays,
    from: from.toISOString(),
    summary,
    pipeline,
    pipelineByStage,
    funnel,
    cashflow12m,
    byOrigin,
    yoy,
    quotes: quotesJson,
    payments: flatPayments,
    cash,
    acquiredCumulative,
  };

  return NextResponse.json(body);
}
