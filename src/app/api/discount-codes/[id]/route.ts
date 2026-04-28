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

  const data = await req.json();
  const updates: any = {};
  if (data.active !== undefined) updates.active = data.active;
  if (data.discountPercent !== undefined) updates.discountPercent = parseInt(data.discountPercent);
  if (data.discountAmount !== undefined) updates.discountAmount = parseInt(data.discountAmount);
  if (data.maxUses !== undefined) updates.maxUses = data.maxUses ? parseInt(data.maxUses) : null;
  if (data.expiresAt !== undefined)
    updates.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.description !== undefined) updates.description = data.description;

  const code = await prisma.discountCode.update({
    where: { id: params.id },
    data: updates,
  });
  return NextResponse.json(code);
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

  await prisma.discountCode.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
