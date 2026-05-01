import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
  const updated = await prisma.productCost.update({
    where: { id: params.id },
    data: {
      name: typeof data?.name === "string" ? data.name.trim() : undefined,
      unitCostCents: data?.unitCostCents !== undefined ? Number(data.unitCostCents || 0) : undefined,
      unit: typeof data?.unit === "string" ? data.unit : undefined,
      multiplierKind: typeof data?.multiplierKind === "string" ? data.multiplierKind : undefined,
      multiplierValue: data?.multiplierValue !== undefined ? (data.multiplierValue == null ? null : Number(data.multiplierValue)) : undefined,
      conditionsJson: data?.conditionsJson !== undefined ? (data.conditionsJson == null ? null : String(data.conditionsJson)) : undefined,
      active: data?.active !== undefined ? !!data.active : undefined,
      sortOrder: data?.sortOrder !== undefined ? Number(data.sortOrder || 0) : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await prisma.productCost.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

