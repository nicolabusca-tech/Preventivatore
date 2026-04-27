-- v1.5 — Diagnosi & ROI: campi su Quote, peso diagnosi su Product, tabella RoiConfig
-- Data: 2026-04-24

-- Config defaults form ROI (riga unica)
CREATE TABLE IF NOT EXISTS "RoiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defaultPreventiviMese" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "defaultImportoMedio" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "defaultConversione" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "defaultMargine" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "RoiConfig" ("id", "defaultPreventiviMese", "defaultImportoMedio", "defaultConversione", "defaultMargine", "createdAt", "updatedAt")
VALUES ('singleton', 4, 5000, 25, 20, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Peso diagnosi su listino (0–100)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "diagnosiPeso" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Campi commessa / snapshot preventivo
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "originCliente" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "estrattoDiagnosi" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "roiPreventiviMese" DOUBLE PRECISION;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "roiImportoMedio" DOUBLE PRECISION;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "roiConversioneAttuale" DOUBLE PRECISION;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "roiMargineCommessa" DOUBLE PRECISION;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "roiSnapshot" TEXT;
