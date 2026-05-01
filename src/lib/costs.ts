export type QuoteCostContext = {
  scontoCrmAnnuale?: boolean;
  scontoAiVocaleAnnuale?: boolean;
  scontoWaAnnuale?: boolean;
};

export type QuoteItemLike = {
  id: string;
  productCode: string;
  quantity: number;
  isMonthly: boolean;
};

export type ProductCostLike = {
  id: string;
  name: string;
  unitCostCents: number;
  unit: string; // ONE_TIME | MONTH | YEAR | OTHER
  multiplierKind: string; // FIXED | PER_QUOTE_ITEM | PER_MONTHS | CUSTOM_JSON
  multiplierValue: number | null;
  conditionsJson: string | null;
  active: boolean;
};

export type ComputedQuoteCosts = {
  costSetup: number;
  costMonthly: number;
  costAnnual: number;
  marginAnnual: number;
  marginPercentAnnual: number;
  itemCosts: Array<{
    quoteItemId: string;
    productCostId: string | null;
    name: string;
    unitCostCents: number;
    unit: string;
    multiplier: number;
    lineCostCents: number;
  }>;
};

function safeParseJson(value: string | null): any | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function prepayDiscountPercentFromConditions(
  ctx: QuoteCostContext,
  conditionsJson: string | null
): number {
  const parsed = safeParseJson(conditionsJson);
  if (!parsed || typeof parsed !== "object") return 0;

  const cat = parsed?.applyPrepayDiscountCategory;
  if (cat === "CRM" && ctx.scontoCrmAnnuale) return 20;
  if (cat === "AIVOCALE" && ctx.scontoAiVocaleAnnuale) return 15;
  if (cat === "WA" && ctx.scontoWaAnnuale) return 15;

  const pctOverride = parsed?.applyPrepayDiscountPercentOverride;
  if (typeof pctOverride === "number" && Number.isFinite(pctOverride) && pctOverride > 0) {
    return Math.min(100, Math.max(0, pctOverride));
  }

  return 0;
}

function conditionsMatch(ctx: QuoteCostContext, conditionsJson: string | null): boolean {
  const parsed = safeParseJson(conditionsJson);
  if (!parsed) return true;
  const onlyIf = parsed?.onlyIf;
  if (onlyIf && typeof onlyIf === "object") {
    for (const [k, v] of Object.entries(onlyIf as Record<string, unknown>)) {
      if (typeof v === "boolean") {
        if (Boolean((ctx as any)[k]) !== v) return false;
      }
    }
  }
  return true;
}

function computeMultiplier(cost: ProductCostLike, item: QuoteItemLike): number {
  const kind = (cost.multiplierKind || "FIXED").toUpperCase();
  if (kind === "PER_QUOTE_ITEM") return Math.max(0, Number(item.quantity || 0)) || 0;
  if (kind === "PER_MONTHS") {
    const v = cost.multiplierValue != null ? Number(cost.multiplierValue) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  if (kind === "FIXED") {
    const v = cost.multiplierValue != null ? Number(cost.multiplierValue) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  // CUSTOM_JSON not supported in MVP: fallback to 1
  return 1;
}

function addAnnualContribution(unit: string, lineCostCents: number) {
  const u = (unit || "").toUpperCase();
  if (u === "MONTH") {
    return { setup: 0, monthly: lineCostCents, annual: lineCostCents * 12 };
  }
  if (u === "YEAR") {
    return { setup: lineCostCents, monthly: 0, annual: lineCostCents };
  }
  // default ONE_TIME / OTHER => treat as one-time
  return { setup: lineCostCents, monthly: 0, annual: lineCostCents };
}

export function computeQuoteCosts(opts: {
  ctx: QuoteCostContext;
  revenueAnnual: number;
  items: QuoteItemLike[];
  costsByProductCode: Map<string, ProductCostLike[]>;
}): ComputedQuoteCosts {
  let costSetup = 0;
  let costMonthly = 0;
  let costAnnual = 0;
  const itemCosts: ComputedQuoteCosts["itemCosts"] = [];

  for (const item of opts.items) {
    const costs = opts.costsByProductCode.get(item.productCode) || [];
    for (const c of costs) {
      if (!c.active) continue;
      if (!conditionsMatch(opts.ctx, c.conditionsJson)) continue;
      const multiplier = computeMultiplier(c, item);
      const pct = prepayDiscountPercentFromConditions(opts.ctx, c.conditionsJson);
      const unitCostBase = Number(c.unitCostCents || 0);
      const unitCostEffective =
        pct > 0 ? Math.round(unitCostBase * (1 - pct / 100)) : unitCostBase;
      const lineCostCents = Math.round(unitCostEffective * multiplier);
      const contrib = addAnnualContribution(c.unit, lineCostCents);
      costSetup += contrib.setup;
      costMonthly += contrib.monthly;
      costAnnual += contrib.annual;
      itemCosts.push({
        quoteItemId: item.id,
        productCostId: c.id || null,
        name: c.name,
        unitCostCents: unitCostEffective,
        unit: c.unit,
        multiplier,
        lineCostCents,
      });
    }
  }

  const marginAnnual = Math.round(Number(opts.revenueAnnual || 0) - costAnnual);
  const marginPercentAnnual =
    opts.revenueAnnual > 0 ? Math.max(0, Math.min(100, (marginAnnual / opts.revenueAnnual) * 100)) : 0;

  return {
    costSetup,
    costMonthly,
    costAnnual,
    marginAnnual,
    marginPercentAnnual,
    itemCosts,
  };
}

