-- Migrazione: righe extra interne (ricavi/costi) per analisi
-- Data: 2026-04-30
--
-- Aggiunge tabella QuoteAdjustment collegata a Quote, usata solo per dashboard/analisi.

CREATE TABLE IF NOT EXISTS "QuoteAdjustment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'ONE_TIME',
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'QuoteAdjustment_quoteId_idx'
  ) THEN
    CREATE INDEX "QuoteAdjustment_quoteId_idx" ON "QuoteAdjustment"("quoteId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteAdjustment_quoteId_fkey'
  ) THEN
    ALTER TABLE "QuoteAdjustment"
      ADD CONSTRAINT "QuoteAdjustment_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

