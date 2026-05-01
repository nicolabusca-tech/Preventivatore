import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      code: true,
      costs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!product) return NextResponse.json({ error: "Prodotto non trovato" }, { status: 404 });

  return NextResponse.json(product.costs);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  if (!data || typeof data.name !== "string" || !data.name.trim()) {
    return NextResponse.json({ error: "name mancante" }, { status: 400 });
  }

  const created = await prisma.productCost.create({
    data: {
      productId: params.id,
      name: data.name.trim(),
      unitCostCents: Number(data.unitCostCents || 0),
      unit: String(data.unit || "ONE_TIME"),
      multiplierKind: String(data.multiplierKind || "FIXED"),
      multiplierValue: data.multiplierValue != null ? Number(data.multiplierValue) : null,
      conditionsJson: data.conditionsJson != null ? String(data.conditionsJson) : null,
      active: data.active !== undefined ? !!data.active : true,
      sortOrder: Number(data.sortOrder || 0),
    },
  });
  return NextResponse.json(created);
}

