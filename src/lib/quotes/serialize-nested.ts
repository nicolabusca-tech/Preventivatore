import type { QuoteAdjustment, QuotePayment } from "@prisma/client";
import type { QuoteAdjustmentJson, QuotePaymentJson } from "@/lib/types/quote-nested";

export function toQuotePaymentJson(p: QuotePayment): QuotePaymentJson {
  return {
    id: p.id,
    quoteId: p.quoteId,
    amount: p.amount,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    method: p.method,
    notes: p.notes,
    kind: p.kind,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toQuoteAdjustmentJson(a: QuoteAdjustment): QuoteAdjustmentJson {
  return {
    id: a.id,
    quoteId: a.quoteId,
    label: a.label,
    kind: a.kind,
    amount: a.amount,
    frequency: a.frequency,
    startsAt: a.startsAt ? a.startsAt.toISOString() : null,
    endsAt: a.endsAt ? a.endsAt.toISOString() : null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
