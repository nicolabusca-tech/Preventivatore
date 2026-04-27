-- Migrazione: aggiunge campi indirizzo + flag pagamento annuale anticipato per categoria al modello Quote
-- Data: 2026-04-24
-- Versione: v1.4 (B3)
--
-- Tutti i campi sono NULLABLE (o con DEFAULT) quindi i preventivi esistenti restano validi.
-- Nessun rischio di perdita dati.

-- Indirizzo cliente
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientAddress" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientPostalCode" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientCity" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "clientProvince" TEXT;

-- Pagamento annuale anticipato per categoria di canone
-- (CRM esiste già come scontoCrmAnnuale)
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scontoAiVocaleAnnuale" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scontoWaAnnuale" BOOLEAN DEFAULT FALSE;
