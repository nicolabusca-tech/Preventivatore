-- Migrazione: costi listino, snapshot costi preventivo, margini, pipeline e pagamenti
-- Data: 2026-04-30
--
-- Obiettivi:
-- - Aggiungere ProductCost (costi tabellabili per prodotto)
-- - Aggiungere QuoteItemCost (snapshot costi per riga preventivo)
-- - Aggiungere QuotePayment (piano pagamenti / incassi)
-- - Aggiungere campi aggregati costo/margine e pipeline su Quote
--
-- NOTE:
-- - Migrazione idempotente: IF NOT EXISTS dove possibile
-- - Campi nuovi con DEFAULT per non rompere record esistenti

-- =========================
-- Quote: campi costo/margine
-- =========================
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "costSetup" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "costMonthly" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "costAnnual" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "marginAnnual" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "marginPercentAnnual" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- =========================
-- Quote: pipeline commerciale/operativa
-- =========================
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "salesStage" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "deliveryStage" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMPTZ;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "kickoffAt" TIMESTAMPTZ;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ;

-- =========================
-- ProductCost
-- =========================
CREATE TABLE IF NOT EXISTS "ProductCost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unitCostCents" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "multiplierKind" TEXT NOT NULL DEFAULT 'FIXED',
  "multiplierValue" DOUBLE PRECISION,
  "conditionsJson" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ProductCost_productId_idx'
  ) THEN
    CREATE INDEX "ProductCost_productId_idx" ON "ProductCost"("productId");
  END IF;
END $$;

-- =========================
-- QuoteItemCost
-- =========================
CREATE TABLE IF NOT EXISTS "QuoteItemCost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteItemId" TEXT NOT NULL,
  "productCostId" TEXT,
  "name" TEXT NOT NULL,
  "unitCostCents" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "lineCostCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'QuoteItemCost_quoteItemId_idx'
  ) THEN
    CREATE INDEX "QuoteItemCost_quoteItemId_idx" ON "QuoteItemCost"("quoteItemId");
  END IF;
END $$;

-- =========================
-- QuotePayment
-- =========================
CREATE TABLE IF NOT EXISTS "QuotePayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "dueDate" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "method" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'QuotePayment_quoteId_idx'
  ) THEN
    CREATE INDEX "QuotePayment_quoteId_idx" ON "QuotePayment"("quoteId");
  END IF;
END $$;

-- =========================
-- Foreign keys (safe add)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductCost_productId_fkey'
  ) THEN
    ALTER TABLE "ProductCost"
      ADD CONSTRAINT "ProductCost_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteItemCost_quoteItemId_fkey'
  ) THEN
    ALTER TABLE "QuoteItemCost"
      ADD CONSTRAINT "QuoteItemCost_quoteItemId_fkey"
      FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuotePayment_quoteId_fkey'
  ) THEN
    ALTER TABLE "QuotePayment"
      ADD CONSTRAINT "QuotePayment_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

