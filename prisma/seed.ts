import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =============================================================================
// LISTINO COMPLETO METODO CANTIERE
// Allineato al documento Listino_Metodo_Cantiere.docx
// =============================================================================

const products = [
  // ============ FRONT-END ============
  {
    code: "AUDIT_LAMPO",
    name: "Audit Lampo",
    block: "FRONTEND",
    type: "product",
    positioning: "Una verifica rapida e mirata su un singolo aspetto del tuo processo commerciale. Per chi vuole un primo assaggio prima di impegnarsi nella Diagnosi Strategica.",
    includes: JSON.stringify([
      "Compilazione di un questionario diagnostico mirato (15-20 minuti del tuo tempo).",
      "Analisi del questionario da parte di un consulente Metodo Cantiere.",
      "Report sintetico di 3-5 pagine con i 3 problemi principali individuati e la priorità di intervento.",
      "1 call di 30 minuti per discussione del report e chiarimenti.",
      "Voucher convertibile: l'intero importo di €147 può essere convertito in credito verso la Diagnosi Strategica entro 30 giorni dall'acquisto.",
    ]),
    objection: "€147 per un questionario? Lo posso fare gratis online da mille agenzie.",
    response: "I questionari gratuiti online sono finalizzati a venderti qualcosa, non a darti una vera analisi. Tu compili 50 domande, ricevi un report automatico generico, e poi parte il commerciale. Il nostro Audit Lampo lo legge un consulente vero, ti restituisce 3 problemi REALI del tuo processo. Costa €147 perché c'è lavoro umano dietro. Se decidi di andare avanti con la Diagnosi Strategica, i €147 vengono scalati: nessun rischio.",
    price: 147,
    sortOrder: 1,
  },
  {
    code: "DIAGNOSI_STRATEGICA",
    name: "Diagnosi Strategica",
    block: "FRONTEND",
    type: "product",
    positioning: "L'unico modo per capire se Metodo Cantiere è adatto a te. Niente preventivi a vuoto, niente tempo perso.",
    includes: JSON.stringify([
      "Analisi del processo commerciale attuale del cliente (1h di call preparatoria + 30min di compilazione questionario).",
      "Sessione strategica di 90 minuti con un consulente Metodo Cantiere.",
      "Report scritto di 8-12 pagine con: punti di forza, anelli rotti del processo, priorità di intervento.",
      "Stima economica delle inefficienze attuali (quanto stai perdendo per anelli rotti).",
      "Roadmap consigliata di intervento a 3-6-12 mesi.",
      "Eventuale proposta di pacchetti Metodo Cantiere allineati al caso specifico.",
    ]),
    objection: "A pagamento? Tutti gli altri fanno consulenze gratuite.",
    response: "Esatto, e per questo i clienti delle consulenze gratuite ricevono uno schemino di marketing, non una diagnosi seria del loro processo commerciale. La diagnosi a €497 ti serve a capire se ha senso lavorare insieme PRIMA di firmare contratti più grandi. Se procedi con noi, il €497 viene scalato dal primo pacchetto acquistato.",
    price: 497,
    sortOrder: 2,
  },
  
  // ============ BLOCCO 01 - POSIZIONAMENTO ============
  {
    code: "m0101",
    name: "Riscrittura listino edile",
    block: "01",
    type: "product",
    positioning: "Il tuo listino oggi è una lista di prezzi. Lo trasformiamo in un'arma commerciale strutturata.",
    includes: JSON.stringify([
      "Analisi competitiva su 5-8 competitor diretti del cliente nella sua zona.",
      "Mappatura dei voli alti e bassi dell'attuale listino (cosa funziona, cosa non funziona).",
      "Riscrittura completa del listino con architettura strategica (entry, core, premium, custom).",
      "Definizione delle leve commerciali per ogni voce (urgenza, scarcity, garanzia).",
      "Format finale del listino in PDF brandizzato pronto da consegnare ai clienti.",
      "Sessione di 2h con il titolare per spiegazione del nuovo listino e formazione vendita.",
    ]),
    objection: "Il mio listino lo conosce solo il commercialista, ai clienti diamo preventivi su misura.",
    response: "Esatto, ed è il problema. Senza un listino strutturato, ogni preventivo è una negoziazione dolorosa che parte da zero. Con un listino chiaro, il cliente sa cosa aspettarsi, tu chiudi prima, e non sembri uno che spara prezzi a caso.",
    price: 1997,
    sortOrder: 10,
  },
  {
    code: "m0102",
    name: "Kit Copy Commerciale di Cantiere",
    block: "01",
    type: "product",
    positioning: "Tutti i testi che il tuo team usa ogni giorno per vendere, riscritti in voce edile.",
    includes: JSON.stringify([
      "Presentazione aziendale completa (8-12 pagine in formato PDF brandizzato).",
      "Sequenza email commerciale di 5 messaggi (acquisizione, follow-up, proposta, sollecito, ultima call).",
      "One-pager commerciale (foglio sintetico da consegnare al cliente in trattativa).",
      "8-10 template di messaggi WhatsApp (primo contatto, follow-up, conferma appuntamento, recupero contatto perso).",
      "Documento 'argomenti vincenti' con i 10 messaggi chiave per il settore edile del cliente.",
      "Sessione di 2h con il titolare per addestramento all'uso del materiale.",
    ]),
    objection: "I miei venditori i loro testi li scrivono già da soli.",
    response: "Sì, e ogni volta che si scrivono i loro testi: (1) perdono 15-30 minuti per cliente, (2) mandano cose disomogenee come tono e qualità, (3) dimenticano leve commerciali importanti perché vanno di fretta. Con il kit pronto, scrivono in 3 minuti, sempre con lo stesso standard alto, senza dimenticare niente. Solo il tempo recuperato vale 5 volte il prezzo.",
    price: 2497,
    sortOrder: 11,
  },
  {
    code: "m0103",
    name: "Argomenti commerciali e script obiezioni",
    block: "01",
    type: "product",
    positioning: "Le 30 obiezioni più comuni che i tuoi venditori sentono ogni giorno, con la risposta pronta.",
    includes: JSON.stringify([
      "Mappa delle 30 obiezioni più frequenti nella vendita edile (mappate da casi reali del cliente).",
      "Script di risposta dettagliato per ogni obiezione (3-5 varianti per ognuna).",
      "Argomenti vincenti per le 5 situazioni di trattativa più critiche del settore.",
      "Sequenza di domande di qualifica per separare lead caldi da curiosi.",
      "Sessione di 2h roleplay con il team commerciale del cliente.",
      "Scheda riassuntiva pocket per i venditori (PDF stampabile A4 piegato).",
    ]),
    objection: "I venditori esperti queste cose le sanno già fare.",
    response: "Sì, e sono gli unici 2 commerciali del tuo team che le sanno fare. Gli altri 4-6 vanno a istinto e perdono trattative ogni settimana. Anche per i venditori esperti, avere uno schema strutturato significa non doverlo improvvisare ogni volta.",
    price: 997,
    sortOrder: 12,
  },
  {
    code: "m0104",
    name: "Brand Identity Edile",
    block: "01",
    type: "product",
    positioning: "Logo, palette, tipografia e mini brand book per imprese edili che vogliono uscire dalla foto del cantiere su Facebook.",
    includes: JSON.stringify([
      "Workshop di brand discovery di 3h con il titolare (valori, target, tono di voce).",
      "Concept del logo (3 proposte differenti) con revisione.",
      "Logo finale in tutti i formati necessari (PNG, SVG, PDF, varianti per stampa, social, sito).",
      "Palette colori coordinata + scelta tipografica brandizzata.",
      "Mini brand book (15-20 pagine) con le linee guida d'uso per il team interno.",
      "Template Word/PowerPoint brandizzati per documenti commerciali quotidiani.",
    ]),
    objection: "Il logo me l'ha fatto un grafico amico per €300.",
    response: "Probabilmente sì, e probabilmente è un logo che funziona 'abbastanza'. Il problema non è il logo: è che senza una brand identity completa (palette, tipografia, mini brand book), ogni documento aziendale è diverso dall'altro e si nota. Per un'impresa edile che fa lavori da €100k+, una identity professionale è la differenza tra 'ditta seria' e 'ditta che si arrangia'.",
    price: 2997,
    sortOrder: 13,
  },
  {
    code: "BUNDLE_COPY_COMMERCIALE",
    name: "Bundle Copy Commerciale di Cantiere",
    block: "01",
    type: "bundle",
    positioning: "Il pacchetto completo per riscrivere tutto il copy commerciale edile in una volta sola. Bundle bandiera del Blocco 01.",
    includes: JSON.stringify([
      "Riscrittura listino edile (m0101)",
      "Kit Copy Commerciale di Cantiere (m0102)",
      "Argomenti commerciali e script obiezioni (m0103)",
    ]),
    price: 4497,
    bundleItems: JSON.stringify(["m0101", "m0102", "m0103"]),
    sortOrder: 14,
  },
  {
    code: "BUNDLE_RIPARTENZA",
    name: "Bundle Ripartenza Completa",
    block: "01",
    type: "bundle",
    positioning: "Ripartenza completa: copy commerciale + identità visiva. Per chi vuole rifarsi tutto in un colpo solo.",
    includes: JSON.stringify([
      "Riscrittura listino edile (m0101)",
      "Kit Copy Commerciale di Cantiere (m0102)",
      "Argomenti commerciali e script obiezioni (m0103)",
      "Brand Identity Edile (m0104)",
    ]),
    price: 6997,
    bundleItems: JSON.stringify(["m0101", "m0102", "m0103", "m0104"]),
    sortOrder: 15,
  },
  
  // ============ BLOCCO 02 - TECNOLOGIA CRM ============
  {
    code: "m0201",
    name: "MC360 - Setup completo CRM Metodo Cantiere",
    block: "02",
    type: "product",
    positioning: "Il primo passo del sistema. Senza un CRM verticale edile configurato bene, tutto il resto non ha dove poggiare.",
    includes: JSON.stringify([
      "Setup completo del CRM Metodo Cantiere (istanza dedicata).",
      "Pipeline commerciale edile pre-costruita (Lead → Qualificato → Sopralluogo → Preventivo → Firmato).",
      "Configurazione automazioni base native del CRM (notifiche, follow-up, tag).",
      "Migrazione dati base dai sistemi precedenti (file Excel/CSV, fino a 2.000 contatti).",
      "Onboarding del titolare (2h) e del team commerciale (3h).",
      "Template preventivi standard pre-impostati dentro il CRM.",
      "Integrazione con il sito web del cliente (form principale).",
    ]),
    objection: "HubSpot ha un piano gratuito, perché pagare €2.997?",
    response: "HubSpot gratis ti dà il software, non il setup. Il vero costo è il tempo che impieghi a capire come configurarlo, scegliere i KPI, costruire le pipeline, importare i dati, formare il team. Un consulente HubSpot per fare tutto questo costa €3.000-5.000 ed è un consulente generalista. Noi a €2.997 lo facciamo edile-specific, con template pronti per il tuo settore.",
    price: 2997,
    sortOrder: 20,
  },
  {
    code: "m0201_PLUS",
    name: "MC360 PLUS - CRM evoluto con presidio pipeline",
    block: "02",
    type: "variant",
    positioning: "Tutto del MC360 base più 3 mesi di presidio settimanale: un consulente Metodo Cantiere controlla la pipeline e segnala interventi.",
    includes: JSON.stringify([
      "3 mesi di presidio pipeline con revisione settimanale dedicata.",
      "2 sessioni strategiche di onboarding management con il titolare (revisione KPI direzionali).",
      "Configurazione personalizzata avanzata di pipeline e workflow nativi del CRM.",
      "Formazione avanzata su report direzionali e dashboard.",
      "6 mesi di priority support (risposta SLA 4 ore invece di 24).",
    ]),
    price: 3997,
    prerequisites: JSON.stringify(["m0201"]),
    sortOrder: 21,
  },
  {
    code: "m0202",
    name: "Migrazione assistita al CRM Metodo Cantiere",
    block: "02",
    type: "product",
    positioning: "Per chi ha già un CRM (HubSpot, Salesforce, Pipedrive, Zoho) e vuole passare al nostro.",
    includes: JSON.stringify([
      "Audit del CRM esistente: cosa c'è, cosa serve, cosa lasciare.",
      "Mappatura completa dei dati: quali campi del vecchio CRM diventano cosa nel nuovo.",
      "Migrazione tecnica: contatti, storico trattative, pipeline aperte, file allegati, note.",
      "Pulizia dati durante la migrazione (deduplicazione, standardizzazione, tagging).",
      "30 giorni di affiancamento al titolare post-migrazione.",
      "Disattivazione assistita del CRM precedente (export finale, conservazione backup, chiusura account).",
    ]),
    objection: "Ho appena pagato un anno di HubSpot, perché dovrei migrare?",
    response: "HubSpot è un ottimo CRM generalista, ma non parla la lingua del tuo settore. Pipeline pre-costruite per cantieri, KPI edili, integrazione nativa con AI Vocale e WhatsApp che HubSpot non ti dà. La migrazione costa €1.497 una tantum, il canone dal mese 2 è simile o inferiore a quello che paghi oggi. In 6 mesi recuperi e da lì in poi risparmi su tutto.",
    price: 1497,
    sortOrder: 22,
  },
  {
    code: "m0204",
    name: "Integrazione sito al CRM con tracking",
    block: "02",
    type: "product",
    positioning: "La connessione che non si rompe. Form, pixel, UTM, eventi: configurati come si deve.",
    includes: JSON.stringify([
      "Configurazione form del sito per salvare i lead direttamente nel CRM Metodo Cantiere.",
      "Setup pixel di tracciamento per identificare la fonte di ogni lead (organico, ADS, social, referral).",
      "Configurazione parametri UTM per le campagne future.",
      "Setup eventi di conversione (compilazione form, click WhatsApp, scroll deep).",
      "Integrazione con Google Analytics 4 e Meta Pixel.",
      "Test completo end-to-end della pipeline lead.",
    ]),
    objection: "Lo fa il ragazzo che mi gestisce il sito.",
    response: "Probabilmente sì, ma con un ragazzo che gestisce il sito il tracking si rompe ogni sei mesi e nessuno se ne accorge. Noi diamo setup professionale + alert automatici se qualcosa smette di tracciare. Differenza tra 'funziona se tutto va bene' e 'funziona sempre, e se si rompe lo scopri subito'.",
    price: 497,
    sortOrder: 23,
  },
  {
    code: "m0206",
    name: "Migrazione dati standard",
    block: "02",
    type: "product",
    positioning: "Per portare i tuoi dati esistenti nel CRM Metodo Cantiere quando arrivano da Excel o file CSV.",
    includes: JSON.stringify([
      "Migrazione contatti dal file fornito dal cliente (Excel, CSV, Google Sheets).",
      "Importazione storico trattative semplice (fino a 5.000 record).",
      "Pulizia dati base: rimozione duplicati, standardizzazione formati, tagging iniziale.",
      "Verifica integrità dei dati post-migrazione.",
    ]),
    objection: "Posso farmelo io con l'import di Excel.",
    response: "Sì, finché i dati sono puliti. Nel 90% dei casi i dati edili (anni di Excel rabberciati) hanno duplicati, formati diversi nello stesso campo, contatti incompleti. €497 per una migrazione pulita è poco rispetto al tempo che recuperi nei mesi successivi.",
    price: 497,
    sortOrder: 24,
  },
  {
    code: "m0207_CRUSCOTTO",
    name: "Cruscotto direzionale CRM",
    block: "02",
    type: "product",
    positioning: "Configurazione professionale del cruscotto direzionale dentro il CRM Metodo Cantiere. Misurare, vedere, decidere.",
    includes: JSON.stringify([
      "Configurazione delle dashboard native del CRM con KPI commerciali edili.",
      "Setup di 8-12 indicatori chiave: lead per fonte, tasso conversione lead-preventivo, ticket medio, ciclo di vendita medio, top performer, top fonti.",
      "Filtri dinamici per periodo, commerciale, area geografica, tipo lavoro.",
      "Permessi di accesso differenziati (titolare vede tutto, commerciali vedono i propri).",
      "Sessione di 1h con il titolare per spiegazione del cruscotto e interpretazione dei dati.",
      "Aggiornamento mensile del cruscotto incluso per i primi 3 mesi.",
    ]),
    objection: "I report ce li dà già il commerciale ogni settimana.",
    response: "Sì, ma sono i report che lui DECIDE di darti, filtrati come decide lui. Il cruscotto direzionale ti mostra TUTTO, in tempo reale, senza filtri. Tu vedi davvero come stanno andando i lead per fonte, quale commerciale chiude di più, dove perdi soldi.",
    price: 997,
    sortOrder: 25,
  },
  
  // ============ BLOCCO 03 - ACQUISIZIONE ============
  {
    code: "m0301",
    name: "Landing page edile a conversione",
    block: "03",
    type: "product",
    positioning: "Una landing scritta da chi ha visto 30 anni di cantieri. Non un sito vetrina, un asset di vendita.",
    includes: JSON.stringify([
      "Strategia copy verticale edilizia (titolo, sottotitolo, struttura della pagina).",
      "Copy completo in tono Metodo Cantiere (hero, benefici, prove, FAQ, CTA).",
      "Design responsivo ottimizzato mobile-first.",
      "Form di contatto integrato al CRM.",
      "Setup tracking completo (Pixel, Analytics, eventi conversione).",
      "Test A/B iniziale su titolo e CTA per ottimizzare la conversione.",
      "Hosting e dominio configurati (la landing va online entro 7-10 giorni dalla approvazione del copy).",
    ]),
    objection: "Una landing me la fa il cugino con WordPress per €300.",
    response: "Probabilmente sì, e probabilmente convertirà il 0,5%-1% dei visitatori. La nostra converte mediamente il 4-8% perché ha copy edile fatto bene, struttura testata, tracking che identifica i punti morti. Su una campagna ADS con 1.000 visite/mese, la differenza è tra 5 lead e 50 lead.",
    price: 1197,
    sortOrder: 30,
  },
  {
    code: "m0302",
    name: "Form filtrante intelligente",
    block: "03",
    type: "product",
    positioning: "Smettila di rispondere a tutti. Filtra i lead caldi dai curiosi automaticamente.",
    includes: JSON.stringify([
      "Form multi-step con domande filtranti (budget, tempistica, tipo lavoro, area geografica).",
      "Logica condizionale: domande successive si adattano alle risposte precedenti.",
      "Sistema di scoring automatico (lead caldo, tiepido, freddo).",
      "Tag automatico nel CRM in base al punteggio.",
      "Routing differenziato in pipeline diverse a seconda del punteggio.",
      "Email automatica differenziata in base al punteggio.",
    ]),
    objection: "Il form ce l'ho già.",
    response: "Sì, ma è un form che raccoglie tutti i lead nella stessa casella. Quanti dei lead sono curiosi senza budget? Quanti sono lead reali con progetto? Il nostro form li distingue automaticamente: il commerciale chiama prima i caldi. Cambia drasticamente il tasso di chiusura.",
    price: 497,
    sortOrder: 31,
  },
  {
    code: "m0303",
    name: "Setup ADS Meta (Facebook + Instagram)",
    block: "03",
    type: "product",
    positioning: "Configurazione iniziale delle campagne pubblicitarie su Meta. Solo setup, la gestione mensile è separata.",
    includes: JSON.stringify([
      "Configurazione Business Manager + Pixel + Conversion API.",
      "Setup eventi conversione e tracking GA4.",
      "Audience custom (visitatori sito) e lookalike (basate su clienti reali).",
      "Prima creatività: 3-5 annunci con copy + immagini/video.",
      "Prima campagna pronta a partire (lead generation o traffic).",
      "Setup A/B testing iniziale su 2 varianti creatività.",
    ]),
    objection: "Le campagne Meta ce le impostiamo da soli.",
    response: "Sì, con un setup amatoriale che lascia il 30-50% del budget per strada. Errori tipici: pixel non configurato bene, audience troppo larghe, niente A/B testing. Su un budget mensile di €1.500 di ADS, recuperare il 30% di efficienza significa €450/mese di lead in più.",
    price: 697,
    sortOrder: 32,
  },
  {
    code: "m0304",
    name: "Setup ADS Google (Search + Performance Max)",
    block: "03",
    type: "product",
    positioning: "Per intercettare chi sta cercando attivamente i tuoi servizi su Google.",
    includes: JSON.stringify([
      "Configurazione account Google Ads + Conversion tracking.",
      "Implementazione Consent Mode v2 e Enhanced Conversions (compliance privacy 2026).",
      "Keyword research verticale edile (50-100 keyword target con CPC e volumi).",
      "Prima campagna Search + prima campagna Performance Max.",
      "Setup integrazione con landing page del cliente.",
      "Configurazione GA4 per tracciare l'intero funnel di conversione.",
    ]),
    objection: "Google Ads è uguale a Meta, lo gestisco con lo stesso fornitore.",
    response: "No, sono mondi opposti. Meta è interruption marketing. Google è intent marketing (la persona sta CERCANDO il tuo servizio). Per il settore edile B2B, Google funziona generalmente molto meglio di Meta. Setup separato perché le competenze sono diverse.",
    price: 697,
    sortOrder: 33,
  },
  {
    code: "m0306",
    name: "Sistema scoring lead automatico",
    block: "03",
    type: "product",
    positioning: "Ogni lead ha un punteggio dinamico che cambia in base al comportamento. Il commerciale lavora prima i caldi.",
    includes: JSON.stringify([
      "Setup di un sistema di scoring multivariato dentro il CRM.",
      "Combinazione di dati form (budget dichiarato) + comportamento email (aperture, click) + interazioni WhatsApp.",
      "Algoritmo di scoring tarato sulla vendita edile.",
      "Soglia automatica di passaggio in pipeline 'caldi'.",
      "Dashboard di monitoraggio dei punteggi medi e dei trend nel tempo.",
    ]),
    objection: "Il commerciale capisce da solo chi è caldo e chi no.",
    response: "A naso sì, e infatti spesso sbaglia: chiama subito il lead simpatico al telefono e ignora quello che ha aperto 8 email e cliccato 3 link. Lo scoring oggettivo dice 'questo ha mostrato 5 segnali, quello solo 1': chiamiamo prima quello con 5 segnali.",
    price: 597,
    sortOrder: 34,
  },
  {
    code: "BUNDLE_ACQUISIZIONE",
    name: "Bundle Acquisizione completa",
    block: "03",
    type: "bundle",
    positioning: "Tutto il sistema acquisizione in un pacchetto. Per chi vuole partire forte: dal primo giorno hai landing, form, ADS configurate, scoring attivo.",
    includes: JSON.stringify([
      "Landing page edile (m0301)",
      "Form filtrante intelligente (m0302)",
      "Setup ADS Meta (m0303)",
      "Setup ADS Google (m0304)",
      "Sistema scoring lead (m0306)",
    ]),
    price: 2997,
    bundleItems: JSON.stringify(["m0301", "m0302", "m0303", "m0304", "m0306"]),
    sortOrder: 35,
  },
  
  // ============ BLOCCO 04 - AUTOMAZIONI ============
  {
    code: "m0401",
    name: "Funnel email base",
    block: "04",
    type: "product",
    positioning: "Sequenza email automatizzata post-lead. Configurata sul CRM Metodo Cantiere, niente strumenti esterni.",
    includes: JSON.stringify([
      "4-5 email automatiche nei primi 14 giorni dall'acquisizione del lead.",
      "Copy edile pre-scritto e personalizzabile (conferma, approfondimento, social proof, offerta, ultima call).",
      "Configurazione completa nel modulo email del CRM Metodo Cantiere.",
      "Trigger automatici basati su comportamento (chi apre, chi clicca, chi non legge).",
      "Tracking aperture, click, risposte direttamente nel record cliente.",
      "Test deliverability su Gmail, Outlook, mail provider italiani.",
    ]),
    objection: "Le email di follow-up le scriviamo noi a mano quando serve.",
    response: "E nel 70% dei casi non vengono scritte perché ci si dimentica. Il funnel automatico parte sempre, anche di domenica, anche quando il commerciale è in ferie. Su 100 lead, l'automazione recupera 15-25 trattative.",
    price: 697,
    sortOrder: 40,
  },
  {
    code: "m0402",
    name: "Funnel email avanzato (multicampagna + scoring)",
    block: "04",
    type: "product",
    positioning: "Sistema email evoluto: sequenze diverse per tipi di lead diversi, scoring comportamentale, integrazione cross-canale.",
    includes: JSON.stringify([
      "Multiple sequenze email per tipologia di lead (freddo, caldo, perso, da riattivare).",
      "Scoring comportamentale automatico basato su aperture e click.",
      "Segmentazione dinamica: i lead si spostano tra sequenze in base al loro comportamento.",
      "Trigger combinati con WhatsApp e AI Vocale: se non aprono email per 3 giorni, automatico passaggio a WhatsApp.",
      "Reporting avanzato sulle performance di ogni sequenza.",
      "A/B testing nativo su oggetti email per ottimizzare le aperture.",
    ]),
    objection: "Il funnel base mi basta.",
    response: "All'inizio sì. Quando inizi ad avere 50+ lead al mese, non puoi trattare tutti uguale: il lead che ha cliccato 5 link è diverso da chi non ha mai aperto. Il funnel avanzato distingue automaticamente.",
    price: 1297,
    prerequisites: JSON.stringify(["m0401"]),
    sortOrder: 41,
  },
  {
    code: "m0403",
    name: "WhatsApp Avanzato",
    block: "04",
    type: "product",
    positioning: "WhatsApp Business API integrato al CRM. Non un'app separata: parte del sistema commerciale.",
    includes: JSON.stringify([
      "Setup completo WhatsApp Business API con BSP certificato Meta.",
      "Configurazione numero aziendale + verifica Meta.",
      "Approvazione di 5-8 template di messaggio per uso commerciale.",
      "Workflow automatici: benvenuto, follow-up, conferma appuntamento, recupero trattativa.",
      "Integrazione bidirezionale al CRM (ogni messaggio appare nel record del lead).",
      "Setup orchestrazione cross-canale (se non risponde a email → WhatsApp; se non risponde a WhatsApp → AI Vocale).",
    ]),
    objection: "Uso Callbell a €29 al mese, perché €997 di setup da voi?",
    response: "Callbell ti dà WhatsApp generalista, ma non integrato al tuo CRM. Noi mettiamo su un'orchestrazione multicanale: lead arriva sul sito, se non risponde all'email viene ripreso via WhatsApp, se non risponde via WA viene chiamato dall'AI Vocale. Tutto tracciato in un unico CRM.",
    price: 997,
    sortOrder: 42,
  },
  {
    code: "m0404",
    name: "AI Vocale Base",
    block: "04",
    type: "product",
    positioning: "Un agente vocale AI che chiama, qualifica, prende appuntamenti. Voci sintetizzate professionali.",
    includes: JSON.stringify([
      "Setup di un agente vocale AI in italiano.",
      "Selezione tra 3-4 voci sintetizzate professionali (maschio/femmina, giovane/adulto, formale/cordiale).",
      "Training su script commerciali edili specifici del cliente.",
      "Integrazione CRM per registrare chiamate, qualificare lead, tag automatico.",
      "Workflow automatici: richiamo dopo form, qualificazione, presa appuntamento, recupero trattativa persa.",
      "Pronto in 7-10 giorni dalla raccolta degli script.",
    ]),
    objection: "Un robot che chiama? I clienti se ne accorgono e chiudono.",
    response: "Le voci AI sintetizzate del 2026 sono indistinguibili da una voce umana per il 70-80% delle persone. Casi reali italiani: 630 chiamate AI generano 230 appuntamenti (36,5% conversion). Per trattative da €30k+, anche un solo appuntamento aggiuntivo all'anno paga il setup 20 volte.",
    price: 1497,
    sortOrder: 43,
  },
  {
    code: "m0404_PERS",
    name: "AI Vocale Personalizzato - voce reale clonata",
    block: "04",
    type: "variant",
    positioning: "Tutto del Base più la clonazione della tua voce reale (o di un commerciale, o di un doppiatore). Coerenza brand totale.",
    includes: JSON.stringify([
      "Clonazione voce reale di alta qualità tramite ElevenLabs Voice Cloning.",
      "Setup esteso (15-20 giorni) per training audio specifico.",
      "Fine-tuning vocale per garantire naturalezza e coerenza con la persona reale.",
      "Test A/B comparativo sui primi 100 chiamate (voce sintetizzata vs voce clonata) per validare l'effetto.",
    ]),
    price: 1997,
    sortOrder: 44,
  },
  {
    code: "m0405",
    name: "AI Vocale Inbound-Outbound completo",
    block: "04",
    type: "product",
    positioning: "Centralino AI completo: risponde alle chiamate in entrata E chiama in uscita. Cross-sell per chi ha già AI Vocale.",
    includes: JSON.stringify([
      "Richiede AI Vocale Base o Personalizzato come prerequisito tecnico.",
      "Setup di un numero dedicato aziendale.",
      "AI INBOUND: risponde alle chiamate in entrata, qualifica il chiamante, FAQ aziendali, raccoglie lead.",
      "AI OUTBOUND: recupero trattative perse 60-90 giorni, follow-up appuntamenti, richiami programmati.",
      "Configurazione base aziendale (orari, servizi, zone, informazioni ricorrenti).",
      "2 personalità AI distinte (inbound formale, outbound commerciale), con voci diverse.",
      "Registrazione di tutte le chiamate nel CRM con tag automatico.",
      "Dashboard di monitoraggio (chiamate inbound/outbound, lead generati, conversioni).",
    ]),
    objection: "Un robot che risponde al telefono aziendale fa scappare i clienti.",
    response: "Vero se fatto male. Le AI vocali in inbound ben configurate vengono percepite positivamente dal 60-70% dei chiamanti. L'AI non sostituisce la centralinista, ti fa risparmiare 40-60% delle chiamate ripetitive, e passa al commerciale SOLO i chiamanti qualificati. Stima conservativa: 10-15 trattative perse recuperate l'anno = €200K+ di fatturato aggiuntivo.",
    price: 2497,
    prerequisites: JSON.stringify(["m0404", "m0404_PERS"]),
    sortOrder: 45,
  },
  {
    code: "BUNDLE_EMAIL_COMPLETE",
    name: "Bundle Automazioni Email Complete",
    block: "04",
    type: "bundle",
    positioning: "Bundle email: base + avanzato in un pacchetto. Perché il funnel avanzato richiede sempre il base come prerequisito.",
    includes: JSON.stringify([
      "Funnel email base (m0401)",
      "Funnel email avanzato (m0402)",
    ]),
    price: 1797,
    bundleItems: JSON.stringify(["m0401", "m0402"]),
    sortOrder: 46,
  },
  {
    code: "BUNDLE_MULTICANALE",
    name: "Bundle Multicanale AI-First",
    block: "04",
    type: "bundle",
    positioning: "Bundle bandiera del Blocco 04: orchestrazione multicanale email + WhatsApp + AI Vocale dal mese 1. Il valore vero è nell'integrazione.",
    includes: JSON.stringify([
      "WhatsApp Avanzato (m0403)",
      "AI Vocale Base (m0404)",
      "Funnel email base (m0401)",
    ]),
    price: 2997,
    bundleItems: JSON.stringify(["m0403", "m0404", "m0401"]),
    sortOrder: 47,
  },
  {
    code: "BUNDLE_MULTICANALE_PREMIUM",
    name: "Bundle Multicanale AI-First Premium",
    block: "04",
    type: "bundle",
    positioning: "Versione premium del Multicanale AI-First, con AI Vocale clonata sulla tua voce reale invece della sintetizzata.",
    includes: JSON.stringify([
      "WhatsApp Avanzato (m0403)",
      "AI Vocale Personalizzato (m0404_PERS)",
      "Funnel email base (m0401)",
    ]),
    price: 3497,
    bundleItems: JSON.stringify(["m0403", "m0404_PERS", "m0401"]),
    sortOrder: 48,
  },
  
  // ============ BLOCCO 06 - DIREZIONE E COACHING ============
  {
    code: "m0601",
    name: "Formazione on-site (giornata in azienda)",
    block: "06",
    type: "product",
    positioning: "Una giornata intera (8h) nella sede del cliente per formare il team commerciale su un tema specifico.",
    includes: JSON.stringify([
      "Una giornata di formazione (8 ore effettive) on-site in azienda.",
      "Tema concordato in anticipo (gestione pipeline, script trattativa, gestione obiezioni prezzo, uso CRM, follow-up).",
      "Materiale didattico personalizzato sul caso reale del cliente.",
      "Esercitazioni pratiche con i venditori reali del cliente.",
      "Registrazione audio della giornata consegnata al cliente.",
      "Documento sintesi post-formazione con piano d'azione 60 giorni.",
      "Spese di trasferta non incluse: forfait €150 Nord Italia, €250 Centro-Sud.",
    ]),
    objection: "I corsi di vendita li abbiamo già fatti, non funzionano.",
    response: "I corsi generici NON funzionano: sono motivazionali, parlano di teoria, non parlano della tua azienda. La nostra formazione è personalizzata sul tuo caso reale: usiamo i tuoi clienti come esempio, le tue obiezioni come esercizi, le tue pipeline come materiale.",
    price: 1497,
    sortOrder: 60,
  },
  {
    code: "m0602",
    name: "Formazione continua (2h online mensili)",
    block: "06",
    type: "canone",
    positioning: "Una sessione mensile online di 2h sul team commerciale. Roleplay, revisione casi, focus su miglioramenti.",
    includes: JSON.stringify([
      "Sessione mensile di 2 ore online (Zoom, Teams, Meet).",
      "Roleplay sulle obiezioni emerse nel mese precedente.",
      "Revisione di 2-3 casi reali del mese (trattative chiuse e perse).",
      "Focus su un'area di miglioramento specifica emersa dai KPI.",
      "Scheda riassuntiva post-sessione con i 3 punti d'azione del mese.",
    ]),
    objection: "Una formazione una tantum basta, non serve farla mensile.",
    response: "Senza mantenimento, il 70% del valore di una formazione si perde in 6 mesi: i venditori tornano alle vecchie abitudini. La formazione mensile è la palestra: senza esercizio costante, il muscolo si atrofizza.",
    price: 697,
    isMonthly: true,
    sortOrder: 61,
  },
  {
    code: "m0604_A",
    name: "Coaching titolare - singola sessione",
    block: "06",
    type: "product",
    positioning: "Una giornata intera (8h) on-site o online dedicata SOLO al titolare, su un tema strategico specifico.",
    includes: JSON.stringify([
      "1 giornata (8 ore) di sessione individuale con il titolare.",
      "Focus su un tema scelto: leadership commerciale, decisioni strategiche, gestione team, gestione conflitti con commerciali senior.",
      "Output: piano d'azione personalizzato 60 giorni con KPI di verifica.",
      "1 follow-up call dopo 30 giorni (1h).",
      "1 follow-up call dopo 90 giorni (1h).",
    ]),
    price: 1997,
    sortOrder: 62,
  },
  {
    code: "m0604_B",
    name: "Coaching titolare - percorso 2 mesi",
    block: "06",
    type: "product",
    positioning: "Percorso strutturato di 2 mesi con 4 sessioni e accompagnamento WhatsApp continuativo.",
    includes: JSON.stringify([
      "4 sessioni da 2 ore con cadenza quindicinale (online).",
      "WhatsApp follow-up settimanale tra le sessioni (Nicola disponibile fino a 1h/settimana per domande).",
      "Accountability check ogni 15 giorni con KPI personali del titolare.",
      "Output: trasformazione strutturale del titolare nella sua leadership commerciale.",
    ]),
    price: 3997,
    sortOrder: 63,
  },
  {
    code: "m0605",
    name: "Scorecard venditori",
    block: "06",
    type: "product",
    positioning: "Sistema oggettivo di valutazione del team commerciale. Smetti di chiederti 'vende o non vende?'.",
    includes: JSON.stringify([
      "Setup scheda di valutazione individuale per ogni commerciale (KPI quantitativi + qualitativi).",
      "Definizione obiettivi personali misurabili (mensili e trimestrali).",
      "Processo strutturato di feedback 1-to-1 mensile titolare-commerciale.",
      "Piano di crescita personalizzato per ogni commerciale (top performer e low performer).",
      "Sessione di 2h con il titolare per spiegazione del sistema e simulazione del primo feedback.",
      "Template Excel/Google Sheet pre-configurato per uso ricorrente.",
    ]),
    objection: "I miei venditori li conosco bene, non serve un sistema.",
    response: "Li conosci come PERSONE, non come performer. Senza dati oggettivi, 'vende bene' significa 'vende abbastanza da non lamentarsi'. Spesso il titolare scopre solo dopo 2-3 anni che il commerciale 'fidato' produceva il 30% in meno del top performer.",
    price: 1297,
    sortOrder: 64,
  },
  {
    code: "m0606",
    name: "Reclutamento commerciale edile",
    block: "06",
    type: "product",
    positioning: "Inseriamo un commerciale nella tua squadra edile. Modello ibrido con pagamento a obiettivi.",
    includes: JSON.stringify([
      "Definizione del profilo commerciale insieme al titolare (competenze, esperienza, soft skill, zona).",
      "Pubblicazione annuncio su LinkedIn, Subito, Indeed (costi media inclusi fino a €200/mese).",
      "Screening CV (50-100 candidature tipiche) e prima selezione qualificante.",
      "2 colloqui tecnici con i candidati più promettenti.",
      "Scorecard di valutazione dei candidati finali presentati al titolare.",
      "Supporto nella definizione del contratto e proposta economica al candidato scelto.",
      "Onboarding 30 giorni post-assunzione: 2 check settimanali con il nuovo commerciale.",
      "PAGAMENTO: €2.497 alla firma del contratto di assunzione + €1.500 al superamento del periodo di prova (6 mesi). Totale €3.997 se il commerciale dura.",
    ]),
    objection: "Un recruiter tradizionale me lo farebbe a 15% della RAL, ovvero €5.000-7.000.",
    response: "Esatto, ed è il mercato. Noi stiamo sotto quel prezzo perché abbiamo verticalità edile e perché il modello a due step ci obbliga a scegliere bene: se il candidato non dura, non incassiamo il secondo €1.500. Paghi meno all'inizio, e paghi meno anche se il commerciale se ne va.",
    price: 2497,
    priceLabel: "€ 2.497 + € 1.500",
    sortOrder: 65,
  },
  {
    code: "BUNDLE_DIREZIONE",
    name: "Bundle Direzione & Sales Operations",
    block: "06",
    type: "bundle",
    positioning: "Trasformazione del team commerciale in 3 mesi: kickoff con formazione + sistema valutazione + 3 mesi di mantenimento.",
    includes: JSON.stringify([
      "Formazione on-site (m0601)",
      "Scorecard venditori (m0605)",
      "Formazione continua (3 mesi inclusi)",
    ]),
    price: 3497,
    bundleItems: JSON.stringify(["m0601", "m0605"]),
    sortOrder: 66,
  },
  
  // ============ BLOCCO 07 - CONSULENZA NICOLA BUSCA ============
  {
    code: "m0701",
    name: "Giornata strategica con Nicola Busca",
    block: "07",
    type: "product",
    positioning: "Una giornata intera con Nicola direttamente. Output: piano d'azione operativo dettagliato a 6 mesi.",
    includes: JSON.stringify([
      "Una giornata (8h) con Nicola Busca on-site in azienda o online.",
      "Preparazione preventiva: 4-6h di studio del business del cliente.",
      "Analisi profonda del business commerciale durante la giornata.",
      "Definizione strategia commerciale prossimi 6 mesi.",
      "Piano d'azione operativo dettagliato (output documento di 15-25 pagine).",
      "1 follow-up call a 30 giorni (1h).",
      "1 follow-up call a 90 giorni (1h).",
    ]),
    objection: "Cosa ottengo che non ottengo dalle altre formazioni o coaching?",
    response: "La presenza diretta di Nicola Busca, 30 anni di cantiere, founder dell'azienda. Non parli con un consulente: parli con chi ha visto il settore edile italiano cambiare dagli anni 90 ad oggi. Il piano d'azione vale il prezzo 5-10 volte se applicato bene.",
    price: 3997,
    sortOrder: 70,
  },
  {
    code: "m0702",
    name: "Percorso strategico 3 mesi",
    block: "07",
    type: "product",
    positioning: "Trasformazione completa del processo commerciale in 3 mesi. 8 sessioni con Nicola.",
    includes: JSON.stringify([
      "1 giornata di kickoff iniziale (8h, on-site o online).",
      "6 sessioni quindicinali da 2h ciascuna nei 3 mesi successivi (online).",
      "1 giornata di closing finale (8h) con consegna del nuovo sistema commerciale.",
      "Tema: trasformazione completa del processo commerciale dall'acquisizione alla chiusura.",
      "Output finale: nuovo sistema commerciale documentato, KPI definiti, responsabilità assegnate.",
      "WhatsApp diretto con Nicola tra le sessioni (max 30min/settimana).",
    ]),
    objection: "Costa quasi quanto un mese e mezzo di Direzione Commerciale Esterna, perché preferirlo?",
    response: "Sono prodotti diversi. La DCE è continuativa (12+ mesi). Il Percorso 3 mesi è un INTERVENTO STRUTTURALE: cambia in modo profondo il sistema commerciale e poi te lo lasci. Spesso clienti fanno il Percorso 3 mesi come 'fase di setup' e poi entrano in DCE per il presidio.",
    price: 4997,
    sortOrder: 71,
  },
  {
    code: "m0703",
    name: "Advisory annuale Nicola Busca",
    block: "07",
    type: "product",
    positioning: "Il prodotto top: 12 mesi di presidio strategico Founder. 4 QBR + 12 call mensili + WhatsApp diretto.",
    includes: JSON.stringify([
      "4 Quarterly Business Review on-site (1 giornata intera ciascuna, 4 al anno).",
      "12 call mensili di allineamento (1 ora ciascuna).",
      "Accesso WhatsApp diretto a Nicola (disponibilità fino a 2h/settimana).",
      "Presidio strategico continuativo, focus su decisioni di crescita strutturali (non operativo).",
      "Massimo 5-7 clienti Advisory contemporaneamente per garantire qualità del rapporto.",
      "Contratto annuale, rinnovabile automaticamente salvo disdetta 60gg prima della scadenza.",
    ]),
    objection: "Perché spendere quasi €18K all'anno se posso avere DCE Strutturato a €42K all'anno?",
    response: "Sono prodotti completamente diversi. La DCE è OPERATIVA: ti aiuto a gestire il giorno per giorno commerciale. L'Advisory è STRATEGICA: ti aiuto sulle decisioni di crescita di lungo periodo. Spesso clienti grandi hanno entrambi.",
    price: 17997,
    sortOrder: 72,
  },
  
  // ============ MEGA-BUNDLE ============
  {
    code: "MEGABUNDLE_COMMERCIALE",
    name: "Sistema Commerciale Completo",
    block: "MEGABUNDLE",
    type: "bundle",
    positioning: "Il pacchetto del cliente che vuole tutto subito: copy commerciale + CRM evoluto + acquisizione + automazioni multicanale. Dal mese 1 sistema commerciale completo end-to-end.",
    includes: JSON.stringify([
      "Bundle 'Copy Commerciale di Cantiere' (Blocco 01)",
      "MC360 PLUS — CRM evoluto (Blocco 02)",
      "Bundle 'Acquisizione completa' (Blocco 03)",
      "Bundle 'Multicanale AI-First' (Blocco 04)",
    ]),
    price: 11997,
    bundleItems: JSON.stringify(["BUNDLE_COPY_COMMERCIALE", "m0201_PLUS", "BUNDLE_ACQUISIZIONE", "BUNDLE_MULTICANALE"]),
    sortOrder: 80,
  },
  
  // ============ CANONI CRM ============
  ...[
    { code: "CANONE_CRM_1", name: "CRM - 1 licenza", price: 29 },
    { code: "CANONE_CRM_5", name: "CRM - fino a 5 licenze", price: 79 },
    { code: "CANONE_CRM_10", name: "CRM - fino a 10 licenze", price: 149 },
    { code: "CANONE_CRM_20", name: "CRM - fino a 20 licenze", price: 249 },
    { code: "CANONE_CRM_30", name: "CRM - fino a 30 licenze", price: 349 },
    { code: "CANONE_CRM_40", name: "CRM - fino a 40 licenze", price: 429 },
    { code: "CANONE_CRM_50", name: "CRM - fino a 50 licenze", price: 499 },
  ].map((c, i) => ({
    ...c,
    block: "CANONI_CRM",
    type: "canone",
    positioning: "Canone CRM Metodo Cantiere. Sconto 20% per pagamento annuale anticipato.",
    includes: JSON.stringify([
      "Accesso all'istanza CRM Metodo Cantiere.",
      "Aggiornamenti e manutenzione inclusi.",
      "Supporto tecnico standard (SLA 24h lavorative).",
      "Sconto 20% su pagamento annuale anticipato.",
    ]),
    isMonthly: true,
    sortOrder: 90 + i,
  })),
  
  // ============ CANONI AI VOCALE ============
  ...[
    { code: "CANONE_AI_AVVIO", name: "AI Vocale - Avvio", price: 149, minuti: "250 min/mese" },
    { code: "CANONE_AI_CRESCITA", name: "AI Vocale - Crescita", price: 349, minuti: "750 min/mese" },
    { code: "CANONE_AI_INTEGRALE", name: "AI Vocale - Integrale", price: 790, minuti: "2.000 min/mese" },
  ].map((c, i) => ({
    code: c.code,
    name: c.name,
    price: c.price,
    block: "CANONI_AIVOCALE",
    type: "canone",
    positioning: `Canone AI Vocale: ${c.minuti} incluso.`,
    includes: JSON.stringify([
      `${c.minuti} incluso nel canone.`,
      "Registrazione chiamate e integrazione CRM.",
      "Sopra il limite: tariffa €0,15/minuto.",
      "Notifica automatica al 80% del consumo.",
    ]),
    isMonthly: true,
    sortOrder: 100 + i,
  })),
  
  // ============ CANONI WHATSAPP ============
  ...[
    { code: "CANONE_WA_AVVIO", name: "WhatsApp - Avvio", price: 79, msg: "1.000 msg/mese" },
    { code: "CANONE_WA_CRESCITA", name: "WhatsApp - Crescita", price: 199, msg: "3.000 msg/mese" },
    { code: "CANONE_WA_INTEGRALE", name: "WhatsApp - Integrale", price: 497, msg: "10.000 msg/mese" },
  ].map((c, i) => ({
    code: c.code,
    name: c.name,
    price: c.price,
    block: "CANONI_WA",
    type: "canone",
    positioning: `Canone WhatsApp Business API: ${c.msg} inclusi.`,
    includes: JSON.stringify([
      `${c.msg} outbound inclusi nel canone.`,
      "Le prime 1.000 conversazioni Meta gratuite per tutti i piani.",
      "Sopra il limite: tariffa €0,07/messaggio marketing.",
      "Integrazione CRM bidirezionale.",
    ]),
    isMonthly: true,
    sortOrder: 110 + i,
  })),
  
  // ============ ADS GESTITE ============
  ...[
    { code: "ADS_LITE", name: "ADS Lite", price: 597, budget: "fino a €1.500/mese", desc: "1 canale, PMI piccole" },
    { code: "ADS_STANDARD", name: "ADS Standard", price: 997, budget: "fino a €3.000/mese", desc: "2 canali, PMI medie" },
    { code: "ADS_PRO", name: "ADS Pro", price: 1497, budget: "fino a €6.000/mese", desc: "multi-canale, PMI strutturate" },
  ].map((c, i) => ({
    code: c.code,
    name: c.name,
    price: c.price,
    block: "ADS_GESTITE",
    type: "canone",
    positioning: `Gestione ADS ${c.desc}. Budget media incluso: ${c.budget}.`,
    includes: JSON.stringify([
      `Budget media incluso: ${c.budget} (pagato dal cliente direttamente a Meta/Google).`,
      c.code === "ADS_LITE" ? "1 canale (Meta o Google), 1 campagna + retargeting." : c.code === "ADS_STANDARD" ? "2 canali (Meta + Google), 2-3 campagne attive." : "Multi-canale (Meta + Google + LinkedIn opzionale), 5+ campagne.",
      c.code === "ADS_LITE" ? "Ottimizzazione bisettimanale, A/B testing 2 varianti/mese." : c.code === "ADS_STANDARD" ? "Ottimizzazione settimanale, A/B testing continuo." : "Ottimizzazione tri-settimanale, strategia content adv mensile.",
      c.code === "ADS_LITE" ? "Report mensile sintetico + call 30min." : c.code === "ADS_STANDARD" ? "Report mensile completo + call mensile 60min." : "Report bisettimanale + call quindicinale.",
    ]),
    isMonthly: true,
    sortOrder: 120 + i,
  })),
  
  // ============ DCE ============
  ...[
    { code: "DCE_BASE", name: "DCE Base", price: 1997, target: "3-8 commerciali" },
    { code: "DCE_STRUTTURATO", name: "DCE Strutturato", price: 3497, target: "8-15 commerciali" },
    { code: "DCE_ENTERPRISE", name: "DCE Enterprise", price: 4997, target: "15+ commerciali" },
  ].map((c, i) => ({
    code: c.code,
    name: c.name,
    price: c.price,
    block: "DCE",
    type: "canone",
    positioning: `Direzione Commerciale Esterna per imprese edili ${c.target}. Equivalente a €${c.price * 12}/anno vs €80-120K di un direttore vero.`,
    includes: JSON.stringify([
      c.code === "DCE_BASE" 
        ? "1 call settimanale di allineamento (1h). Revisione pipeline mensile. WhatsApp max 1h/settimana. 1 feedback mensile col titolare."
        : c.code === "DCE_STRUTTURATO"
        ? "1 call settimanale di 2h. Coaching individuale 1 commerciale/mese. Intervento operativo su trattative critiche. 1 sessione strategica trimestrale on-site. 4 QBR/anno inclusi."
        : "2 call settimanali. Coaching individuale 2 commerciali/mese. Intervento operativo illimitato. 1 presenza on-site mensile. Scorecard settimanale. 4 QBR + call mensile straordinaria. Priority WhatsApp 2h/settimana.",
      "Contratto con minimo 6 mesi di committment.",
      "Attualmente gestita solo da Nicola Busca (max 8-10 contratti DCE simultanei).",
    ]),
    objection: "Posso assumere un commerciale junior a €30-40K e formarlo io.",
    response: "Quello è un commerciale, non un direttore. Un direttore guida i commerciali, non vende lui. Un direttore commerciale serio in Italia oggi costa €80-120K all'anno (costo azienda totale). Anche il DCE Enterprise (€60K/anno) costa al massimo il 75% di un direttore vero, ma con tre vantaggi: zero costi di assunzione/selezione, zero rischi di turnover, partenza immediata.",
    isMonthly: true,
    sortOrder: 130 + i,
  })),
];

async function main() {
  console.log("Pulizia database esistente...");
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.discountCode.deleteMany();
  
  console.log(`Inserimento ${products.length} prodotti...`);
  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`✓ ${products.length} prodotti inseriti.`);
  
  // Utente admin iniziale
  const adminEmail = process.env.ADMIN_EMAIL || "nicola@metodocantiere.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "MetodoCantiere2026!";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Nicola Busca",
      role: "admin",
    },
  });
  console.log(`✓ Utente admin creato: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  
  // Utente commerciale esempio (Cristina)
  const cristinaPassword = await bcrypt.hash("Cristina2026!", 10);
  await prisma.user.create({
    data: {
      email: "cristina@metodocantiere.com",
      password: cristinaPassword,
      name: "Cristina",
      role: "commerciale",
    },
  });
  console.log(`✓ Utente Cristina creato: cristina@metodocantiere.com`);
  
  // Codici sconto di esempio (puoi modificarli/eliminarli dal pannello admin)
  const codiciSconto = [
    {
      code: "AMICO-15",
      description: "Sconto promo amici e conoscenze (15%). Da usare con discrezione.",
      discountPercent: 15,
    },
    {
      code: "EARLY-10",
      description: "Sconto early adopter (10%). Per i primi 20 clienti del 2026.",
      discountPercent: 10,
      maxUses: 20,
    },
    {
      code: "EVENTO-20",
      description: "Sconto post-evento o fiera (20%). Validità 30 giorni dopo evento.",
      discountPercent: 20,
    },
  ];
  for (const c of codiciSconto) {
    await prisma.discountCode.create({ data: c });
  }
  console.log(`✓ ${codiciSconto.length} codici sconto di esempio inseriti.`);
}

main()
  .then(() => {
    console.log("\n✓ Seed completato!");
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
