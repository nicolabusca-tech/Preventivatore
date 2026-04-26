import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });

  // Solo admin o owner
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  return NextResponse.json(quote);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await req.json();
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!quote) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const wantsDceUpdate = data.dceProductId !== undefined;
  const dceProductId: string | null =
    wantsDceUpdate && typeof data.dceProductId === "string" && data.dceProductId.length > 0
      ? data.dceProductId
      : wantsDceUpdate
        ? null
        : quote.dceProductId;

  const prevDceMonthly = quote.items
    .filter((i) => i.isMonthly && DCE_ALLOWED_CODES.includes(i.productCode as any))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  try {
    const updated = await prisma.$transaction(async (tx) => {
    let nextTotalMonthly = quote.totalMonthly;
    let nextTotalAnnual = quote.totalAnnual;

    if (wantsDceUpdate && dceProductId) {
      const dceProduct = await tx.product.findUnique({
        where: { id: dceProductId },
        select: { id: true, code: true, name: true, price: true, isMonthly: true },
      });

      if (!dceProduct || !DCE_ALLOWED_CODES.includes(dceProduct.code as any) || !dceProduct.isMonthly) {
        throw new Error("DCE_INVALID");
      }

      const newDceMonthly = dceProduct.price;
      nextTotalMonthly = Math.max(0, quote.totalMonthly - prevDceMonthly + newDceMonthly);
      nextTotalAnnual = Math.max(0, quote.totalAnnual - prevDceMonthly * 12 + newDceMonthly * 12);

      await tx.quoteItem.deleteMany({
        where: { quoteId: quote.id, isMonthly: true, productCode: { in: [...DCE_ALLOWED_CODES] as any } },
      });
      await tx.quoteItem.create({
        data: {
          quoteId: quote.id,
          productCode: dceProduct.code,
          productName: dceProduct.name,
          price: dceProduct.price,
          quantity: 1,
          isMonthly: true,
        },
      });
    } else if (wantsDceUpdate && dceProductId === null) {
      nextTotalMonthly = Math.max(0, quote.totalMonthly - prevDceMonthly);
      nextTotalAnnual = Math.max(0, quote.totalAnnual - prevDceMonthly * 12);
      await tx.quoteItem.deleteMany({
        where: { quoteId: quote.id, isMonthly: true, productCode: { in: [...DCE_ALLOWED_CODES] as any } },
      });
    }

    return await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: data.status ?? quote.status,
        notes: data.notes ?? quote.notes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : quote.expiresAt,
        dceProductId: wantsDceUpdate ? dceProductId : quote.dceProductId,
        totalMonthly: nextTotalMonthly,
        totalAnnual: nextTotalAnnual,
      },
      include: {
        user: { select: { name: true, email: true } },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "DCE_INVALID") {
      return NextResponse.json(
        { error: "Livello DCE non valido. Seleziona DCE_BASE, DCE_STRUTTURATO o DCE_ENTERPRISE." },
        { status: 400 }
      );
    }
    console.error("Errore aggiornamento preventivo:", e);
    return NextResponse.json({ error: "Errore durante l'aggiornamento del preventivo" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  await prisma.quote.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
