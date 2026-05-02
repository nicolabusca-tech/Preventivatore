-- Step: Quote.creditoMcEnabled
--
-- Aggiunge un flag booleano per attivare/disattivare il Credito Metodo Cantiere
-- per il singolo preventivo. Usato come leva commerciale: il commerciale
-- decide caso per caso se applicare o no il 10% di credito sul setup come
-- bonus di trattativa.
--
-- NOTE storica: questa migration e' stata applicata in un primo deploy che e'
-- poi stato rolled back. Il file e' stato ricreato con statement idempotenti
-- (IF NOT EXISTS, IS NULL guard) per gestire pulitamente il caso in cui la
-- colonna esiste gia' sul DB di staging/prod ma il file era scomparso dal repo,
-- evitando il drift di prisma migrate deploy.

-- 1) Aggiungo la colonna nullable, idempotente.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "creditoMcEnabled" BOOLEAN;

-- 2) Backfill: tutti i preventivi gia' esistenti restano col credito attivo
--    come comportamento attuale (retro-compatibilita').
UPDATE "Quote" SET "creditoMcEnabled" = true WHERE "creditoMcEnabled" IS NULL;

-- 3) Adesso che nessuna riga e' NULL, posso rendere la colonna NOT NULL.
ALTER TABLE "Quote" ALTER COLUMN "creditoMcEnabled" SET NOT NULL;

-- 4) Default 'true' per le nuove righe non specificate.
ALTER TABLE "Quote" ALTER COLUMN "creditoMcEnabled" SET DEFAULT true;
