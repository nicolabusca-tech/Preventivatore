import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function splitName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstname: parts[0] ?? "",
    lastname: parts.slice(1).join(" ") ?? "",
  };
}

function addDays(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const quoteId = body?.quoteId;
  if (typeof quoteId !== "string" || !quoteId.trim()) {
    return NextResponse.json({ error: "quoteId mancante" }, { status: 400 });
  }

  // Step 1 — Validazione
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      userId: true,
      quoteNumber: true,
      clientName: true,
      clientCompany: true,
      clientEmail: true,
      clientPhone: true,
      totalAnnual: true,
      totalSetup: true,
      status: true,
    },
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  if (quote.status !== "draft") {
    return NextResponse.json({ error: "Preventivo già inviato" }, { status: 400 });
  }
  if (!quote.clientEmail || !quote.clientEmail.trim()) {
    return NextResponse.json({ error: "Email cliente mancante" }, { status: 400 });
  }

  // Step 2 — Blocca il preventivo
  const now = new Date();
  const locked = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "sent",
      sentAt: now,
      expiresAt: addDays(now, 30),
    },
    select: { id: true },
  });

  const fwKey = process.env.FW360_API_KEY;
  if (!fwKey) {
    return NextResponse.json({ error: "FW360_API_KEY mancante" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL mancante" }, { status: 500 });
  }

  // Step 3 — Upsert cliente in Framework360
  const { firstname, lastname } = splitName(quote.clientName);
  const fw360Response = await fetch("https://metodocantiere.it/m/api/customers/registration", {
    method: "POST",
    headers: {
      "X-Fw360-Key": fwKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      firstname,
      lastname,
      email: quote.clientEmail.trim(),
      ...(quote.clientPhone ? { phone: quote.clientPhone } : {}),
      ...(quote.clientCompany ? { company: quote.clientCompany } : {}),
    }),
  });

  const fw360Data = await fw360Response.json().catch(() => null);
  const customerId = fw360Data?.data?.id ? String(fw360Data.data.id) : "";
  if (!fw360Response.ok || !customerId) {
    console.error("FW360 registration failed", {
      ok: fw360Response.ok,
      status: fw360Response.status,
      body: fw360Data,
      quoteId: locked.id,
    });
    return NextResponse.json({ error: "Errore Framework360 (registrazione cliente)" }, { status: 502 });
  }

  await prisma.quote.update({
    where: { id: locked.id },
    data: { crmCustomerId: customerId },
    select: { id: true },
  });

  // Step 4 — Crea voce cronologia in Framework360
  const pdfUrl = `${appUrl}/api/public/pdf/${quote.quoteNumber}`;
  await fetch("https://metodocantiere.it/m/api/customers/history/create", {
    method: "POST",
    headers: {
      "X-Fw360-Key": fwKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer_id: customerId,
      title: "Preventivo " + quote.quoteNumber + " " + (quote.clientCompany || quote.clientName),
      content: "Preventivo inviato. <a href=\"" + pdfUrl + "\" target=\"_blank\">Apri PDF</a>",
      date: new Date().toISOString().split("T")[0],
    }),
  }).catch((e) => {
    console.error("FW360 history create failed", { quoteId: locked.id, customerId, error: e });
  });

  // Step 5 — Aggiorna campi extra del cliente (per automazione email)
  await fetch("https://metodocantiere.it/m/api/customers/update", {
    method: "POST",
    headers: {
      "X-Fw360-Key": fwKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer_id: customerId,
      "extraFields[ultimo_preventivo_url]": pdfUrl,
      "extraFields[ultimo_preventivo_numero]": quote.quoteNumber,
      "extraFields[ultimo_preventivo_importo]": String(quote.totalAnnual || quote.totalSetup),
    }),
  }).catch((e) => {
    console.error("FW360 customer update failed", { quoteId: locked.id, customerId, error: e });
  });

  // Step 6 — Response
  return NextResponse.json({ success: true, status: "sent" });
}

