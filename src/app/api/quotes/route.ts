import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  // Aggiornamento automatico stato "scaduto" per preventivi con expiresAt < now
  await prisma.quote.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: ["sent"] },
    },
    data: { status: "sent" },
  });

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
}
