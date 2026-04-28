import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  await ensureQuoteSchema();

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

  try {
    const pdfBuffer = await generatePdf(quote);
    const safeQuoteNumber = safeFileToken(String(quote.quoteNumber || "preventivo"));
    const filename = `Piano-Operativo-${safeQuoteNumber || "preventivo"}.pdf`;
    const filenameStar = encodeURIComponent(filename);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // iOS Safari gestisce meglio "inline" rispetto ad "attachment"
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${filenameStar}`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Errore generazione PDF:", error);
    return NextResponse.json({ error: "Errore durante la generazione del PDF" }, { status: 500 });
  }
}

