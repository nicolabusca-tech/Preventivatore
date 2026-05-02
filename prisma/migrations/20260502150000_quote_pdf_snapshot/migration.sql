-- Snapshot del PDF al momento dell'invio: rende il preventivo inviato
-- immutabile per il cliente, indipendente da modifiche future al listino o
-- al template.

CREATE TABLE IF NOT EXISTS "QuotePdfSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL,
  "pdfData" BYTEA NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "QuotePdfSnapshot_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuotePdfSnapshot_quoteId_key" ON "QuotePdfSnapshot" ("quoteId");
