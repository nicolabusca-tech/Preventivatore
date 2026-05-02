import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/crm/customers/search?q=...
 *
 * Cerca clienti nel CRM Metodo Cantiere via API.
 * Endpoint upstream: POST https://metodocantiere.it/m/api/customers/search
 *
 * La chiave API NON viene mai esposta al frontend - resta nel .env del server.
 * Solo utenti autenticati possono usare questa rotta.
 */
export async function GET(request: NextRequest) {
  // Auth check: solo utenti loggati
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  // Niente ricerca con stringa troppo corta (evita carico inutile sul CRM)
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.CRM_API_KEY || process.env.FW360_API_KEY;
  const apiBase = process.env.CRM_API_BASE || "https://metodocantiere.it/m/api";

  if (!apiKey) {
    console.error("CRM_API_KEY / FW360_API_KEY non configurata in .env");
    return NextResponse.json(
      { error: "Configurazione CRM mancante. Contatta l'amministratore." },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${apiBase}/customers/search`, {
      method: "POST",
      headers: {
        "X-Fw360-Key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ query }),
      // Timeout via AbortController
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Errore CRM: HTTP ${upstream.status}` },
        { status: 502 }
      );
    }

    const raw = await upstream.json();

    // Il CRM restituisce { status: 0, error: "..." } in caso di errore (HTTP 200)
    if (raw.status === 0) {
      console.error("CRM error:", raw);
      return NextResponse.json(
        { error: raw.error || "Errore sconosciuto dal CRM" },
        { status: 502 }
      );
    }

    const customers = Array.isArray(raw.data) ? raw.data : [];

    // Mappiamo solo i campi che ci servono, niente bloat in risposta
    const results = customers.map((c: any) => {
      const fatt = c.dati_fatturazione || {};

      // Indirizzo: priorità a dati_fatturazione, fallback a livello principale.
      // ATTENZIONE: nel CRM Metodo Cantiere il campo "citta" contiene la sigla
      // provincia (es. "BG"), mentre la città vera (comune) sta in "comune".
      const addr = sanitize(fatt.indirizzo) || sanitize(c.indirizzo);
      const cap = sanitize(fatt.cap) || sanitize(c.cap);
      const city = sanitize(fatt.comune) || sanitize(c.comune);
      const province = sanitize(fatt.citta) || sanitize(c.citta);

      return {
        crmId: String(c.id ?? ""),
        firstName: sanitize(c.nome),
        lastName: sanitize(c.cognome),
        fullName: sanitize(c.formatted_name) || `${sanitize(c.nome)} ${sanitize(c.cognome)}`.trim(),
        company: sanitize(fatt.ragione_sociale),
        email: sanitize(c.email) || sanitize(fatt.email),
        phone:
          sanitize(c.telefono_cellulare) ||
          sanitize(c.telefono_casa) ||
          sanitize(fatt.cellulare),
        address: addr,
        postalCode: cap,
        city: city,
        province: province,
        vat: sanitize(fatt.piva),
        sdi: sanitize(fatt.cod_univoco),
      };
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Errore chiamata CRM:", err);
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json(
        { error: "Il CRM non risponde (timeout). Riprova tra qualche secondo." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Errore di connessione al CRM" },
      { status: 502 }
    );
  }
}

/** Pulisce i valori del CRM: tratta "None", null, undefined come stringa vuota. */
function sanitize(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s === "" || s === "None" || s === "null" || s === "undefined") return "";
  return s;
}
