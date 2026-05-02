// Crea un preventivo "manuale": fuori dal listino standard, con voci libere
// (descrizione + importo + canone/una-tantum + costo opzionale).
// Vive insieme agli altri preventivi:
//  - stessa numerazione Q{anno}-{progressivo}
//  - appare in "I miei preventivi" e in Analisi
//  - la fase pipeline è gestita come per i preventivi standard
//  - identificato esplicitamente da `Quote.kind = "MANUAL"` (i suoi items
//    hanno tutti `QuoteItem.isCustom = true`).
//
// Niente PDF/email: status iniziale = "sent" (registrato come "consegnato a mano"),
// non passa dal flusso /api/quotes/send.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";
import { loadQuoteDetailById } from "@/lib/quotes/serialize-quote-detail";

// I productCode interni delle righe manuali continuano a usare il prefix
// "MANUAL_" per mantenere unicità a livello di item all'interno del preventivo.
// La detection a livello di preventivo/voce non si basa più su questo prefix
// ma sui campi espliciti `Quote.kind` e `QuoteItem.isCustom`.
const MANUAL_PRODUCT_CODE_PREFIX = "MANUAL_";

type IncomingLine = {
  description?: unknown;
  amount?: unknown;
  isMonthly?: unknown;
  cost?: unknown;
};

type CleanLine = {
  description: string;
  amount: number; // euro interi
  isMonthly: boolean;
  cost: number; // euro interi (può essere 0)
};

function buildNextQuoteNumber(prev: string | null, year: number) {
  const prefix = `Q${year}-`;
  const prevNum = prev && prev.startsWith(prefix) ? Number(prev.slice(prefix.length)) : 0;
  const nextNum = Number.isFinite(prevNum) ? prevNum + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

function toEuroInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const clientName = typeof data.clientName === "string" ? data.clientName.trim() : "";
  if (!clientName) {
    return NextResponse.json({ error: "Il nome del cliente è obbligatorio." }, { status: 400 });
  }

  const incomingLines: IncomingLine[] = Array.isArray(data.lines) ? data.lines : [];
  const cleanedLines: CleanLine[] = incomingLines
    .map((l) => ({
      description: typeof l.description === "string" ? l.description.trim() : "",
      amount: toEuroInt(l.amount),
      isMonthly: !!l.isMonthly,
      cost: toEuroInt(l.cost),
    }))
    .filter((l) => l.description && l.amount > 0);

  if (cleanedLines.length === 0) {
    return NextResponse.json(
      { error: "Inserisci almeno una voce (descrizione + importo > 0)." },
      { status: 400 }
    );
  }

  const totalSetup = cleanedLines.filter((l) => !l.isMonthly).reduce((s, l) => s + l.amount, 0);
  const totalMonthly = cleanedLines.filter((l) => l.isMonthly).reduce((s, l) => s + l.amount, 0);
  const totalAnnual = totalSetup + totalMonthly * 12;

  const costSetup = cleanedLines.filter((l) => !l.isMonthly).reduce((s, l) => s + l.cost, 0);
  const costMonthly = cleanedLines.filter((l) => l.isMonthly).reduce((s, l) => s + l.cost, 0);
  const costAnnual = costSetup + costMonthly * 12;

  const marginAnnual = totalAnnual - costAnnual;
  const marginPercentAnnual = totalAnnual > 0 ? (marginAnnual / totalAnnual) * 100 : 0;

  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;

  const expiresAt = (() => {
    if (typeof data.expiresAt === "string" || data.expiresAt instanceof Date) {
      const d = new Date(data.expiresAt as string | Date);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback;
  })();

  // Ritento se due richieste tentano lo stesso quoteNumber (vincolo unique).
  let created: { id: string; quoteNumber: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const last = await prisma.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: "desc" },
        select: { quoteNumber: true },
      });
      const quoteNumber = buildNextQuoteNumber(last?.quoteNumber ?? null, year);

      created = await prisma.$transaction(async (tx) => {
        const createdQuote = await tx.quote.create({
          data: {
            quoteNumber,
            userId: session.user.id,
            // Marker esplicito di preventivo manuale (vedi schema.prisma).
            kind: "MANUAL",
            // Status "sent": il preventivo manuale è già consegnato fuori app.
            status: "sent",
            sentAt: new Date(),
            // Pipeline pulita: parte come "in trattativa".
            salesStage: "open",
            deliveryStage: "not_started",
            dceProductId: null,
            clientName,
            clientCompany: trimOrNull(data.clientCompany),
            clientEmail: trimOrNull(data.clientEmail),
            clientPhone: trimOrNull(data.clientPhone),
            clientNotes: trimOrNull(data.clientNotes),
            crmCustomerId: trimOrNull(data.crmCustomerId),
            clientAddress: trimOrNull(data.clientAddress),
            clientPostalCode: trimOrNull(data.clientPostalCode),
            clientCity: trimOrNull(data.clientCity),
            clientProvince: trimOrNull(data.clientProvince),
            clientVat: trimOrNull(data.clientVat),
            clientSdi: trimOrNull(data.clientSdi),
            originCliente: null,
            estrattoDiagnosi: null,
            diagnosiGiaPagata: false,
            voucherAuditApplied: false,
            scontoCrmAnnuale: false,
            scontoAiVocaleAnnuale: false,
            scontoWaAnnuale: false,
            // I preventivi manuali non usano il Credito MC (logica del listino).
            creditoMcEnabled: false,
            roiPreventiviMese: null,
            roiImportoMedio: null,
            roiConversioneAttuale: null,
            roiMargineCommessa: null,
            roiSnapshot: null,
            notes: trimOrNull(data.notes),
            expiresAt,
            totalSetup,
            totalMonthly,
            totalAnnual,
            setupBeforeDiscount: totalSetup,
            discountType: null,
            discountAmount: 0,
            discountCode: null,
            discountPercent: 0,
            costSetup,
            costMonthly,
            costAnnual,
            marginAnnual,
            marginPercentAnnual,
          },
          select: { id: true, quoteNumber: true },
        });

        // Crea le voci una per una così possiamo legare i costi all'id corretto
        // senza fare match euristici (descrizione+importo).
        for (let idx = 0; idx < cleanedLines.length; idx++) {
          const line = cleanedLines[idx];
          const item = await tx.quoteItem.create({
            data: {
              quoteId: createdQuote.id,
              productCode: `${MANUAL_PRODUCT_CODE_PREFIX}${idx + 1}`,
              productName: line.description,
              price: line.amount,
              quantity: 1,
              isMonthly: line.isMonthly,
              isCustom: true,
              notes: null,
            },
            select: { id: true },
          });

          if (line.cost > 0) {
            await tx.quoteItemCost.create({
              data: {
                quoteItemId: item.id,
                productCostId: null,
                name: "Costo voce manuale",
                unitCostCents: line.cost * 100,
                unit: line.isMonthly ? "MONTH" : "ONE_TIME",
                multiplier: 1,
                lineCostCents: line.cost * 100,
              },
            });
          }
        }

        return createdQuote;
      });

      break;
    } catch (e: any) {
      if (e?.code === "P2002") continue;
      throw e;
    }
  }

  if (!created) {
    return NextResponse.json(
      { error: "Impossibile generare quoteNumber dopo 5 tentativi." },
      { status: 500 }
    );
  }

  const detail = await loadQuoteDetailById(created.id);
  if (!detail) {
    return NextResponse.json(
      { error: "Preventivo registrato ma non recuperabile. Controlla in elenco." },
      { status: 500 }
    );
  }
  return NextResponse.json(detail);
}
