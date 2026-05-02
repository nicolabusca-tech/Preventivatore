/**
 * Forme JSON dei preventivi al confine API ↔ client (dopo fetch + JSON.parse).
 * Le date sono stringhe ISO, non oggetti Date.
 */

export type QuoteEditorItemRow = {
  productCode: string;
  quantity: number;
  price: number;
  isMonthly: boolean;
  productName: string;
};

/** Payload iniziale per `QuoteEditor` (bozza / modifica da listino). */
export type QuoteEditorInitialData = {
  id: string;
  status: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  crmCustomerId: string | null;
  clientAddress: string | null;
  clientPostalCode: string | null;
  clientCity: string | null;
  clientProvince: string | null;
  clientVat: string | null;
  clientSdi: string | null;
  originCliente: string | null;
  estrattoDiagnosi: string | null;
  diagnosiGiaPagata: boolean;
  roiPreventiviMese: number | null;
  roiImportoMedio: number | null;
  roiConversioneAttuale: number | null;
  roiMargineCommessa: number | null;
  roiSnapshot: string | null;
  notes: string | null;
  expiresAt: string | null;
  voucherAuditApplied: boolean;
  /** STANDARD | MANUAL — se MANUAL, niente PDF da editor listino. */
  kind?: string;
  scontoCrmAnnuale: boolean;
  scontoAiVocaleAnnuale: boolean;
  scontoWaAnnuale: boolean;
  discountType: string | null;
  discountAmount: number;
  discountCode: string | null;
  discountPercent: number;
  items: QuoteEditorItemRow[];
};

export type QuoteDetailItem = {
  id: string;
  productCode: string;
  productName: string;
  price: number;
  quantity: number;
  isMonthly: boolean;
};

/** Risposta tipica di GET /api/quotes/[id] (campi usati dalla pagina dettaglio). */
export type QuoteDetail = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  clientAddress: string | null;
  clientPostalCode: string | null;
  clientCity: string | null;
  clientProvince: string | null;
  clientVat: string | null;
  clientSdi: string | null;
  crmCustomerId: string | null;
  originCliente: string | null;
  estrattoDiagnosi: string | null;
  diagnosiGiaPagata: boolean;
  roiPreventiviMese: number | null;
  roiImportoMedio: number | null;
  roiConversioneAttuale: number | null;
  roiMargineCommessa: number | null;
  roiSnapshot: string | null;
  notes: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  costSetup: number;
  costMonthly: number;
  costAnnual: number;
  marginAnnual: number;
  marginPercentAnnual: number;
  kind: string;
  salesStage: string;
  deliveryStage: string;
  wonAt: string | null;
  kickoffAt: string | null;
  closedAt: string | null;
  setupBeforeDiscount: number;
  discountType: string | null;
  discountAmount: number;
  discountCode: string | null;
  discountPercent: number;
  scontoCrmAnnuale: boolean;
  scontoAiVocaleAnnuale: boolean;
  scontoWaAnnuale: boolean;
  voucherAuditApplied: boolean;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
  items: QuoteDetailItem[];
};

/** Righe di GET /api/quotes come usate dalla pagina elenco. */
export type QuoteListItem = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientCompany: string | null;
  totalSetup: number;
  totalMonthly: number;
  totalAnnual: number;
  costAnnual: number;
  marginAnnual: number;
  marginPercentAnnual: number;
  /** STANDARD | MANUAL — da Prisma; assente in risposte molto vecchie. */
  kind?: string;
  status: string;
  salesStage: string;
  deliveryStage: string;
  wonAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { name: string };
  items: { id: string }[];
};
