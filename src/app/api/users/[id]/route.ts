import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { assertCsrf } from "@/lib/security/csrf";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
  if (data.name !== undefined) updates.name = data.name;
  if (data.role !== undefined) updates.role = data.role;
  if (data.active !== undefined) updates.active = data.active;
  if (data.password) updates.password = await bcrypt.hash(data.password, 10);

  if (data.email !== undefined) {
    const nextEmail = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!nextEmail || !isValidEmail(nextEmail)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 400 });
    }
    updates.email = nextEmail;
  }

  if (data.role !== undefined) {
    const role = typeof data.role === "string" ? data.role : "";
    if (role !== "admin" && role !== "commerciale") {
      return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
    }
    // evita auto-demozione/auto-promozione accidentale dalla stessa sessione
    if (params.id === session.user.id) {
      return NextResponse.json({ error: "Non puoi cambiare il tuo ruolo dalla tua sessione" }, { status: 400 });
    }
    updates.role = role;
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updates,
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json(user);
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

  // Non permettere auto-cancellazione
  if (session.user.id === params.id) {
    return NextResponse.json({ error: "Non puoi cancellare te stesso" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
