-- Consegna prevista + default acconto setup; tipo rata pagamento
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "deliveryExpectedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "depositPercent" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "QuotePayment" ADD COLUMN IF NOT EXISTS "kind" TEXT;
