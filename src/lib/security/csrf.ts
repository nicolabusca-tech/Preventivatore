function isSafeMethod(method: string) {
  const m = (method || "").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function sameOrigin(origin: string, allowed: string) {
  try {
    const a = new URL(origin);
    const b = new URL(allowed);
    return a.protocol === b.protocol && a.host === b.host;
  } catch {
    return false;
  }
}

/**
 * CSRF hardening "compatibile":
 * - Se l'header Origin è presente, deve matchare l'origine dell'app.
 * - Se Origin manca, non blocchiamo (per non rompere chiamate server-to-server/CLI).
 */
export function assertCsrf(req: Request) {
  if (isSafeMethod(req.method)) return;

  const origin = req.headers.get("origin");
  if (!origin) return;

  const allowed =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "";

  // VERCEL_URL può essere solo host: normalizziamo.
  const allowedUrl =
    allowed && !allowed.startsWith("http") ? `https://${allowed}` : allowed;

  if (!allowedUrl || !sameOrigin(origin, allowedUrl)) {
    throw new Error("CSRF_BLOCKED");
  }
}

