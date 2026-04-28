import { prisma } from "@/lib/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __mc_quote_schema_ensured: boolean | undefined;
}

/**
 * Hotfix runtime: ensure the production DB has new Quote columns.
 * This makes deploys resilient when migrations weren't applied.
 */
export async function ensureQuoteSchema() {
  // Disabled by default: running ALTER TABLE at runtime is risky and noisy.
  // Enable only as an emergency hotfix (e.g. MC_ENABLE_SCHEMA_HOTFIX=1).
  if (process.env.MC_ENABLE_SCHEMA_HOTFIX !== "1") return;

  if (globalThis.__mc_quote_schema_ensured) return;

  try {
    // Prisma non supporta multi-statement in executeRawUnsafe su Postgres (prepared statement).
    // Eseguiamo i comandi uno per uno.
    const stmts = [
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3)`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3)`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientAddress" TEXT`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientPostalCode" TEXT`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientCity" TEXT`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientProvince" TEXT`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "publicPdfToken" TEXT`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scontoAiVocaleAnnuale" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scontoWaAnnuale" BOOLEAN DEFAULT FALSE`,
      `UPDATE "Quote"
       SET "status" = CASE
         WHEN "status" IN ('pending') THEN 'draft'
         WHEN "status" IN ('inviato') THEN 'sent'
         WHEN "status" IN ('accettato') THEN 'viewed'
         WHEN "status" IN ('rifiutato') THEN 'draft'
         WHEN "status" IN ('scaduto') THEN 'sent'
         ELSE "status"
       END
       WHERE "status" IN ('pending','inviato','accettato','rifiutato','scaduto')`,
    ];

    for (const stmt of stmts) {
      await prisma.$executeRawUnsafe(stmt);
    }

    globalThis.__mc_quote_schema_ensured = true;
  } catch (e) {
    // Non bloccare: se manca permesso o altro, la request fallirà comunque con errore Prisma.
    console.error("ensureQuoteSchema failed", e);
  }
}

