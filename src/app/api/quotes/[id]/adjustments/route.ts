import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";

function normalizeKind(raw: unknown) {
  const v = String(raw || "").toLowerCase();
  if (v === "revenue" || v === "cost") return v;
  return "";
}

function normalizeFrequency(raw: unknown) {
  const v = String(raw || "").toUpperCase();
  if (v === "ONE_TIME" || v === "MONTH" || v === "YEAR") return v;
  return "ONE_TIME";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const rows = await prisma.quoteAdjustment.findMany({
    where: { quoteId: quote.id },
    orderBy: [{ createdAt: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  const label = typeof data?.label === "string" ? data.label.trim() : "";
  const kind = normalizeKind(data?.kind);
  const amount = Math.round(Number(data?.amount || 0));
  const frequency = normalizeFrequency(data?.frequency);

  if (!label) return NextResponse.json({ error: "label mancante" }, { status: 400 });
  if (!kind) return NextResponse.json({ error: "kind non valido (revenue|cost)" }, { status: 400 });
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "amount non valido" }, { status: 400 });
  }

  const created = await prisma.quoteAdjustment.create({
    data: {
      quoteId: quote.id,
      label,
      kind,
      amount,
      frequency,
      startsAt: data?.startsAt ? new Date(String(data.startsAt)) : null,
      endsAt: data?.endsAt ? new Date(String(data.endsAt)) : null,
      notes: data?.notes ? String(data.notes) : null,
    },
  });

  return NextResponse.json(created);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  const adjustmentId = typeof data?.adjustmentId === "string" ? data.adjustmentId : "";
  if (!adjustmentId) return NextResponse.json({ error: "adjustmentId mancante" }, { status: 400 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const existing = await prisma.quoteAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!existing || existing.quoteId !== quote.id) {
    return NextResponse.json({ error: "Riga non trovata" }, { status: 404 });
  }

  const nextKind = data?.kind !== undefined ? normalizeKind(data.kind) : "";
  if (data?.kind !== undefined && !nextKind) {
    return NextResponse.json({ error: "kind non valido (revenue|cost)" }, { status: 400 });
  }

  const updated = await prisma.quoteAdjustment.update({
    where: { id: existing.id },
    data: {
      label: typeof data?.label === "string" ? data.label.trim() : undefined,
      kind: data?.kind !== undefined ? nextKind : undefined,
      amount: data?.amount !== undefined ? Math.round(Number(data.amount || 0)) : undefined,
      frequency: data?.frequency !== undefined ? normalizeFrequency(data.frequency) : undefined,
      startsAt: data?.startsAt !== undefined ? (data.startsAt ? new Date(String(data.startsAt)) : null) : undefined,
      endsAt: data?.endsAt !== undefined ? (data.endsAt ? new Date(String(data.endsAt)) : null) : undefined,
      notes: data?.notes !== undefined ? (data.notes ? String(data.notes) : null) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  const adjustmentId = typeof data?.adjustmentId === "string" ? data.adjustmentId : "";
  if (!adjustmentId) return NextResponse.json({ error: "adjustmentId mancante" }, { status: 400 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const existing = await prisma.quoteAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!existing || existing.quoteId !== quote.id) {
    return NextResponse.json({ error: "Riga non trovata" }, { status: 404 });
  }

  await prisma.quoteAdjustment.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}

