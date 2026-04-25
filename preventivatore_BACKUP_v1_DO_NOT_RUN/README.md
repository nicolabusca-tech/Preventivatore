# Preventivatore Metodo Cantiere

Strumento interno per la composizione di preventivi Metodo Cantiere. Uso esclusivo team commerciale (Nicola, Cristina, commerciali futuri).

## Cosa fa questa versione (Step 1A)

- ✅ Autenticazione email + password con ruoli (admin / commerciale)
- ✅ Composizione preventivi con listino completo Metodo Cantiere (58 voci tra prodotti, bundle, canoni)
- ✅ Calcolo totali in tempo reale (setup + canoni mensili + annuale)
- ✅ Sconto 20% pagamento annuale CRM applicato automaticamente
- ✅ Dashboard elenco preventivi con filtri, stati, alert scadenze
- ✅ Gestione stato preventivo (pending → inviato → accettato/rifiutato)
- ✅ Pannello admin: gestione utenti (crea, disattiva, reset password)
- ✅ Pannello admin: gestione listino (modifica prezzi, copy, obiezioni, attiva/disattiva prodotti)
- ✅ Statistiche base nella dashboard (totale preventivi, acquisiti, valore acquisito, in scadenza)

## Cosa arriva negli step successivi

- **Step 2**: generazione PDF 10-15 pagine con copy completo e obiezioni
- **Step 3**: integrazione CRM Metodo Cantiere (ricerca e salvataggio cliente) + invio automatico email al cliente con Resend + deploy su Vercel

---

## Come avviare il progetto sul tuo Mac

### 1. Prerequisiti

Assicurati di avere installato **Node.js 18 o superiore**. Verifica con:

```bash
node --version
```

Se non lo hai, scaricalo da https://nodejs.org (versione LTS consigliata).

### 2. Installazione delle dipendenze

Apri il Terminale, posizionati nella cartella del progetto (quella che contiene il file `package.json`) e lancia:

```bash
npm install
```

Questa operazione impiega 1-3 minuti: scarica tutte le librerie necessarie (Next.js, Prisma, NextAuth, ecc.).

### 3. Inizializzazione del database

Il database locale è un file SQLite (nessuna installazione extra richiesta). Lancia:

```bash
npx prisma db push
```

Questo crea il file `prisma/dev.db` con tutte le tabelle necessarie.

### 4. Popolamento del listino

Lancia il seed, che inserisce tutti i prodotti, bundle, canoni del listino Metodo Cantiere + l'utente admin:

```bash
npm run db:seed
```

Alla fine vedrai a video:

```
✓ 58 prodotti inseriti.
✓ Utente admin creato: nicola@metodocantiere.com
  Password: MetodoCantiere2026!
✓ Utente Cristina creato: cristina@metodocantiere.com
  Password: Cristina2026!
```

### 5. Avvio del server di sviluppo

```bash
npm run dev
```

Apri il browser su http://localhost:3000

Verrai reindirizzato alla pagina di login. Accedi con:

- **Nicola (admin)**: `nicola@metodocantiere.com` / `MetodoCantiere2026!`
- **Cristina (commerciale)**: `cristina@metodocantiere.com` / `Cristina2026!`

**IMPORTANTE**: al primo accesso, vai in "Utenti" e cambia le password di default usando il pulsante "Reset password".

---

## Struttura del progetto

```
preventivatore/
├── prisma/
│   ├── schema.prisma       # Schema del database
│   └── seed.ts             # Script che popola il listino
├── src/
│   ├── app/
│   │   ├── (authenticated)/    # Pagine protette da login
│   │   │   ├── admin/
│   │   │   │   ├── listino/    # Gestione prezzi
│   │   │   │   └── utenti/     # Gestione utenti
│   │   │   ├── preventivi/
│   │   │   │   ├── [id]/       # Dettaglio preventivo
│   │   │   │   ├── nuovo/      # Composizione preventivo
│   │   │   │   └── page.tsx    # Elenco preventivi
│   │   │   └── layout.tsx      # Layout con navbar
│   │   ├── api/                # API routes (backend)
│   │   ├── login/              # Pagina login
│   │   ├── globals.css         # Design system CSS
│   │   └── layout.tsx
│   ├── components/
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── auth.ts             # Config NextAuth
│   │   └── prisma.ts           # Client Prisma
│   ├── types/
│   │   └── next-auth.d.ts      # Type extensions
│   └── middleware.ts           # Protezione pagine
├── .env                        # Variabili d'ambiente (non committare!)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Cosa puoi testare ora

1. **Login** con l'account admin, vedi la pagina "I miei preventivi" (vuota all'inizio)
2. **Crea un nuovo preventivo** cliccando "+ Nuovo preventivo":
   - Compila i dati cliente
   - Espandi i blocchi del listino (clicca su "+")
   - Seleziona le voci con il checkbox
   - Guarda il totale aggiornarsi nella colonna destra
   - Clicca "Mostra dettagli" su qualsiasi prodotto per vedere il copy completo e l'obiezione con risposta
   - Salva il preventivo
3. **Dashboard**: torna a "I miei preventivi", vedi il preventivo creato con importo e data scadenza
4. **Dettaglio preventivo**: clicca sul numero preventivo per vedere il dettaglio, cambiare stato, eliminare
5. **Gestione listino** (admin): vai su "Gestione listino", espandi un blocco, modifica un prezzo o una obiezione
6. **Gestione utenti** (admin): aggiungi un nuovo commerciale o disattiva un utente

---

## Design system

Il design segue le linee guida Metodo Cantiere:

- **Colori**: arancione `#FF6A00` come accento, nero `#1A1A1A` per testo, beige `#FAF8F4` per sfondi
- **Font**: Plus Jakarta Sans (corpo), Playfair Display (heading), IBM Plex Mono (codici)
- **Identità**: tagline "Dal contatto al contratto, passo passo."

---

## Domande frequenti

**D: Il database è un file locale, posso perderlo?**
R: Il file `prisma/dev.db` contiene tutti i dati. Se lo cancelli, perdi tutto. In produzione (Step 3) useremo un database Postgres hosted su Vercel che ha backup automatici.

**D: Come cambio la mia password?**
R: Per ora solo l'admin può resettare le password (dalla pagina "Utenti" → "Reset password"). Nello Step 2 aggiungeremo la funzione "Cambia password" nel profilo personale.

**D: Posso usare il preventivatore su un iPad durante la call?**
R: Sì, l'interfaccia è responsive. Funziona bene su iPad in orizzontale. Su iPhone la UI è meno comoda per la composizione (meglio da desktop).

**D: Quando arriva il PDF?**
R: Nello Step 2 della prossima sessione. Sarà un PDF 10-15 pagine con copertina, voci selezionate con copy completo, obiezioni, condizioni commerciali.

**D: Le modifiche al listino dal pannello admin sono immediate?**
R: Sì. Appena salvi un prezzo modificato, nella prossima composizione di preventivo vedrai il nuovo prezzo.

---

## Troubleshooting

**Problema: `npx prisma db push` dà errore "Environment variable not found: DATABASE_URL"**

Verifica che il file `.env` esista nella cartella principale del progetto. Se non c'è, copia `.env.example` e rinominalo in `.env`:

```bash
cp .env.example .env
```

**Problema: la porta 3000 è già occupata**

Se 3000 è usata da un altro progetto, avvia su porta diversa:

```bash
npm run dev -- -p 3001
```

**Problema: dopo modifiche al database, il listino non si aggiorna**

Re-lancia il seed (attenzione: cancella i preventivi esistenti):

```bash
npm run db:seed
```

---

## Prossimi step

Quando hai testato questa versione e sei pronto per avanzare:

1. **Fammi sapere cosa funziona e cosa vorresti diverso** (UI, logica, flusso)
2. **Passiamo allo Step 2**: generazione PDF del preventivo in 10-15 pagine
3. **Poi Step 3**: integrazione CRM Metodo Cantiere + email automatica + deploy su Vercel

---

Creato per Metodo Cantiere® — Dal contatto al contratto, passo passo.
