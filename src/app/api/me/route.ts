import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const nextEmailRaw = typeof body?.email === "string" ? body.email : undefined;
  const nextPasswordRaw = typeof body?.newPassword === "string" ? body.newPassword : undefined;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

  const nextEmail = nextEmailRaw !== undefined ? nextEmailRaw.trim().toLowerCase() : undefined;
  const nextPassword = nextPasswordRaw !== undefined ? nextPasswordRaw : undefined;

  if (!nextEmail && !nextPassword) {
    return NextResponse.json({ error: "Nessuna modifica richiesta" }, { status: 400 });
  }
  if (!currentPassword) {
    return NextResponse.json({ error: "Password attuale obbligatoria" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, password: true, active: true },
  });
  if (!user || !user.active) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return NextResponse.json({ error: "Password attuale non corretta" }, { status: 400 });

  const updates: any = {};
  let requiresReauth = false;

  if (nextEmail !== undefined) {
    if (!nextEmail) return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    if (!isValidEmail(nextEmail)) return NextResponse.json({ error: "Email non valida" }, { status: 400 });

    if (nextEmail !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (existing) return NextResponse.json({ error: "Email già registrata" }, { status: 400 });
      updates.email = nextEmail;
      requiresReauth = true;
    }
  }

  if (nextPassword !== undefined) {
    if (!nextPassword || nextPassword.length < 8) {
      return NextResponse.json({ error: "La nuova password deve essere di almeno 8 caratteri" }, { status: 400 });
    }
    updates.password = await bcrypt.hash(nextPassword, 10);
    requiresReauth = true;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json({ user: updated, requiresReauth });
}

