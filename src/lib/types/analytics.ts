/**
 * Forma JSON di GET /api/analytics (date come stringhe ISO).
 */
import type { DrawerPayment } from "@/lib/types/payments-drawer";

/** Riga preventivo nel payload analytics (Prisma + campi arricchiti dall'API). */
export type AnalyticsQuote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  createdAt: string;
  user: { name: string };
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  costAnnual: number;
  effectiveRevenueAnnual: number;
  effectiveCostAnnual: number;
  effectiveMarginAnnual?: number;
  effectiveMarginPercentAnnual?: number;
  adjustmentsAnnualRevenue?: number;
  adjustmentsAnnualCost?: number;
  salesStage: string;
  deliveryStage: string;
  wonAt: string | null;
  deliveryExpectedAt: string | null;
  depositPercent?: number;
};

/** Pagamento flat con riferimento al preventivo (da `payments` nella risposta). */
export type AnalyticsPaymentRow = DrawerPayment & {
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  userName: string;
  method?: string | null;
};

export type AcquiredCumulativePoint = {
  month: string;
  label: string;
  monthValue: number;
  cumulative: number;
};

export type AnalyticsSummary = {
  count: number;
  wonCount: number;
  lostCount: number;
  revenueAnnual: number;
  costAnnual: number;
  marginAnnual: number;
};

export type AnalyticsPipeline = {
  open: number;
  won: number;
  lost: number;
  not_started: number;
  in_progress: number;
  done: number;
};

export type AnalyticsResponse = {
  rangeDays: number;
  from: string;
  summary: AnalyticsSummary;
  pipeline: AnalyticsPipeline;
  quotes: AnalyticsQuote[];
  payments: AnalyticsPaymentRow[];
  cash: { paid: number; outstanding: number };
  acquiredCumulative?: AcquiredCumulativePoint[];
};
