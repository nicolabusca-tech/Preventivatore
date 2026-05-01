import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    orderBy: [{ block: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      block: true,
      price: true,
      isMonthly: true,
      active: true,
      diagnosiPeso: true,
    },
  });

  return NextResponse.json(products);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = await req.json();
  const updates: { id: string; diagnosiPeso: number }[] = body?.updates;
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.product.update({
        where: { id: u.id },
        data: { diagnosiPeso: Math.max(0, Math.min(100, Number(u.diagnosiPeso) || 0)) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
