import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

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

  const count = await prisma.quote.count();
  const year = new Date().getFullYear();
  const quoteNumber = `Q${year}-${String(count + 1).padStart(4, "0")}`;

  const created = await prisma.quote.create({
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
      expiresAt: null,
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

  return NextResponse.json(created);
}

