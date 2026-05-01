/**
 * JSON per QuotePayment / QuoteAdjustment (date = stringhe ISO).
 */

export type QuotePaymentJson = {
  id: string;
  quoteId: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  notes: string | null;
  kind: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteAdjustmentJson = {
  id: string;
  quoteId: string;
  label: string;
  kind: string;
  amount: number;
  frequency: string;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratePlanResponseJson = {
  payments: QuotePaymentJson[];
  plannedCount: number;
  scope: "all" | "monthly";
};
