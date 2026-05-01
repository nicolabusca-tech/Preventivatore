import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/security/csrf";

const SINGLETON_ID = "singleton";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const row = await prisma.roiConfig.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });

  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = await req.json();
  const dpm = body.defaultPreventiviMese;
  const dim = body.defaultImportoMedio;
  const dcv = body.defaultConversione;
  const dmr = body.defaultMargine;
  const updated = await prisma.roiConfig.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      defaultPreventiviMese: dpm !== undefined && dpm !== null ? Number(dpm) : 4,
      defaultImportoMedio: dim !== undefined && dim !== null ? Number(dim) : 5000,
      defaultConversione: dcv !== undefined && dcv !== null ? Number(dcv) : 25,
      defaultMargine: dmr !== undefined && dmr !== null ? Number(dmr) : 20,
    },
    update: {
      ...(dpm !== undefined && dpm !== null ? { defaultPreventiviMese: Number(dpm) } : {}),
      ...(dim !== undefined && dim !== null ? { defaultImportoMedio: Number(dim) } : {}),
      ...(dcv !== undefined && dcv !== null ? { defaultConversione: Number(dcv) } : {}),
      ...(dmr !== undefined && dmr !== null ? { defaultMargine: Number(dmr) } : {}),
    },
  });

  return NextResponse.json(updated);
}
