// Schemi Zod per la validazione del payload sulle route /api/quotes/*.
//
// Usato dalle route POST/PATCH per parsare il body in entrata invece di fare
// destructuring + Number(...) sparsi. In caso di payload sbagliato (campi
// mancanti, tipi errati) rispondiamo 400 con un errore in italiano leggibile,
// invece di lasciare che Prisma/Next esplodano in 500 generici.
//
// Software a uso interno: lo scopo principale qui non e' difendersi da
// attaccanti esterni ma evitare bug accidentali del frontend (es. un campo
// che arriva come stringa quando il backend si aspetta un numero, regressioni
// silenziose dopo un refactor) e dare al developer messaggi chiari.

import { z } from "zod";

/** Riga voce preventivo: solo i campi che il backend si aspetta dal client. */
const QuoteItemPayloadSchema = z.object({
  productCode: z.string().min(1).max(120),
  productName: z.string().min(1).max(300).optional(),
  price: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1).optional(),
  isMonthly: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

/** Email (nullable) o stringa vuota normalizzata a null. */
const NullableEmail = z
  .string()
  .trim()
  .email("Email cliente non valida")
  .nullable()
  .or(z.literal("").transform(() => null));

/** Stringa nullable con limite max sui field "client*". */
const SmallString = z.string().trim().max(300).nullable().optional();

/** Schema base condiviso fra create e PATCH (la PATCH lo rende parziale). */
const BaseQuoteFieldsSchema = z.object({
  // Cliente
  clientName: z.string().trim().min(1, "Nome cliente obbligatorio").max(300),
  clientCompany: SmallString,
  clientEmail: NullableEmail.optional(),
  clientPhone: SmallString,
  clientNotes: SmallString,
  clientAddress: SmallString,
  clientPostalCode: SmallString,
  clientCity: SmallString,
  clientProvince: SmallString,
  clientVat: SmallString,
  clientSdi: SmallString,
  crmCustomerId: z.string().nullable().optional(),

  // Diagnosi & ROI
  originCliente: SmallString,
  estrattoDiagnosi: SmallString,
  diagnosiGiaPagata: z.boolean().optional(),
  voucherAuditApplied: z.boolean().optional(),
  roiPreventiviMese: z.number().nullable().optional(),
  roiImportoMedio: z.number().nullable().optional(),
  roiConversioneAttuale: z.number().nullable().optional(),
  roiMargineCommessa: z.number().nullable().optional(),
  roiSnapshot: z.string().nullable().optional(),

  // Voci listino
  items: z.array(QuoteItemPayloadSchema).min(1, "Seleziona almeno una voce"),
  dceProductId: z.string().nullable().optional(),

  // Totali (ricalcolati lato server, ma il client invia il suo snapshot)
  totalOneTime: z.number().int().min(0).default(0),
  totalMonthly: z.number().int().min(0).default(0),
  totalAnnual: z.number().int().min(0).default(0),
  setupBeforeDiscount: z.number().int().min(0).default(0),

  // Sconti e voucher
  discountType: z.enum(["manual"]).nullable().optional(),
  discountAmount: z.number().int().min(0).default(0),
  discountCode: z.string().nullable().optional(),
  discountPercent: z.number().int().min(0).max(100).default(0),
  scontoCrmAnnuale: z.boolean().optional(),
  scontoAiVocaleAnnuale: z.boolean().optional(),
  scontoWaAnnuale: z.boolean().optional(),

  // Credito MC (leva commerciale on/off)
  creditoMcEnabled: z.boolean().optional(),

  // Note interne ed expiry
  notes: z.string().nullable().optional(),
  expiresAt: z.string().datetime().or(z.date()).nullable().optional(),
});

export const CreateQuoteSchema = BaseQuoteFieldsSchema;
export type CreateQuotePayload = z.infer<typeof CreateQuoteSchema>;

/** PATCH /api/quotes/[id]: tutti i campi opzionali (update parziale). */
export const PatchQuoteSchema = BaseQuoteFieldsSchema.partial();
export type PatchQuotePayload = z.infer<typeof PatchQuoteSchema>;

/** POST /api/quotes/duplicate: solo l'id da duplicare. */
export const DuplicateQuoteSchema = z.object({
  quoteId: z.string().min(1, "quoteId mancante"),
});

/** POST /api/quotes/send: idem. */
export const SendQuoteSchema = z.object({
  quoteId: z.string().min(1, "quoteId mancante"),
});

/**
 * Helper: parsa un payload e in caso di errore Zod ritorna un Response 400 con
 * messaggio italiano leggibile invece del 500 di default. Da usare nei route
 * handlers come early return.
 */
export function badRequestFromZod(error: z.ZodError): {
  error: string;
  details: Array<{ path: string; message: string }>;
} {
  return {
    error: "Dati non validi nel payload.",
    details: error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}
