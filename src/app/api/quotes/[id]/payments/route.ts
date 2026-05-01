import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toQuotePaymentJson } from "@/lib/quotes/serialize-nested";
import { assertCsrf } from "@/lib/security/csrf";

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

  const payments = await prisma.quotePayment.findMany({
    where: { quoteId: params.id },
    orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(payments.map(toQuotePaymentJson));
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
  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount non valido" }, { status: 400 });
  }

  const created = await prisma.quotePayment.create({
    data: {
      quoteId: quote.id,
      amount: Math.round(amount),
      dueDate: data?.dueDate ? new Date(String(data.dueDate)) : null,
      paidAt: data?.paidAt ? new Date(String(data.paidAt)) : null,
      method: data?.method ? String(data.method) : null,
      notes: data?.notes ? String(data.notes) : null,
      kind: data?.kind != null && String(data.kind).trim() ? String(data.kind) : null,
    },
  });
  return NextResponse.json(toQuotePaymentJson(created));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const paymentId = body?.paymentId;
  if (typeof paymentId !== "string" || !paymentId.trim()) {
    return NextResponse.json({ error: "paymentId mancante" }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const existing = await prisma.quotePayment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.quoteId !== quote.id) {
    return NextResponse.json({ error: "Pagamento non trovato" }, { status: 404 });
  }

  const updated = await prisma.quotePayment.update({
    where: { id: existing.id },
    data: {
      amount: body?.amount !== undefined ? Math.round(Number(body.amount || 0)) : undefined,
      dueDate: body?.dueDate !== undefined ? (body.dueDate ? new Date(String(body.dueDate)) : null) : undefined,
      paidAt: body?.paidAt !== undefined ? (body.paidAt ? new Date(String(body.paidAt)) : null) : undefined,
      method: body?.method !== undefined ? (body.method ? String(body.method) : null) : undefined,
      notes: body?.notes !== undefined ? (body.notes ? String(body.notes) : null) : undefined,
      kind:
        body?.kind !== undefined
          ? body.kind && String(body.kind).trim()
            ? String(body.kind)
            : null
          : undefined,
    },
  });
  return NextResponse.json(toQuotePaymentJson(updated));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const paymentId = body?.paymentId;
  if (typeof paymentId !== "string" || !paymentId.trim()) {
    return NextResponse.json({ error: "paymentId mancante" }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const existing = await prisma.quotePayment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.quoteId !== quote.id) {
    return NextResponse.json({ error: "Pagamento non trovato" }, { status: 404 });
  }

  await prisma.quotePayment.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}

