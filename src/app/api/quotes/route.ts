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

    // Paginazione opzionale, retro-compatibile: se page/limit non sono
    // passati, ritorniamo tutto come prima (max 500 per evitare runaway).
    const pageParam = Number(searchParams.get("page") || "0");
    const limitParam = Number(searchParams.get("limit") || "0");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 0;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 200)
      : 0;
    const q = (searchParams.get("q") || "").trim();

    const where: any = {};
    if (!isAdmin) where.userId = userId;
    if (status && status !== "all") where.status = status;
    if (q) {
      where.OR = [
        { quoteNumber: { contains: q, mode: "insensitive" } },
        { clientName: { contains: q, mode: "insensitive" } },
        { clientCompany: { contains: q, mode: "insensitive" } },
      ];
    }

    // Modalità paginata: ritorna { rows, total, page, limit }.
    if (limit > 0) {
      const skip = page > 0 ? (page - 1) * limit : 0;
      const [rows, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          include: {
            user: { select: { name: true } },
            items: { select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.quote.count({ where }),
      ]);
      return NextResponse.json({ rows, total, page: page || 1, limit });
    }

    // Modalità legacy: tutto (capped a 500 di sicurezza).
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        user: { select: { name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
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
