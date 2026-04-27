-- Baseline migration (idempotent) for existing Neon DB.
-- This project DB appears to pre-exist Prisma Migrate history; we create the core tables
-- with IF NOT EXISTS so applying to an already-provisioned DB is a no-op, while the
-- shadow database can be built cleanly during `prisma migrate dev`.

-- User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'commerciale',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_email_key'
  ) THEN
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
  END IF;
END $$;

-- Product
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "block" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "positioning" TEXT NOT NULL,
  "includes" TEXT NOT NULL,
  "objection" TEXT,
  "response" TEXT,
  "price" INTEGER NOT NULL,
  "priceLabel" TEXT,
  "isMonthly" BOOLEAN NOT NULL DEFAULT FALSE,
  "isRecurring" BOOLEAN NOT NULL DEFAULT FALSE,
  "prerequisites" TEXT,
  "bundleItems" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "diagnosiPeso" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Product_code_key'
  ) THEN
    CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
  END IF;
END $$;

-- RoiConfig (singleton row expected)
CREATE TABLE IF NOT EXISTS "RoiConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "defaultPreventiviMese" DOUBLE PRECISION NOT NULL DEFAULT 4,
  "defaultImportoMedio" DOUBLE PRECISION NOT NULL DEFAULT 5000,
  "defaultConversione" DOUBLE PRECISION NOT NULL DEFAULT 25,
  "defaultMargine" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quote
CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteNumber" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dceProductId" TEXT,
  "clientName" TEXT NOT NULL,
  "clientCompany" TEXT,
  "clientEmail" TEXT,
  "clientPhone" TEXT,
  "clientNotes" TEXT,
  "crmCustomerId" TEXT,
  "clientAddress" TEXT,
  "clientPostalCode" TEXT,
  "clientCity" TEXT,
  "clientProvince" TEXT,
  "originCliente" TEXT,
  "estrattoDiagnosi" TEXT,
  "diagnosiGiaPagata" BOOLEAN NOT NULL DEFAULT TRUE,
  "roiPreventiviMese" DOUBLE PRECISION,
  "roiImportoMedio" DOUBLE PRECISION,
  "roiConversioneAttuale" DOUBLE PRECISION,
  "roiMargineCommessa" DOUBLE PRECISION,
  "roiSnapshot" TEXT,
  "clientVat" TEXT,
  "clientSdi" TEXT,
  "totalSetup" INTEGER NOT NULL,
  "totalMonthly" INTEGER NOT NULL,
  "totalAnnual" INTEGER NOT NULL,
  "setupBeforeDiscount" INTEGER NOT NULL DEFAULT 0,
  "discountType" TEXT,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "discountCode" TEXT,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  "scontoCrmAnnuale" BOOLEAN NOT NULL DEFAULT TRUE,
  "scontoAiVocaleAnnuale" BOOLEAN NOT NULL DEFAULT FALSE,
  "scontoWaAnnuale" BOOLEAN NOT NULL DEFAULT FALSE,
  "voucherAuditApplied" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Quote_quoteNumber_key'
  ) THEN
    CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
  END IF;
END $$;

-- QuoteItem
CREATE TABLE IF NOT EXISTS "QuoteItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "isMonthly" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DiscountCode
CREATE TABLE IF NOT EXISTS "DiscountCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'DiscountCode_code_key'
  ) THEN
    CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
  END IF;
END $$;

-- Foreign keys (safe add: only if constraint missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Quote_userId_fkey'
  ) THEN
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Quote_dceProductId_fkey'
  ) THEN
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_dceProductId_fkey"
      FOREIGN KEY ("dceProductId") REFERENCES "Product"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteItem_quoteId_fkey'
  ) THEN
    ALTER TABLE "QuoteItem"
      ADD CONSTRAINT "QuoteItem_quoteId_fkey"
      FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

