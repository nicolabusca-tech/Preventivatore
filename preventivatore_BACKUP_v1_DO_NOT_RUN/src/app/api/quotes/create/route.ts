import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await req.json();
  const {
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientNotes,
    items,
    notes,
    expiresAt,
    totalSetup,
    totalMonthly,
    totalAnnual,
  } = data;

  if (!clientName || !items || items.length === 0) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  // Genera numero preventivo progressivo
  const count = await prisma.quote.count();
  const year = new Date().getFullYear();
  const quoteNumber = `Q${year}-${String(count + 1).padStart(4, "0")}`;

  // Scadenza default: 30 giorni
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      userId: session.user.id,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientNotes,
      notes,
      expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiry,
      totalSetup: totalSetup || 0,
      totalMonthly: totalMonthly || 0,
      totalAnnual: totalAnnual || 0,
      items: {
        create: items.map((item: any) => ({
          productCode: item.productCode,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity || 1,
          isMonthly: item.isMonthly || false,
          notes: item.notes,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(quote);
}
