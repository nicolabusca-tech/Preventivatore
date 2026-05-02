import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";
import { SendQuoteSchema, badRequestFromZod } from "@/lib/quotes/schemas";
import { ZodError } from "zod";

/** Base API CRM (stessa documentazione PDF "Documentazione API - CRM Metodo Cantiere") */
const FW360_API_BASE =
  process.env.CRM_API_BASE?.replace(/\/$/, "") || "https://metodocantiere.it/m/api";

function addDays(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function capitalizeWord(w: string) {
  const t = (w || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** FW360 spesso rifiuta stringhe troppo corte, "-" o caratteri strani. */
function sanitizeFwField(value: string, fallback: string): string {
  let s = (value || "").trim();
  const bad = new Set(["-", "—", ".", "..", "n/a", "na", "none", "null"]);
  if (!s || bad.has(s.toLowerCase())) {
    s = fallback;
  }
  s = s
    .replace(/[^\p{L}\p{N}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length < 2) {
    s = fallback;
  }
  return s.slice(0, 120);
}

/**
 * Deriva nome, cognome e ragione sociale come da documentazione FW360
 * (POST /customers/registration — campi "nome", "cognome", "dati_fatturazione.ragione_sociale").
 */
function deriveFwNomeCognomeRagioneSociale(quote: {
  clientName: string | null;
  clientCompany: string | null;
  clientEmail: string | null;
}) {
  const email = (quote.clientEmail || "").trim();
  const rawName = (quote.clientName || "").trim();
  const rawCompany = (quote.clientCompany || "").trim();

  const parts = rawName.split(/\s+/).filter(Boolean);
  let nome = parts[0] || "";
  let cognome = parts.slice(1).join(" ") || "";

  if (nome && !cognome) {
    cognome = "Non indicato";
  }

  if (!nome && email) {
    const local = email.split("@")[0]?.replace(/[.+_-]+/g, " ").trim() || "";
    const tokens = local.split(/\s+/).filter(Boolean);
    if (tokens[0]) {
      nome = capitalizeWord(tokens[0]);
      cognome = tokens.slice(1).map(capitalizeWord).join(" ") || "Da preventivo";
    }
  }

  if (!nome) nome = "Cliente";
  if (!cognome) cognome = "Non indicato";

  let ragione_sociale =
    rawCompany ||
    rawName ||
    `${nome} ${cognome}`.trim() ||
    (email.includes("@")
      ? `${email.split("@")[1] ?? "cliente"} (contatto web)`
      : "Privato");

  return {
    nome: sanitizeFwField(nome, "Cliente"),
    cognome: sanitizeFwField(cognome, "Non indicato"),
    ragione_sociale: sanitizeFwField(ragione_sociale, "Privato"),
  };
}

function fwTempPassword(): string {
  const b = randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  return `McP${b.slice(0, 18)}9!x`;
}

function publicPdfToken(): string {
  // Token URL-safe per accesso al PDF pubblico (non derivabile dal quoteNumber).
  return randomBytes(24).toString("base64url");
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formato esempio documentazione: +391234567890 */
function formatFwTelefono(phone: string | null | undefined): string | undefined {
  const raw = (phone || "").trim();
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return undefined;
  if (raw.trim().startsWith("+")) return raw.trim().slice(0, 20);
  if (digits.startsWith("39")) return `+${digits}`;
  if (digits.startsWith("0")) return `+39${digits}`;
  return `+39${digits}`;
}

function extractFwCustomerId(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  const d = p.data;
  if (d && typeof d === "object") {
    const id = (d as Record<string, unknown>).id;
    if (id != null && id !== "") return String(id);
  }
  if (p.id != null && p.id !== "") return String(p.id);
  return "";
}

/** Documentazione: GET /m/api/customers/get — id o email */
async function fwGetCustomerIdByEmail(fwKey: string, email: string): Promise<string> {
  const url = new URL(`${FW360_API_BASE}/customers/get`);
  url.searchParams.set("email", email.trim());
  const r = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Fw360-Key": fwKey },
    signal: AbortSignal.timeout(12000),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) return "";
  return extractFwCustomerId(data);
}

/**
 * Documentazione ufficiale: POST /customers/registration con JSON:
 * nome, cognome, email, password (obbligatori), telefono, provenienza (default 6), dati_fatturazione, …
 */
async function fwRegisterOrGetCustomerId(opts: {
  fwKey: string;
  nome: string;
  cognome: string;
  ragione_sociale: string;
  email: string;
  phone?: string | null;
}): Promise<{ customerId: string; raw: any }> {
  const email = (opts.email || "").trim();

  const existing = await fwGetCustomerIdByEmail(opts.fwKey, email);
  if (existing) {
    return { customerId: existing, raw: { status: 1, data: { id: existing }, reusedByEmail: true } };
  }

  const provenienza = Number.parseInt(process.env.FW360_CUSTOMER_PROVENIENZA || "6", 10);
  const prov = Number.isFinite(provenienza) && provenienza > 0 ? provenienza : 6;
  const password = fwTempPassword();
  const telefono = formatFwTelefono(opts.phone);

  const jsonPrimary: Record<string, unknown> = {
    nome: opts.nome,
    cognome: opts.cognome,
    email,
    password,
    provenienza: prov,
    dati_fatturazione: {
      ragione_sociale: opts.ragione_sociale,
    },
  };
  if (telefono) jsonPrimary.telefono = telefono;

  const jsonMinimal: Record<string, unknown> = {
    nome: opts.nome,
    cognome: opts.cognome,
    email,
    password,
    provenienza: prov,
  };

  async function callRegistrationJson(body: Record<string, unknown>) {
    const r = await fetch(`${FW360_API_BASE}/customers/registration`, {
      method: "POST",
      headers: {
        "X-Fw360-Key": opts.fwKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  }

  let lastRaw: any = null;
  for (const body of [jsonPrimary, jsonMinimal]) {
    const res = await callRegistrationJson(body);
    lastRaw = res.data;
    const id = extractFwCustomerId(res.data);
    const fwErr =
      res.data &&
      typeof res.data === "object" &&
      (res.data as { status?: unknown }).status === 0;
    if (res.ok && id && !fwErr) {
      return { customerId: id, raw: res.data };
    }
  }

  return { customerId: "", raw: lastRaw };
}

/** Esito chiamata FW360 (non serve far fallire l’invio se la cronologia va giù). */
async function fwPostForm(
  label: string,
  url: string,
  fwKey: string,
  body: URLSearchParams
): Promise<{ ok: boolean; status: number; snippet: string }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "X-Fw360-Key": fwKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text().catch(() => "");
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 280);
    if (!r.ok) {
      console.error(`FW360 ${label} HTTP error`, {
        status: r.status,
        snippet,
      });
    }
    return { ok: r.ok, status: r.status, snippet };
  } catch (e) {
    console.error(`FW360 ${label} request failed`, { error: e });
    return {
      ok: false,
      status: 0,
      snippet: e instanceof Error ? e.message.slice(0, 200) : "network error",
    };
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  let parsed: { quoteId: string };
  try {
    parsed = SendQuoteSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(badRequestFromZod(e), { status: 400 });
    }
    return NextResponse.json({ error: "Payload non leggibile" }, { status: 400 });
  }
  const quoteId = parsed.quoteId;

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
      totalOneTime: true,
      status: true,
      crmCustomerId: true,
    },
  });

  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  if (session.user.role !== "admin" && quote.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  // Stati inviabili: bozza canonica o legacy "pending" (PATCH permette ancora l’edit).
  const canSend = quote.status === "draft" || quote.status === "pending";
  if (!canSend) {
    return NextResponse.json({ error: "Preventivo già inviato" }, { status: 400 });
  }
  if (!quote.clientEmail || !quote.clientEmail.trim()) {
    return NextResponse.json({ error: "Email cliente mancante" }, { status: 400 });
  }

  // Stesso valore di "Documentazione API - CRM": in .env spesso è salvato come CRM_API_KEY.
  const fwKey = process.env.FW360_API_KEY || process.env.CRM_API_KEY;
  if (!fwKey) {
    return NextResponse.json(
      { error: "Chiave API CRM mancante: imposta FW360_API_KEY o CRM_API_KEY" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL mancante" }, { status: 500 });
  }

  // Step 2 — Cliente FW360: se già legato al CRM, salta la registration
  const existingCrm = (quote.crmCustomerId || "").trim();
  let customerId = existingCrm;
  let registrationRaw: any = null;

  if (!customerId) {
    const person = deriveFwNomeCognomeRagioneSociale({
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      clientEmail: quote.clientEmail,
    });
    const reg = await fwRegisterOrGetCustomerId({
      fwKey,
      nome: person.nome,
      cognome: person.cognome,
      ragione_sociale: person.ragione_sociale,
      email: quote.clientEmail.trim(),
      phone: quote.clientPhone,
    });
    customerId = reg.customerId;
    registrationRaw = reg.raw;
  }

  if (!customerId) {
    console.error("FW360 registration failed", {
      body: registrationRaw,
      quoteId: quote.id,
    });
    const msg =
      registrationRaw?.message ||
      registrationRaw?.error ||
      registrationRaw?.data?.message;
    return NextResponse.json(
      {
        error: msg ? `Framework360: ${msg}` : "Errore Framework360 (registrazione cliente)",
      },
      { status: 502 }
    );
  }

  // Step 3 — Blocca il preventivo SOLO se FW360 è ok
  const now = new Date();
  const locked = await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: "sent",
      sentAt: now,
      expiresAt: addDays(now, 30),
      crmCustomerId: customerId,
      publicPdfToken: publicPdfToken(),
    },
    select: { id: true },
  });

  // Step 4 — Crea voce cronologia in Framework360
  const tokenRow = await prisma.quote.findUnique({
    where: { id: locked.id },
    select: { publicPdfToken: true },
  });
  const t = tokenRow?.publicPdfToken || "";
  const baseApp = appUrl.replace(/\/$/, "");
  const pdfUrl = `${baseApp}/api/public/pdf/${quote.quoteNumber}${t ? `?t=${encodeURIComponent(t)}` : ""}`;

  const crmWarnings: string[] = [];

  const historyRes = await fwPostForm(
    "history/create",
    `${FW360_API_BASE}/customers/history/create`,
    fwKey,
    new URLSearchParams({
      customer_id: customerId,
      title:
        "Preventivo " +
        quote.quoteNumber +
        " " +
        escapeHtml(String(quote.clientCompany || quote.clientName || "")),
      content: "Preventivo inviato. <a href=\"" + pdfUrl + "\" target=\"_blank\">Apri PDF</a>",
      date: new Date().toISOString().split("T")[0],
    })
  );
  if (!historyRes.ok) {
    crmWarnings.push(
      `Cronologia contatto: errore HTTP ${historyRes.status || "?"}${historyRes.snippet ? ` — ${historyRes.snippet}` : ""}`
    );
  }

  const updateRes = await fwPostForm(
    "customers/update",
    `${FW360_API_BASE}/customers/update`,
    fwKey,
    new URLSearchParams({
      customer_id: customerId,
      "extraFields[ultimo_preventivo_url]": pdfUrl,
      "extraFields[ultimo_preventivo_numero]": quote.quoteNumber,
      "extraFields[ultimo_preventivo_importo]": String(quote.totalAnnual || quote.totalOneTime),
    })
  );
  if (!updateRes.ok) {
    crmWarnings.push(
      `Aggiornamento extraFields cliente: errore HTTP ${updateRes.status || "?"}${updateRes.snippet ? ` — ${updateRes.snippet}` : ""}`
    );
  }

  // Step 6 — Response (il preventivo è già "sent"; avvisi CRM sono informativi)
  return NextResponse.json({
    success: true,
    status: "sent",
    ...(crmWarnings.length ? { crmWarnings } : {}),
  });
}
