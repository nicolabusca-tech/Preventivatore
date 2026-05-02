-- Step: Quote.creditoMcEnabled
--
-- Aggiunge un flag booleano per attivare/disattivare il Credito Metodo Cantiere
-- per il singolo preventivo. Usato come leva commerciale: il commerciale
-- decide caso per caso se applicare o no il 10% di credito sul setup come
-- bonus di trattativa, ad esempio quando il cliente percepisce il prezzo
-- eccessivo.
--
-- Pattern split (add nullable -> backfill -> set not null -> set default) per
-- minimizzare i rischi di lock estesi su tabelle con dati esistenti. Equivale
-- a una singola ADD COLUMN ... NOT NULL DEFAULT, ma e' piu' tollerante al
-- comportamento di prisma migrate deploy su Postgres managed (Supabase, Neon).

-- 1) Aggiungo la colonna nullable. Operazione metadata-only, instantanea.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "creditoMcEnabled" BOOLEAN;

-- 2) Backfill: tutti i preventivi gia' esistenti restano col credito attivo
--    come comportamento attuale (retro-compatibilita').
UPDATE "Quote" SET "creditoMcEnabled" = true WHERE "creditoMcEnabled" IS NULL;

-- 3) Adesso che nessuna riga e' NULL, posso rendere la colonna NOT NULL.
ALTER TABLE "Quote" ALTER COLUMN "creditoMcEnabled" SET NOT NULL;

-- 4) Default 'true' per le nuove righe non specificate. NOTA: i nuovi
--    preventivi creati dall'editor passano esplicitamente false dal client,
--    quindi il default DB scatta solo per inserimenti di backfill / script.
ALTER TABLE "Quote" ALTER COLUMN "creditoMcEnabled" SET DEFAULT true;
