import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf/generate-pdf";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });

  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const hasValidDce =
    typeof quote.dceProductId === "string" &&
    quote.dceProductId.length > 0 &&
    quote.items.some((i) => i.isMonthly && DCE_ALLOWED_CODES.includes(i.productCode as any));

  if (!hasValidDce) {
    return NextResponse.json(
      { error: "Seleziona prima il livello DCE: senza regia il sistema non parte." },
      { status: 400 }
    );
  }

  if (quote.quoteNumber === "Q2026-0004") {
    const investimentoTeorico = quote.totalSetup + quote.totalMonthly * 12;
    const extraUnaTantum = Math.max(0, quote.totalAnnual - investimentoTeorico);
    console.log("[PDF DEBUG][Q2026-0004] totals", {
      quoteNumber: quote.quoteNumber,
      setupBeforeDiscount: quote.setupBeforeDiscount,
      totalSetup: quote.totalSetup,
      totalMonthly: quote.totalMonthly,
      totalAnnual: quote.totalAnnual,
      discountType: quote.discountType,
      discountAmount: quote.discountAmount,
      voucherAuditApplied: quote.voucherAuditApplied,
      extraUnaTantum,
      items: quote.items.map((i) => ({
        productCode: i.productCode,
        price: i.price,
        quantity: i.quantity,
        isMonthly: i.isMonthly,
      })),
    });
  }

  try {
    const pdfBuffer = await generatePdf(quote);
    const filename = `Piano-Operativo-${quote.quoteNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Errore generazione PDF:", error);
    return NextResponse.json({ error: "Errore durante la generazione del PDF" }, { status: 500 });
  }
}

