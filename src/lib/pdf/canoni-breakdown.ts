// Sorgente unica per il breakdown dei canoni mensili in fase di rendering PDF.
// Prima questa logica era duplicata pari pari in due posti distinti del template
// (sezione 07 Riepilogo economico e sezione 09 Modalità di pagamento), con tutto
// il rischio che la modifica fatta in un punto e dimenticata nell'altro creasse
// numeri divergenti sullo stesso PDF. Estratta qui, una volta sola.

import { prepayFromMonthly, type PrepayBreakdown } from "@/lib/pricing/engine";

export type QuoteForCanoni = {
  items: Array<{
    productCode: string;
    isMonthly: boolean;
    price: number;
    quantity?: number;
  }>;
  totalMonthly: number;
  scontoCrmAnnuale: boolean;
  scontoAiVocaleAnnuale: boolean;
  scontoWaAnnuale: boolean;
};

export type CanoniBreakdown = {
  /** Lordo mensile per categoria, sommando tutte le voci con productCode che inizia con il prefix giusto. */
  crmMonthlyFromItems: number;
  aiMonthlyFromItems: number;
  waMonthlyFromItems: number;
  dceMonthlyFromItems: number;

  /** Prepay annuale per categoria. null se la categoria non ha sconto annuale attivo o monthly = 0. */
  crmPrepay: PrepayBreakdown | null;
  aiPrepay: PrepayBreakdown | null;
  waPrepay: PrepayBreakdown | null;

  /**
   * Somma dei netOneTime dei tre prepay attivi.
   * Quanto il cliente versa alla firma per i canoni anticipati annuali.
   */
  canoniAnticipatiAllaFirma: number;

  /**
   * Quanto della categoria pesa "mese per mese" nel riepilogo:
   * 0 se il canone è in prepay annuale (mostrato nel blocco anticipato),
   * il valore mensile completo altrimenti.
   * I DCE non hanno mai prepay e finiscono sempre tra i mensili.
   */
  crmMonthlyMostrato: number;
  aiMonthlyMostrato: number;
  waMonthlyMostrato: number;

  /**
   * "Altri canoni" residui: differenza fra il totalMonthly salvato (= monthlyAfterPrepay
   * dal pricing engine) e i singoli mensili mostrati per categoria + DCE. Servono se in
   * futuro nasce una nuova categoria di canone non ancora classificata qui.
   */
  altriMonthlyMostrato: number;

  /** Somma di canoniMensiliRicorrenti = quote.totalMonthly clampato a zero. */
  canoniMensiliRicorrenti: number;
};

function sumLordoCanoneByPrefix(
  items: QuoteForCanoni["items"],
  prefix: string
): number {
  let total = 0;
  for (const i of items) {
    if (!i.isMonthly) continue;
    if (typeof i.productCode !== "string") continue;
    if (!i.productCode.startsWith(prefix)) continue;
    total += i.price * (i.quantity ?? 1);
  }
  return total;
}

export function computeCanoniBreakdown(quote: QuoteForCanoni): CanoniBreakdown {
  const crmMonthlyFromItems = sumLordoCanoneByPrefix(quote.items, "CANONE_CRM");
  const aiMonthlyFromItems = sumLordoCanoneByPrefix(quote.items, "CANONE_AI");
  const waMonthlyFromItems = sumLordoCanoneByPrefix(quote.items, "CANONE_WA");
  const dceMonthlyFromItems = sumLordoCanoneByPrefix(quote.items, "DCE");

  const crmPrepay =
    quote.scontoCrmAnnuale && crmMonthlyFromItems > 0
      ? prepayFromMonthly(crmMonthlyFromItems, "CRM")
      : null;
  const aiPrepay =
    quote.scontoAiVocaleAnnuale && aiMonthlyFromItems > 0
      ? prepayFromMonthly(aiMonthlyFromItems, "AIVOCALE")
      : null;
  const waPrepay =
    quote.scontoWaAnnuale && waMonthlyFromItems > 0
      ? prepayFromMonthly(waMonthlyFromItems, "WA")
      : null;

  const canoniAnticipatiAllaFirma =
    (crmPrepay?.netOneTime ?? 0) +
    (aiPrepay?.netOneTime ?? 0) +
    (waPrepay?.netOneTime ?? 0);

  const crmMonthlyMostrato = quote.scontoCrmAnnuale ? 0 : crmMonthlyFromItems;
  const aiMonthlyMostrato = quote.scontoAiVocaleAnnuale ? 0 : aiMonthlyFromItems;
  const waMonthlyMostrato = quote.scontoWaAnnuale ? 0 : waMonthlyFromItems;

  const canoniMensiliRicorrenti =
    typeof quote.totalMonthly === "number" ? Math.max(0, quote.totalMonthly) : 0;

  const altriMonthlyMostrato = Math.max(
    0,
    canoniMensiliRicorrenti -
      crmMonthlyMostrato -
      aiMonthlyMostrato -
      waMonthlyMostrato -
      dceMonthlyFromItems
  );

  return {
    crmMonthlyFromItems,
    aiMonthlyFromItems,
    waMonthlyFromItems,
    dceMonthlyFromItems,
    crmPrepay,
    aiPrepay,
    waPrepay,
    canoniAnticipatiAllaFirma,
    crmMonthlyMostrato,
    aiMonthlyMostrato,
    waMonthlyMostrato,
    altriMonthlyMostrato,
    canoniMensiliRicorrenti,
  };
}
