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
  totalOneTime: number;
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

/** Punto di una serie mensile (12 mesi: gen..dic) per anno. */
export type MonthlyPoint = {
  /** 1..12 */
  month: number;
  label: string;
  /** Acquisito per quel mese (totalAnnual del preventivo, attribuito al wonAt). */
  acquired: number;
  /** Numero preventivi vinti in quel mese. */
  wonCount: number;
  /** Nuovi preventivi creati in quel mese (createdAt). */
  newCount: number;
  /** Preventivi inviati in quel mese (sentAt). */
  sentCount: number;
};

/** Aggregato per fase (pipeline). */
export type AnalyticsPipelineByStage = {
  stage: "draft" | "sent" | "in_trattativa" | "won" | "lost";
  label: string;
  count: number;
  value: number;
};

/** Funnel di conversione: passi sequenziali con count + percentuale. */
export type AnalyticsFunnelStep = {
  stage: "drafts" | "sent" | "won";
  label: string;
  count: number;
  /** Percentuale rispetto allo stage precedente (0..100). null per il primo. */
  conversionFromPrev: number | null;
};

/** Punto della curva cashflow previsionale per i prossimi N mesi. */
export type CashflowPoint = {
  month: number;
  year: number;
  label: string;
  /** Incassi gia' programmati (rate firmate non scadute, canoni mensili attivi su preventivi won). */
  expected: number;
};

/** Aggregato Win/Loss per origine cliente (passaparola, ads, partner, ecc.). */
export type AnalyticsByOrigin = {
  /** Etichetta normalizzata della origine ('Passaparola', 'Ads', 'Partner', etc). */
  origin: string;
  /** Numero totale preventivi creati con questa origine nel range. */
  total: number;
  /** Quanti vinti. */
  won: number;
  /** Quanti persi. */
  lost: number;
  /** Quanti ancora aperti. */
  open: number;
  /** Win rate = won / (won+lost) * 100. Null se nessuna chiusura ancora. */
  winRate: number | null;
  /** Valore acquisito totale (somma totalAnnual dei vinti). */
  acquiredValue: number;
};

/** Vista YoY: anno corrente, anno di confronto, delta. */
export type AnalyticsYoYView = {
  /** Anno fiscale di riferimento (es. 2026). */
  year: number;
  /** Anno di confronto (es. 2025) o null se confronto disattivato. */
  compareYear: number | null;
  kpi: {
    /** Acquisito YTD anno corrente. */
    acquired: number;
    /** Acquisito YTD anno precedente, fino allo stesso giorno-mese. */
    acquiredPrev: number;
    /** Delta percentuale (-100..+inf). */
    acquiredDeltaPct: number | null;
    /** Numero preventivi vinti YTD anno corrente. */
    wonCount: number;
    wonCountPrev: number;
    /** Conversion rate YTD anno corrente (won / sent). */
    conversionRate: number;
    conversionRatePrev: number;
    /** Pipeline aperta = somma totalAnnual dei preventivi salesStage="open" alla data odierna. */
    pipelineOpenValue: number;
  };
  /** Serie mensile anno corrente (12 punti). */
  monthly: MonthlyPoint[];
  /** Serie mensile anno di confronto (12 punti) o array vuoto se compareYear null. */
  monthlyPrev: MonthlyPoint[];
};

export type AnalyticsResponse = {
  rangeDays: number;
  from: string;
  summary: AnalyticsSummary;
  pipeline: AnalyticsPipeline;
  /** Pipeline disaggregata per fase (nuovo formato per il widget Pipeline a barre). */
  pipelineByStage?: AnalyticsPipelineByStage[];
  /** Funnel di conversione bozza -> inviato -> acquisito. */
  funnel?: AnalyticsFunnelStep[];
  /** Cashflow previsionale prossimi 12 mesi (incassi gia' garantiti). */
  cashflow12m?: CashflowPoint[];
  /** Win/Loss per origine cliente: dove fanno meglio i preventivi e dove si perdono. */
  byOrigin?: AnalyticsByOrigin[];
  /** Vista anno-su-anno con KPI e serie mensili. */
  yoy?: AnalyticsYoYView;
  quotes: AnalyticsQuote[];
  payments: AnalyticsPaymentRow[];
  cash: { paid: number; outstanding: number };
  acquiredCumulative: AcquiredCumulativePoint[];
};
