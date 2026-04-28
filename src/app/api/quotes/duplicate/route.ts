import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";

function buildNextQuoteNumber(prev: string | null, year: number) {
  const prefix = `Q${year}-`;
  const prevNum = prev && prev.startsWith(prefix) ? Number(prev.slice(prefix.length)) : 0;
  const nextNum = Number.isFinite(prevNum) ? prevNum + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  const body = await req.json().catch(() => null);
  const quoteId = body?.quoteId;
  if (typeof quoteId !== "string" || !quoteId.trim()) {
    return NextResponse.json({ error: "quoteId mancante" }, { status: 400 });
  }

  const source = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && source.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  let created: { id: string; quoteNumber: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const last = await prisma.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: "desc" },
        select: { quoteNumber: true },
      });
      const quoteNumber = buildNextQuoteNumber(last?.quoteNumber ?? null, year);

      created = await prisma.quote.create({
        data: {
          quoteNumber,
          userId: session.user.id,
          dceProductId: source.dceProductId,
          clientName: source.clientName,
          clientCompany: source.clientCompany,
          clientEmail: source.clientEmail,
          clientPhone: source.clientPhone,
          clientNotes: source.clientNotes,
          crmCustomerId: source.crmCustomerId,
          clientAddress: source.clientAddress,
          clientPostalCode: source.clientPostalCode,
          clientCity: source.clientCity,
          clientProvince: source.clientProvince,
          originCliente: source.originCliente,
          estrattoDiagnosi: source.estrattoDiagnosi,
          diagnosiGiaPagata: source.diagnosiGiaPagata,
          roiPreventiviMese: source.roiPreventiviMese,
          roiImportoMedio: source.roiImportoMedio,
          roiConversioneAttuale: source.roiConversioneAttuale,
          roiMargineCommessa: source.roiMargineCommessa,
          roiSnapshot: source.roiSnapshot,
          clientVat: source.clientVat,
          clientSdi: source.clientSdi,
          totalSetup: source.totalSetup,
          totalMonthly: source.totalMonthly,
          totalAnnual: source.totalAnnual,
          setupBeforeDiscount: source.setupBeforeDiscount,
          discountType: source.discountType,
          discountAmount: source.discountAmount,
          discountCode: source.discountCode,
          discountPercent: source.discountPercent,
          scontoCrmAnnuale: source.scontoCrmAnnuale,
          scontoAiVocaleAnnuale: source.scontoAiVocaleAnnuale,
          scontoWaAnnuale: source.scontoWaAnnuale,
          voucherAuditApplied: source.voucherAuditApplied,
          status: "draft",
          sentAt: null,
          viewedAt: null,
          expiresAt: source.expiresAt ?? defaultExpiry,
          notes: source.notes,
          items: {
            create: source.items.map((it) => ({
              productCode: it.productCode,
              productName: it.productName,
              price: it.price,
              quantity: it.quantity,
              isMonthly: it.isMonthly,
              notes: it.notes,
            })),
          },
        },
        select: { id: true, quoteNumber: true },
      });

      break;
    } catch (e: any) {
      if (e?.code === "P2002") continue;
      throw e;
    }
  }

  if (!created) {
    return NextResponse.json({ error: "Impossibile generare quoteNumber" }, { status: 500 });
  }

  return NextResponse.json(created);
}

