-- Step: Quote.creditoMcEnabled
--
-- Aggiunge un flag booleano per attivare/disattivare il Credito Metodo Cantiere
-- per il singolo preventivo. Usato come leva commerciale: il commerciale
-- decide caso per caso se applicare o no il 10% di credito sul setup netto.
--
-- Default a livello DB = true cosi' i preventivi gia' esistenti (creati prima
-- di questa modifica) mantengono il credito attivo, identico al comportamento
-- attuale. Il default lato UI (QuoteEditor) e' invece false: i NUOVI preventivi
-- nascono col credito spento e il commerciale lo accende quando serve.

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "creditoMcEnabled" BOOLEAN NOT NULL DEFAULT true;
