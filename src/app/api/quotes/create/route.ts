import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await req.json();
  const {
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientNotes,
    clientVat,
    clientSdi,
    clientAddress,
    clientPostalCode,
    clientCity,
    clientProvince,
    originCliente,
    estrattoDiagnosi,
    roiPreventiviMese,
    roiImportoMedio,
    roiConversioneAttuale,
    roiMargineCommessa,
    roiSnapshot,
    crmCustomerId,
    scontoAiVocaleAnnuale,
    scontoWaAnnuale,
    items,
    notes,
    expiresAt,
    totalSetup,
    totalMonthly,
    totalAnnual,
    setupBeforeDiscount,
    discountType,
    discountAmount,
    discountCode,
    discountPercent,
    scontoCrmAnnuale,
    voucherAuditApplied,
  } = data;

  if (!clientName || !items || items.length === 0) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const count = await prisma.quote.count();
  const year = new Date().getFullYear();
  const quoteNumber = `Q${year}-${String(count + 1).padStart(4, "0")}`;

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      userId: session.user.id,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientNotes,
      clientVat: clientVat || null,
      clientSdi: clientSdi || null,
      clientAddress: clientAddress ?? null,
      clientPostalCode: clientPostalCode ?? null,
      clientCity: clientCity ?? null,
      clientProvince: clientProvince ?? null,
      originCliente: originCliente ?? null,
      estrattoDiagnosi: estrattoDiagnosi ?? null,
      roiPreventiviMese: roiPreventiviMese ?? null,
      roiImportoMedio: roiImportoMedio ?? null,
      roiConversioneAttuale: roiConversioneAttuale ?? null,
      roiMargineCommessa: roiMargineCommessa ?? null,
      roiSnapshot: roiSnapshot ?? null,
      crmCustomerId: crmCustomerId ?? null,
      scontoAiVocaleAnnuale: scontoAiVocaleAnnuale ?? false,
      scontoWaAnnuale: scontoWaAnnuale ?? false,
      notes,
      expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiry,
      totalSetup: totalSetup || 0,
      totalMonthly: totalMonthly || 0,
      totalAnnual: totalAnnual || 0,
      setupBeforeDiscount: setupBeforeDiscount || totalSetup || 0,
      discountType: discountType || null,
      discountAmount: discountAmount || 0,
      discountCode: discountCode || null,
      discountPercent: discountPercent || 0,
      scontoCrmAnnuale: scontoCrmAnnuale ?? false,
      voucherAuditApplied: voucherAuditApplied || false,
      items: {
        create: items.map((item: any) => ({
          productCode: item.productCode,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity || 1,
          isMonthly: item.isMonthly || false,
          notes: item.notes,
        })),
      },
    },
    include: { items: true },
  });

  // Se usato un codice manuale, incrementa contatore utilizzi
  if (discountType === "manual" && discountCode) {
    await prisma.discountCode.updateMany({
      where: { code: discountCode.toUpperCase().trim() },
      data: { usedCount: { increment: 1 } },
    });
  }

  return NextResponse.json(quote);
}
