import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: admin vede tutti i codici, commerciale può solo validarli (vedi /validate)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(codes);
}

// POST: admin crea un nuovo codice sconto
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const data = await req.json();
  const { code, description, discountPercent, maxUses, expiresAt } = data;

  if (!code || !discountPercent) {
    return NextResponse.json({ error: "Codice e percentuale obbligatori" }, { status: 400 });
  }

  if (discountPercent < 1 || discountPercent > 50) {
    return NextResponse.json({ error: "Percentuale tra 1 e 50" }, { status: 400 });
  }

  // Verifica unicità
  const codeUpper = code.toUpperCase().trim();
  const existing = await prisma.discountCode.findUnique({ where: { code: codeUpper } });
  if (existing) {
    return NextResponse.json({ error: "Codice già esistente" }, { status: 400 });
  }

  const created = await prisma.discountCode.create({
    data: {
      code: codeUpper,
      description: description || null,
      discountPercent: parseInt(discountPercent),
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(created);
}
