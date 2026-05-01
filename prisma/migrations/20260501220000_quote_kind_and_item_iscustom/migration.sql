-- Step 3: Quote.kind + QuoteItem.isCustom
--
-- Aggiunge due campi che esprimono in modo esplicito (e non piu' tramite il
-- prefix MANUAL_ sui productCode) se un preventivo / una riga proviene dal
-- listino standard oppure e' una voce manuale.
--
-- Default scelti per essere retro-compatibili: tutti i preventivi e tutte le
-- righe esistenti sono visti come "STANDARD" / non custom finche' il backfill
-- piu' sotto non riconosce esplicitamente quelli nati come "manuali" via
-- prefix MANUAL_ (l'unico modo che avevamo prima di questa migration).

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- Backfill 1: tutte le righe storicamente create con productCode 'MANUAL_*'
-- vengono marcate come custom. Usiamo l'escape '\' per fare in modo che '_'
-- nel pattern sia un underscore letterale e non il wildcard di LIKE.
UPDATE "QuoteItem"
SET "isCustom" = true
WHERE "productCode" LIKE 'MANUAL\_%' ESCAPE '\';

-- Backfill 2: i preventivi i cui items sono TUTTI custom diventano kind='MANUAL'.
-- (I preventivi misti, anche se in teoria possibili dopo questa migration,
-- restano kind='STANDARD' per sicurezza: il modello attuale non li produce.)
UPDATE "Quote" q
SET "kind" = 'MANUAL'
WHERE EXISTS (
        SELECT 1 FROM "QuoteItem" qi WHERE qi."quoteId" = q."id"
      )
  AND NOT EXISTS (
        SELECT 1 FROM "QuoteItem" qi
        WHERE qi."quoteId" = q."id"
          AND qi."isCustom" = false
      );
