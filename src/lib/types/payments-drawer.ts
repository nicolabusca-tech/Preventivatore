/** Props tipizzate per `PaymentsDrawer` (pagamenti e contesto preventivo). */

export type DrawerPayment = {
  id: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  kind: string | null;
};

export type DrawerQuote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  wonAt: string | null;
  deliveryExpectedAt: string | null;
  depositPercent: number;
};
