import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";

export async function GET(req: Request) {
  try {
    await ensureQuoteSchema();

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

    const isAdmin = session.user.role === "admin";
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (!isAdmin) where.userId = userId;
    if (status && status !== "all") where.status = status;

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        user: { select: { name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (e: any) {
    console.error("Errore GET /api/quotes:", {
      message: e?.message,
      code: e?.code,
      name: e?.name,
    });
    // Non esporre dettagli sensibili al client: basta un hint e un codice generico.
    return NextResponse.json(
      { error: "Errore caricamento preventivi (server).", hint: "Controlla DATABASE_URL e schema Prisma su Vercel." },
      { status: 500 }
    );
  }
}
