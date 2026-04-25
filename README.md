# Preventivatore Metodo Cantiere — v1.1 (Sessione A)

Strumento interno per la composizione di preventivi Metodo Cantiere.

## Cosa cambia rispetto alla v1.0

Questa versione **risolve i bug e aggiunge le funzionalità mancanti** segnalate da Nicola dopo il primo test.

**Bug risolti:**
- ✅ Fix sconto 20% pagamento annuale CRM: ora si applica SOLO ai canoni CRM, non agli altri canoni
- ✅ Calcolo totali corretto con separazione canoni CRM da altri canoni mensili

**Nuove funzionalità:**
- ✅ **Logica sconti volumici**: 5% sopra 3 moduli setup, 10% sopra 5 moduli setup (NON cumulati con codici manuali)
- ✅ **Suggerimento bundle automatico**: se selezioni TUTTI i moduli di un bundle separati, il sistema te lo segnala e ti propone di sostituirli col bundle
- ✅ **Voucher Audit Lampo**: se cliente seleziona Audit Lampo + Diagnosi Strategica, i €147 dell'Audit vengono automaticamente scalati dalla Diagnosi
- ✅ **Codici sconto manuali**: pannello admin per creare codici tipo "AMICO-15", "EARLY-10", "EVENTO-20". Il commerciale li applica durante la composizione preventivo
- ✅ **Dati fiscali cliente**: aggiunti P.IVA e codice univoco SDI (sezione collassabile per non appesantire l'interfaccia)

**3 codici sconto di esempio già pronti:**
- `AMICO-15` — Sconto 15% per amici/conoscenze
- `EARLY-10` — Sconto 10% early adopter (max 20 utilizzi)
- `EVENTO-20` — Sconto 20% post-evento

## Cosa NON è ancora pronto (Sessione B e C)

- 🔜 **Sessione B**: rifacimento grafica completo con design coerente preventivatore v2 + modalità "presentazione cliente" per screen-share
- 🔜 **Sessione C (Step 2 originale)**: generazione PDF 10-15 pagine
- 🔜 **Successivamente**: integrazione CRM live + email automatica + deploy Vercel

---

## Come applicare l'aggiornamento sul tuo Mac

Hai già installato la v1.0. Per aggiornare alla v1.1, devi sostituire i file modificati e rilanciare il database.

### Strada veloce con Cowork

Carica questo nuovo ZIP su Cowork e dagli questa istruzione:

```
Devo aggiornare un'applicazione Next.js esistente sul mio Mac.
La cartella attuale è "preventivatore" nella mia cartella Documenti.

Per favore esegui questi passi:

1. Ferma il server Next.js se è in esecuzione (Cmd+C nel terminale dove gira)

2. Estrai il nuovo file ZIP "preventivatore-metodo-cantiere-v1.1.zip"
   in una cartella temporanea

3. Sostituisci i file della cartella esistente "preventivatore"
   con quelli della nuova versione, MANTENENDO il file .env esistente
   (che contiene le mie credenziali) e MANTENENDO il file
   prisma/dev.db (che contiene i dati esistenti).
   
   Più semplicemente: copia tutti i file NUOVI sopra ai vecchi
   tranne .env e prisma/dev.db

4. Vai dentro la cartella e lancia:
   - npm install (per installare eventuali nuove dipendenze)
   - npx prisma db push (per aggiornare lo schema database con i nuovi campi)
   - npm run db:seed (per ricaricare il listino e creare i codici sconto di esempio)
   
   ATTENZIONE: il seed CANCELLA tutti i preventivi esistenti.
   Se hai preventivi importanti da non perdere, fammelo sapere PRIMA di lanciare db:seed.

5. Rilancia il server: npm run dev

6. Apri http://localhost:3000

Mostrami a video cosa succede e fammi sapere se ci sono errori.
```

### Strada manuale (se non vuoi Cowork)

Apri il Terminale, vai nella cartella `preventivatore`, e lancia:

```bash
# 1. Backup database (se hai preventivi da salvare)
cp prisma/dev.db prisma/dev.db.backup

# 2. Installa nuove dipendenze
npm install

# 3. Aggiorna schema database (aggiunge campi P.IVA, SDI, sconti, ecc.)
npx prisma db push

# 4. Re-popola listino + codici sconto (ATTENZIONE: cancella i preventivi esistenti)
npm run db:seed

# 5. Avvia server
npm run dev
```

Apri http://localhost:3000

---

## Cosa testare nella v1.1

**1. Bug sconto annuale CRM**
- Crea un preventivo con un canone CRM (es. 5 licenze a €79/mese) + un canone WhatsApp (es. €79/mese)
- Verifica che lo sconto 20% si applichi SOLO ai €79 del CRM, NON ai €79 di WhatsApp
- Calcolo annuale atteso: CRM €79 × 12 × 0.8 = €758, WhatsApp €79 × 12 = €948

**2. Sconti volumici**
- Crea un preventivo con 3 moduli setup → vedi badge "Sconto volume 5% (3+ moduli)"
- Aggiungi un 4° modulo setup → continua a vedere -5%
- Aggiungi un 5° modulo setup → vedi "Sconto volume 10% (5+ moduli)"

**3. Suggerimento bundle**
- Vai sul Blocco 03 e seleziona m0301 (Landing) + m0302 (Form filtrante) + m0303 (ADS Meta) + m0304 (ADS Google) + m0306 (Scoring lead)
- In alto deve comparire un alert verde "💡 Suggerimento bundle disponibile" con il "Bundle Acquisizione completa" a €2.997 e il pulsante "Usa bundle"
- Clicca "Usa bundle" → i 5 moduli singoli vengono sostituiti dal bundle

**4. Voucher Audit Lampo**
- Seleziona AUDIT_LAMPO (€147) + DIAGNOSI_STRATEGICA (€497)
- Nel riepilogo vedi la voce "Voucher Audit Lampo -€147" automaticamente scalata
- Setup totale: €147 + €497 - €147 = €497 (paga solo la Diagnosi)

**5. Codice sconto manuale**
- Vai nel riepilogo a destra, scrivi "AMICO-15" nel campo "Codice sconto" e clicca "Applica"
- Vedi -15% applicato sul setup
- Lo sconto codice manuale SOSTITUISCE l'eventuale sconto volume (sono mutuamente esclusivi)

**6. Dati fiscali**
- Nei dati cliente, clicca "+ Dati di fatturazione (P.IVA, codice SDI)"
- Inserisci P.IVA + codice SDI
- Salva preventivo, vai sul dettaglio: i dati fiscali compaiono nella sezione cliente

**7. Pannello admin codici sconto**
- Da admin, vai su "Codici sconto"
- Vedi i 3 codici di esempio
- Crea un nuovo codice (es. "TEST-25" per -25%)
- Disattiva un codice esistente
- Verifica che disattivato non funzioni più nel preventivatore

---

## File aggiornati in v1.1

```
prisma/schema.prisma                 — aggiunti campi P.IVA/SDI/sconti/voucher + modello DiscountCode
prisma/seed.ts                       — aggiunti 3 codici sconto di esempio
src/lib/discounts.ts                 — NUOVO: libreria centralizzata calcolo sconti
src/app/api/quotes/create/route.ts   — accetta nuovi campi
src/app/api/discount-codes/...       — NUOVE API gestione codici sconto
src/app/(authenticated)/preventivi/nuovo/page.tsx     — riscritta con nuova logica
src/app/(authenticated)/preventivi/[id]/page.tsx      — mostra sconti applicati e dati fiscali
src/app/(authenticated)/admin/codici-sconto/page.tsx  — NUOVA: gestione codici
src/components/Navbar.tsx            — aggiunto link "Codici sconto"
```

---

## Domande / problemi

Se trovi bug o vuoi modifiche, fammi uno screenshot e dimmi cosa hai cliccato per arrivare al problema. Continuo a iterare nelle sessioni successive.

Creato per Metodo Cantiere® — Dal contatto al contratto, passo passo.
