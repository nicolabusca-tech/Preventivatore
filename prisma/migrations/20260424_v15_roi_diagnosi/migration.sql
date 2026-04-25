-- v1.5 — Diagnosi & ROI: campi su Quote, peso diagnosi su Product, tabella RoiConfig
-- Data: 2026-04-24

-- Config defaults form ROI (riga unica)
CREATE TABLE "RoiConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defaultPreventiviMese" REAL NOT NULL DEFAULT 4,
    "defaultImportoMedio" REAL NOT NULL DEFAULT 5000,
    "defaultConversione" REAL NOT NULL DEFAULT 25,
    "defaultMargine" REAL NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "RoiConfig" ("id", "defaultPreventiviMese", "defaultImportoMedio", "defaultConversione", "defaultMargine", "createdAt", "updatedAt")
VALUES ('singleton', 4, 5000, 25, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Peso diagnosi su listino (0–100)
ALTER TABLE "Product" ADD COLUMN "diagnosiPeso" REAL NOT NULL DEFAULT 0;

-- Campi commessa / snapshot preventivo
ALTER TABLE "Quote" ADD COLUMN "originCliente" TEXT;
ALTER TABLE "Quote" ADD COLUMN "estrattoDiagnosi" TEXT;
ALTER TABLE "Quote" ADD COLUMN "roiPreventiviMese" REAL;
ALTER TABLE "Quote" ADD COLUMN "roiImportoMedio" REAL;
ALTER TABLE "Quote" ADD COLUMN "roiConversioneAttuale" REAL;
ALTER TABLE "Quote" ADD COLUMN "roiMargineCommessa" REAL;
ALTER TABLE "Quote" ADD COLUMN "roiSnapshot" TEXT;
