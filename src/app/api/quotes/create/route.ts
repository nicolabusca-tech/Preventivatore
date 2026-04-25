import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;
const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";

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
    diagnosiGiaPagata,
    items,
    dceProductId,
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

  if (!dceProductId || typeof dceProductId !== "string") {
    return NextResponse.json(
      {
        error:
          "Seleziona prima il livello DCE: senza regia il sistema non parte.",
      },
      { status: 400 }
    );
  }

  const dceProduct = await prisma.product.findUnique({
    where: { id: dceProductId },
    select: { id: true, code: true, name: true, price: true, isMonthly: true },
  });

  if (!dceProduct || !DCE_ALLOWED_CODES.includes(dceProduct.code as any) || !dceProduct.isMonthly) {
    return NextResponse.json(
      { error: "Livello DCE non valido. Seleziona DCE_BASE, DCE_STRUTTURATO o DCE_ENTERPRISE." },
      { status: 400 }
    );
  }

  const count = await prisma.quote.count();
  const year = new Date().getFullYear();
  const quoteNumber = `Q${year}-${String(count + 1).padStart(4, "0")}`;

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  const diagnosiPaid = diagnosiGiaPagata !== undefined ? !!diagnosiGiaPagata : true;

  // Enforce: una sola DCE, e deve essere quella selezionata da Product (no prezzi liberi)
  const itemsWithoutDce = Array.isArray(items)
    ? items.filter(
        (it: any) =>
          !it ||
          typeof it.productCode !== "string" ||
          !DCE_ALLOWED_CODES.some((c) => it.productCode === c || it.productCode.startsWith("DCE"))
      )
    : [];

  const itemsWithoutDiagnosi = itemsWithoutDce.filter(
    (it: any) => !it || typeof it.productCode !== "string" || it.productCode !== DIAGNOSI_CODE
  );

  const diagnosiItem = !diagnosiPaid
    ? await prisma.product.findUnique({
        where: { code: DIAGNOSI_CODE },
        select: { code: true, name: true, price: true, isMonthly: true },
      })
    : null;

  if (!diagnosiPaid && (!diagnosiItem || diagnosiItem.isMonthly)) {
    return NextResponse.json({ error: "Prodotto Diagnosi Strategica non valido a listino." }, { status: 400 });
  }

  const finalItems = [
    ...itemsWithoutDiagnosi,
    ...(diagnosiPaid
      ? []
      : [
          {
            productCode: diagnosiItem!.code,
            productName: diagnosiItem!.name,
            price: diagnosiItem!.price,
            quantity: 1,
            isMonthly: false,
            notes: null,
          },
        ]),
    {
      productCode: dceProduct.code,
      productName: dceProduct.name,
      price: dceProduct.price,
      quantity: 1,
      isMonthly: true,
      notes: null,
    },
  ];

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      userId: session.user.id,
      dceProductId: dceProduct.id,
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
      diagnosiGiaPagata: diagnosiPaid,
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
        create: finalItems.map((item: any) => ({
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
