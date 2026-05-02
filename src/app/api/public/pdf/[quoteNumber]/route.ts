import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf/generate-pdf";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";

function safeFileToken(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

export async function GET(
  req: Request,
  { params }: { params: { quoteNumber: string } }
) {
  const quoteNumber = params?.quoteNumber;
  if (!quoteNumber) {
    return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  }

  await ensureQuoteSchema();

  const url = new URL(req.url);
  const providedToken = (url.searchParams.get("t") || "").trim();

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

  // Se il preventivo ha un token, l’accesso pubblico richiede ?t=...
  // Per i preventivi legacy (senza token), si può consentire temporaneamente l’accesso
  // impostando MC_ALLOW_LEGACY_PUBLIC_PDF=1.
  const storedToken = (quote as any).publicPdfToken as string | null | undefined;
  if (storedToken && providedToken !== storedToken) {
    return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  }
  if (!storedToken && process.env.MC_ALLOW_LEGACY_PUBLIC_PDF !== "1") {
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

    // Se abbiamo uno snapshot del PDF al momento dell'invio, serviamo quello
  // (immutabile). Solo se manca, rigeneriamo dinamicamente.
  const snapshot = await prisma.quotePdfSnapshot.findUnique({
    where: { quoteId: quote.id },
    select: { pdfData: true },
  });
  if (snapshot?.pdfData) {
    const safeQuoteNumber = safeFileToken(String(quote.quoteNumber || "preventivo"));
    const filename = `Piano-Operativo-${safeQuoteNumber || "preventivo"}.pdf`;
    const filenameStar = encodeURIComponent(filename);
    const buf = Buffer.from(snapshot.pdfData);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${filenameStar}`,
        "Content-Length": buf.length.toString(),
        "Cache-Control": "private, max-age=300",
        "X-Pdf-Source": "snapshot",
      },
    });
  }

try {
    const pdfBuffer = await generatePdf(quote);
    const safeQuoteNumber = safeFileToken(String(quote.quoteNumber || "preventivo"));
    const filename = `Piano-Operativo-${safeQuoteNumber || "preventivo"}.pdf`;
    const filenameStar = encodeURIComponent(filename);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${filenameStar}`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Errore generazione PDF (public):", error);
    return NextResponse.json({ error: "Errore durante la generazione del PDF" }, { status: 500 });
  }
}

