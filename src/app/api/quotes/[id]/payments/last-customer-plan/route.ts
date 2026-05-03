import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAYMENT_KIND } from "@/lib/quote-payment-plan";

/**
 * GET /api/quotes/[id]/payments/last-customer-plan
 *
 * Cerca, tra i preventivi *precedenti* dello stesso cliente del preventivo
 * corrente, l'ultimo che abbia un piano pagamenti custom (cioe' almeno una
 * riga di tipo INSTALLMENT). Se lo trova, ricostruisce i parametri del piano
 * (acconto, n. rate, data prima rata, modalita') e li ritorna pronti per
 * prefillare il PaymentsDrawer.
 *
 * Match cliente, in ordine:
 *   1) crmCustomerId esatto (quando entrambi presenti);
 *   2) clientCompany esatto (case-insensitive);
 *   3) clientName esatto (case-insensitive).
 *
 * Solo per uso interno (Nicola + Cristina), niente PII verso terzi.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const current = await prisma.quote.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      crmCustomerId: true,
      clientCompany: true,
      clientName: true,
      createdAt: true,
    },
  });
  if (!current) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && current.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  // Costruisco i criteri di match a cascata.
  const matchClauses: Array<Record<string, unknown>> = [];
  if (current.crmCustomerId && current.crmCustomerId.trim()) {
    matchClauses.push({ crmCustomerId: current.crmCustomerId });
  }
  if (current.clientCompany && current.clientCompany.trim()) {
    matchClauses.push({ clientCompany: { equals: current.clientCompany, mode: "insensitive" } });
  }
  if (current.clientName && current.clientName.trim()) {
    matchClauses.push({ clientName: { equals: current.clientName, mode: "insensitive" } });
  }
  if (matchClauses.length === 0) {
    return NextResponse.json({ found: false, reason: "no-match-keys" });
  }

  // Trovo i candidati: stesso cliente, escluso il preventivo corrente, con
  // almeno un pagamento INSTALLMENT.
  const candidates = await prisma.quote.findMany({
    where: {
      id: { not: current.id },
      OR: matchClauses,
      payments: { some: { kind: PAYMENT_KIND.INSTALLMENT } },
    },
    select: {
      id: true,
      quoteNumber: true,
      clientCompany: true,
      clientName: true,
      createdAt: true,
      payments: {
        where: {
          OR: [
            { kind: PAYMENT_KIND.SETUP_DEPOSIT },
            { kind: PAYMENT_KIND.INSTALLMENT },
          ],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kind: true,
          amount: true,
          dueDate: true,
          method: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 1,
  });

  const last = candidates[0];
  if (!last) {
    return NextResponse.json({ found: false, reason: "no-prior-custom-plan" });
  }

  const deposit = last.payments.find((p) => p.kind === PAYMENT_KIND.SETUP_DEPOSIT);
  const installments = last.payments.filter((p) => p.kind === PAYMENT_KIND.INSTALLMENT);
  if (installments.length === 0) {
    return NextResponse.json({ found: false, reason: "no-installments" });
  }

  // Metodo dominante delle rate: se >=50% dello stesso, lo restituisco come
  // "metodo suggerito di default", altrimenti niente (il drawer suggerira'
  // per soglia importo).
  const methodCounts: Record<string, number> = {};
  for (const r of installments) {
    const m = r.method || "bank";
    methodCounts[m] = (methodCounts[m] || 0) + 1;
  }
  const dominantMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const firstInst = installments[0];

  return NextResponse.json({
    found: true,
    sourceQuoteId: last.id,
    sourceQuoteNumber: last.quoteNumber,
    sourceCreatedAt: last.createdAt.toISOString(),
    sourceClientLabel: last.clientCompany || last.clientName,
    plan: {
      depositAmount: deposit ? deposit.amount : 0,
      depositDate: deposit?.dueDate ? deposit.dueDate.toISOString().slice(0, 10) : null,
      depositMethod: deposit?.method || "bank",
      numInstallments: installments.length,
      firstInstallmentDate: firstInst?.dueDate
        ? firstInst.dueDate.toISOString().slice(0, 10)
        : null,
      dominantMethod,
    },
  });
}
