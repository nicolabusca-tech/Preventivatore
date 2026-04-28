import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf/generate-pdf";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";

export async function GET(
  req: Request,
  { params }: { params: { quoteNumber: string } }
) {
  const quoteNumber = params?.quoteNumber;
  if (!quoteNumber) {
    return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  }

  await ensureQuoteSchema();

  const quote = await prisma.quote.findUnique({
    where: { quoteNumber },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });

  // Regole accesso pubblico: mai bozze
  if (quote.status === "draft") {
    return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  }
  if (quote.status !== "sent" && quote.status !== "viewed") {
    return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  }

  // Tracking prima apertura da cliente
  if (quote.status === "sent" && !quote.viewedAt) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "viewed", viewedAt: new Date() },
      select: { id: true },
    });
  }

  try {
    const pdfBuffer = await generatePdf(quote);
    const filename = `Piano-Operativo-${quote.quoteNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Errore generazione PDF (public):", error);
    return NextResponse.json({ error: "Errore durante la generazione del PDF" }, { status: 500 });
  }
}

