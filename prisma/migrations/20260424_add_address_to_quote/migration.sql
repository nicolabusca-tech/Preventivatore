-- Migrazione: aggiunge campi indirizzo + flag pagamento annuale anticipato per categoria al modello Quote
-- Data: 2026-04-24
-- Versione: v1.4 (B3)
--
-- Tutti i campi sono NULLABLE (o con DEFAULT) quindi i preventivi esistenti restano validi.
-- Nessun rischio di perdita dati.

-- Indirizzo cliente
ALTER TABLE "Quote" ADD COLUMN "clientAddress" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientPostalCode" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientCity" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientProvince" TEXT;

-- Pagamento annuale anticipato per categoria di canone
-- (CRM esiste già come scontoCrmAnnuale)
ALTER TABLE "Quote" ADD COLUMN "scontoAiVocaleAnnuale" BOOLEAN DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "scontoWaAnnuale" BOOLEAN DEFAULT 0;
