-- Migrazione: assicura presenza di publicPdfToken su Quote (PDF pubblico / token link)
-- Data: 2026-04-30
--
-- Motivo: alcuni DB Neon risultano aggiornati parzialmente rispetto allo schema Prisma.
-- Questa migrazione è idempotente.

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "publicPdfToken" TEXT;
