import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: "Codice mancante" });

  const codeUpper = code.toUpperCase().trim();
  const discount = await prisma.discountCode.findUnique({ where: { code: codeUpper } });

  if (!discount) {
    return NextResponse.json({ valid: false, error: "Codice non trovato" });
  }

  if (!discount.active) {
    return NextResponse.json({ valid: false, error: "Codice disattivato" });
  }

  if (discount.expiresAt && discount.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "Codice scaduto" });
  }

  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    return NextResponse.json({ valid: false, error: "Codice esaurito" });
  }

  return NextResponse.json({
    valid: true,
    code: discount.code,
    discountPercent: discount.discountPercent,
    description: discount.description,
  });
}
