import { Quote, QuoteItem, User } from "@prisma/client";
import { parseRoiSnapshot } from "@/lib/roi";
import {
  addDays,
  escapeHtml,
  formatDate,
  formatEuro,
  getClientDisplayName,
  getDiscountLabel,
} from "./helpers";
import { generateStyles } from "./styles";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;
const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";
const DIAGNOSI_VOUCHER_AMOUNT = 497;

type QuoteWithRelations = Quote & {
  items: QuoteItem[];
  user: Pick<User, "name" | "email">;
};

function safe(v: string | null | undefined) {
  return v ? escapeHtml(v) : "";
}

function pageHeader(pageNum: string) {
  return `
    <div class="page-header">
      <img src="/logo-mc-light.svg" style="height:12mm" />
      <div class="page-num">${pageNum}</div>
    </div>
  `;
}

function splitItems(quote: QuoteWithRelations) {
  const setup = quote.items.filter((i) => !i.isMonthly);
  const monthly = quote.items.filter((i) => i.isMonthly);
  return { setup, monthly };
}

function computeSetupTotals(quote: QuoteWithRelations) {
  const setupBefore = quote.setupBeforeDiscount || quote.totalSetup;
  const voucherDiagnosi = quote.diagnosiGiaPagata ? DIAGNOSI_VOUCHER_AMOUNT : 0;

  const baseAfterVoucher = Math.max(0, setupBefore - voucherDiagnosi);
  const discountAmount =
    quote.discountPercent > 0 ? Math.round(baseAfterVoucher * (quote.discountPercent / 100)) : 0;

  let totalSetup = baseAfterVoucher - discountAmount;
  if (quote.voucherAuditApplied) totalSetup -= 147;
  if (totalSetup < 0) totalSetup = 0;

  return { setupBefore, voucherDiagnosi, discountAmount, totalSetup };
}

function renderCover(quote: QuoteWithRelations) {
  const { primary, secondary } = getClientDisplayName(quote);
  const validUntil = addDays(quote.createdAt, 15);
  return `
  <section class="pdf-page pdf-page-cover">
    <div style="position:absolute;left:0;top:0;right:0;height:4mm;background:var(--mc-orange)"></div>
    <div style="margin-top:6mm">
      <img src="/logo-mc-dark.svg" style="width:50mm" />
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
        Dal contatto al contratto, passo passo
      </div>
    </div>

    <div style="margin-top:18mm">
      <div class="caps orange" style="font-size:9pt">PIANO OPERATIVO</div>
      <div class="orange" style="font-style:italic;font-size:8pt;margin-top:2mm">
        per la tua direzione commerciale
      </div>

      <div class="display" style="margin-top:10mm;font-size:40pt;line-height:1.03">
        <div>Il sistema commerciale</div>
        <div style="font-style:italic;color:var(--mc-orange)">cucito sul tuo cantiere.</div>
      </div>

      <div style="margin-top:10mm;font-style:italic;font-size:11pt;max-width:75%">
        “Prendiamo in mano la direzione commerciale delle imprese strutturate del settore edile,
        dai 5 ai 70 dipendenti, perché smettano di perdere contratti e il titolare possa smettere di fare il venditore.”
      </div>
    </div>

    <div class="no-break" style="margin-top:16mm;border-top:1px solid rgba(255,255,255,0.14);padding-top:10mm">
      <div class="caps orange" style="font-size:8pt">PROPOSTA PER</div>
      <div class="display" style="font-size:18pt;margin-top:2mm">${escapeHtml(primary)}</div>
      ${
        secondary
          ? `<div style="font-size:9pt;margin-top:1mm;color:rgba(250,248,244,0.8)">${escapeHtml(secondary)}</div>`
          : ""
      }
      <div class="caps" style="margin-top:5mm;font-size:8pt;color:rgba(250,248,244,0.9)">
        EMESSA · ${escapeHtml(formatDate(quote.createdAt))}
        &nbsp;|&nbsp;
        VALIDITÀ FINO AL · ${escapeHtml(formatDate(validUntil))}
      </div>
    </div>

    <div class="no-break" style="position:absolute;right:22mm;bottom:24mm;text-align:right">
      <div style="width:28mm;height:28mm;border-radius:999px;background:var(--mc-orange);display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div class="display" style="font-style:italic;font-size:15pt;color:#fff;line-height:1">60</div>
        <div class="caps" style="font-size:6pt;color:#fff;letter-spacing:0.18em;margin-top:1mm">GIORNI</div>
      </div>
      <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm;max-width:52mm">
        Attivazione completa o lo facciamo gratis fino alla fine.
      </div>
    </div>

    <div class="footer">
      Metodo Cantiere · Boutique di Direzione Commerciale Digitale per il settore edile · metodocantiere.com
    </div>
  </section>
  `;
}

function renderPage2(quote: QuoteWithRelations) {
  const hasDiagnosi = !!quote.estrattoDiagnosi;
  return `
  <section class="pdf-page" style="padding-bottom:26mm">
    ${pageHeader("02")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:4mm">Prima del prezzo</div>

    <div class="no-break">
      <div class="caps orange" style="font-size:8pt;margin-bottom:2mm">IL MANIFESTO</div>
      <div class="orange" style="font-weight:800;font-size:13pt;margin-bottom:3mm">Dal contatto al contratto. Passo passo.</div>
      <div style="font-size:11pt">
        La proposta che stai per leggere non è un preventivo. È il piano operativo che nasce da quello che abbiamo visto nella tua azienda.
        Ogni modulo risponde a un anello che oggi si rompe, e ogni prezzo è il costo per ripararlo.
        Niente fuffa, niente servizi decorativi. Come lavori tu in cantiere.
      </div>
      <div style="margin-top:5mm;font-style:italic;font-weight:800;font-size:11pt">
        Le imprese edili strutturate del nord Italia che vogliono smettere di dipendere dalla testa del titolare hanno una sola opzione organizzata: noi.
        Per chi cerca altro, è giusto rivolgersi altrove.
      </div>
      <div style="margin-top:2mm;font-style:italic;font-size:10pt" class="muted">
        Una nota prima che tu vada avanti. Se a fine documento il prezzo ti sembrerà alto, vuol dire che non hai letto bene la pagina 5. È sempre lì la risposta.
      </div>
    </div>

    <div class="no-break" style="margin-top:3mm">
      <div class="caps orange" style="font-size:8pt;margin-bottom:2mm">I TRE LIVELLI DEL SISTEMA</div>
      <div class="grid-3">
        <div class="box" style="background:var(--mc-orange-light)">
          <div class="caps" style="font-size:8pt">LIVELLO 1</div>
          <div class="display" style="font-size:14pt;margin-top:2mm">Setup Sistema</div>
          <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm">
            Le fondamenta. Posizionamento, CRM, materiali commerciali.
          </div>
        </div>
        <div class="box" style="background:var(--mc-beige-warm)">
          <div class="caps" style="font-size:8pt">LIVELLO 2</div>
          <div class="display" style="font-size:14pt;margin-top:2mm">Acceleratori</div>
          <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm">
            WhatsApp, AI Vocale, ADS, funnel, coaching operativo del team.
          </div>
        </div>
        <div class="box" style="background:var(--mc-black);color:var(--mc-beige)">
          <div class="caps" style="font-size:8pt;color:rgba(250,248,244,0.8)">LIVELLO 3</div>
          <div class="display" style="font-size:14pt;margin-top:2mm;font-style:italic">Direzione</div>
          <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm;color:rgba(250,248,244,0.7)">
            La direzione mensile. Senza regia, il sistema muore.
          </div>
        </div>
      </div>
    </div>

    <div class="no-break" style="margin-top:3mm">
      <table style="font-size:9pt;line-height:1.2">
        <thead>
          <tr>
            <th style="background:var(--mc-green);color:#fff;border-bottom:none">SIAMO PER TE SE...</th>
            <th style="background:var(--mc-black);color:#fff;border-bottom:none">NON SIAMO PER TE SE...</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Hai un'impresa strutturata, clienti che pagano in tempo, margini che difendi.</td>
            <td style="background:var(--mc-beige-warm)">✗ Cerchi solo il consulente più economico.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Hai capito che il commerciale non può più dipendere solo dalla tua testa.</td>
            <td style="background:var(--mc-beige-warm)">✗ Vuoi mettere insieme i pezzi tenendo tu il timone.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Vuoi smettere di fare l'acrobata tra clienti, cantieri e preventivi.</td>
            <td style="background:var(--mc-beige-warm)">✗ Ti basta qualcuno che ti dia un'idea ogni tanto.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Cerchi qualcuno che costruisca il sistema invece di ricostruirlo ogni volta che perdi un venditore.</td>
            <td style="background:var(--mc-beige-warm)">✗ Cerchi una consulenza a progetto, non una direzione.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Sei disposto a seguire regole scritte (qualifica, pipeline, incentivi).</td>
            <td style="background:var(--mc-beige-warm)">✗ Vuoi risultati prima di aver costruito il sistema.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Cerchi direzione commerciale, non consulenza a progetto.</td>
            <td style="background:var(--mc-beige-warm)">✗ Non sei disposto a seguire regole scritte sulla gestione commerciale.</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${
      hasDiagnosi
        ? `
    <div class="no-break" style="margin-top:8mm">
      <div class="caps orange" style="font-size:8pt">QUELLO CHE ABBIAMO VISTO IN AZIENDA</div>
      <div style="height:1px;background:var(--mc-orange);margin-top:2mm;margin-bottom:4mm"></div>
      <div style="font-size:11pt">${safe(quote.estrattoDiagnosi)}</div>
    </div>
    `
        : ""
    }

    <div class="no-break" style="margin-top:8mm;display:flex;align-items:center;gap:10px">
      <div style="width:18mm;height:18mm;border-radius:999px;background:var(--mc-orange);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">
        <div style="font-weight:800;font-size:8pt;line-height:1">30</div>
        <div class="caps" style="font-size:6pt;letter-spacing:0.18em;line-height:1;margin-top:1mm">ANNI</div>
      </div>
      <div>
        <div style="font-weight:800;font-size:10pt">30 anni dentro i cantieri.</div>
        <div class="muted" style="font-style:italic;font-size:9pt">Parliamo la tua lingua perché l'abbiamo imparata lavorando.</div>
      </div>
    </div>
  </section>
  `;
}

function renderItemsTable(title: string, subtitle: string, items: QuoteItem[]) {
  if (items.length === 0) return "";
  return `
    <div class="no-break" style="margin-top:6mm">
      <div class="caps orange" style="font-size:8pt">${escapeHtml(title)}</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:1mm">${escapeHtml(
        subtitle
      )}</div>
      <table style="margin-top:3mm">
        <tbody>
          ${items
            .map(
              (i) => `
            <tr>
              <td>${escapeHtml(i.productName)}</td>
              <td class="right"><b>${escapeHtml(formatEuro(i.price * (i.quantity || 1)))}</b></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function categorizeForPage3(quote: QuoteWithRelations) {
  const setup = quote.items.filter(
    (i) => !i.isMonthly && !(quote.diagnosiGiaPagata && i.productCode === DIAGNOSI_CODE)
  );
  const acceleratori = quote.items.filter((i) => i.isMonthly && !i.productCode.startsWith("DCE"));
  const direzione = quote.items.filter((i) => i.isMonthly && i.productCode.startsWith("DCE"));
  return { setup, acceleratori, direzione };
}

function renderPage3(quote: QuoteWithRelations) {
  const cat = categorizeForPage3(quote);
  return `
  <section class="pdf-page">
    ${pageHeader("03")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:5mm">Il piano in dettaglio</div>
    <div style="font-style:italic;font-size:11pt;margin-bottom:6mm">
      Il piano che segue è costruito sugli anelli che abbiamo visto rotti nella tua azienda.
      Non è un catalogo di servizi da scegliere a piacere. È una sequenza di interventi ordinati per impatto,
      ognuno collegato al dolore specifico che toglie.
    </div>

    ${renderItemsTable("SETUP SISTEMA", "Le fondamenta · investimento una tantum", cat.setup)}
    ${renderItemsTable("ACCELERATORI", "Moduli che accorciano i tempi · canoni mensili", cat.acceleratori)}
    ${renderItemsTable("DIREZIONE E COACHING OPERATIVO", "La direzione · canone mensile", cat.direzione)}

    <div class="no-break box box-warm" style="margin-top:8mm;border:0.5pt solid var(--mc-orange)">
      <div class="caps orange" style="font-size:9pt">COSA SUCCEDE OGNI MESE NELLA DIREZIONE</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
        Il prezzo della direzione non paga “essere reperibili”. Paga un ciclo operativo ripetibile, ogni mese, in questa sequenza:
      </div>
      <ol style="margin-top:3mm;padding-left:18px">
        <li><b>Raccolta numeri reali</b> — Lead, chiamate, appuntamenti, preventivi, contratti: tutto dal CRM (e dalle fonti collegate), non “a sensazione”.</li>
        <li><b>Revisione pipeline e colli di bottiglia</b> — Dove si ferma il flusso questo mese: tempi di risposta, preventivi, follow-up, chiusura, selezione clienti.</li>
        <li><b>Decisioni di direzione con te (titolare)</b> — 60 minuti: cosa cambiamo ora, cosa tagliamo, cosa raddoppiamo. Un piano d'azione di 30 giorni con priorità chiare.</li>
        <li><b>Esecuzione guidata su 1–2 leve</b> — Coaching sul gap più costoso e aggiornamento playbook (script, obiezioni, follow-up) con materiale operativo usabile dal team.</li>
        <li><b>Verifica e accountability</b> — KPI aggiornati nel CRM: a fine mese vediamo se le azioni hanno mosso i numeri. Se non li muovono, si corregge rotta.</li>
      </ol>
    </div>

    <div class="no-break" style="margin-top:8mm">
      <table>
        <thead>
          <tr>
            <th style="background:#D4D0C4">OGGI, NELLA TUA AZIENDA</th>
            <th style="background:var(--mc-orange);color:#fff">CON METODO CANTIERE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Sito che non converte, contatti che si perdono</td>
            <td style="background:var(--mc-beige-warm)"><b>Tracciamento attivo, ogni contatto entra nel CRM con la sua origine</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">CRM comprato e mai usato bene</td>
            <td style="background:var(--mc-beige-warm)"><b>CRM popolato, pipeline scritta, regole chiare per ogni stadio</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Risposta al primo contatto in 24-48 ore (quando va bene)</td>
            <td style="background:var(--mc-beige-warm)"><b>Risposta strutturata in meno di 3 ore, AI Vocale che presidia 24/7</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Follow-up affidato alla memoria del titolare</td>
            <td style="background:var(--mc-beige-warm)"><b>Sequenze automatiche e task assegnati, niente preventivo abbandonato</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Pipeline mentale, decisioni prese a naso</td>
            <td style="background:var(--mc-beige-warm)"><b>Dashboard mensile con numeri reali, decisioni prese sui dati</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Venditore che improvvisa ad ogni call</td>
            <td style="background:var(--mc-beige-warm)"><b>Script validato, scorecard, coaching mensile sui gap reali</b></td>
          </tr>
          <tr>
            <td style="background:var(--mc-beige);font-style:italic" class="muted">Marketing che brucia budget senza tracciamento</td>
            <td style="background:var(--mc-beige-warm)"><b>Ogni euro investito ha un ritorno misurabile, niente attività a pioggia</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  `;
}

function renderPage4() {
  return `
  <section class="pdf-page">
    ${pageHeader("04")}
    <div class="display" style="font-style:italic;font-size:24pt;margin-bottom:2mm">Hanno scelto Metodo Cantiere</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:8mm">
      Imprese che hanno smesso di perdere contratti per inerzia di processo
    </div>

    <div class="no-break" style="display:grid;grid-template-columns:26% 74%;gap:10px;margin-bottom:8mm">
      <div class="box box-warm" style="display:flex;align-items:center;justify-content:center">
        <div class="display" style="font-style:italic;font-size:48pt;color:var(--mc-orange)">&lt; 2h</div>
      </div>
      <div class="box" style="background:var(--mc-beige)">
        <div style="font-weight:800;font-size:12pt">Remus Gaita</div>
        <div style="font-size:11pt">Titolare di RGS S.r.l.</div>
        <div class="muted" style="font-style:italic;font-size:8pt;margin-top:1mm">Manutenzione impianti biogas · Piacenza</div>
        <div style="font-family:Times New Roman,Times,serif;font-style:italic;font-size:11pt;margin-top:3mm">
          “Noi pensavamo di avere tutto sotto controllo. Sito funzionante, CRM attivo, rispondevamo a tutti. Poi è arrivata l'analisi di Metodo Cantiere e ci ha fatto vedere i numeri veri.
          Rispondevamo in media dopo 20 ore. Su 10 preventivi ne seguivamo 1. Gli altri 9 li mandavamo e basta.
          Quando Nicola ci ha messo davanti il calcolo di quanti contratti stavamo regalando ai competitor per pura disorganizzazione, non c'era molto da discutere.
          Abbiamo rivisto il processo da zero e attivato l'assistente vocale AI per non perdere più le chiamate quando siamo in impianto.
          Oggi rispondiamo in meno di 2 ore e seguiamo ogni preventivo fino alla firma o al no definitivo.”
        </div>
      </div>
    </div>

    <div class="no-break" style="display:grid;grid-template-columns:26% 74%;gap:10px">
      <div class="box box-warm" style="display:flex;align-items:center;justify-content:center">
        <div class="display" style="font-style:italic;font-size:48pt;color:var(--mc-orange)">+ 40 %</div>
      </div>
      <div class="box" style="background:var(--mc-beige)">
        <div style="font-weight:800;font-size:12pt">Giovanni Casazza</div>
        <div style="font-size:11pt">Titolare di Edil Global Center S.r.l.</div>
        <div class="muted" style="font-style:italic;font-size:8pt;margin-top:1mm">Piscine, edilizia e energie rinnovabili · Cadeo (PC)</div>
        <div style="font-family:Times New Roman,Times,serif;font-style:italic;font-size:11pt;margin-top:3mm">
          “Noi vendiamo e installiamo piscine. Il nostro problema è la stagionalità. Da marzo a giugno le richieste arrivano tutte insieme, poi è tardi.
          Ogni anno perdevamo la stagione allo stesso modo: richieste che si accumulavano, preventivi in ritardo, clienti che nel frattempo firmavano con qualcun altro.
          L'analisi mi ha messo davanti un numero che non volevo vedere: quanti contratti avevamo perso l'anno prima per pura inerzia di processo.
          Abbiamo rifatto tempi di risposta, sequenza di richiamo e materiali di presentazione. La stagione successiva abbiamo chiuso il 40% in più a parità di richieste.”
        </div>
      </div>
    </div>

    <div class="muted" style="font-style:italic;font-size:9pt;text-align:center;margin-top:8mm">
      “Metodo Cantiere ha avviato i primi programmi nel primo trimestre 2026. Queste sono due delle prime imprese che hanno scelto il sistema.
      Ognuna ha portato a casa numeri misurabili nei primi mesi. Una terza realtà, Mydatec, è attualmente in corso con lo sviluppo della rete commerciale B2B.”
    </div>
  </section>
  `;
}

function renderPage5(quote: QuoteWithRelations) {
  const roiSnap = parseRoiSnapshot(quote.roiSnapshot);

  // Fallback per preventivi "legacy": alcuni record possono avere solo roiSnapshot
  // e non i singoli campi roiPreventiviMese/roiImportoMedio/...
  const preventiviMese = quote.roiPreventiviMese ?? roiSnap?.inputs?.preventiviMese ?? null;
  const importoMedio = quote.roiImportoMedio ?? roiSnap?.inputs?.importoMedio ?? null;
  const conv = quote.roiConversioneAttuale ?? roiSnap?.inputs?.conversioneAttuale ?? null;
  const marg = quote.roiMargineCommessa ?? roiSnap?.inputs?.margineCommessa ?? null;

  const roiInputsOk = preventiviMese != null && importoMedio != null && conv != null && marg != null;
  const hasRoi = roiInputsOk;
  const hasRoiData = roiInputsOk;

  let margineAttuale: number | null = null;
  let margineAtteso: number | null = null;
  let investimentoPrimoAnno: number | null = null;
  let roi: number | null = null;
  if (roiInputsOk) {
    const preventiviAnnui = preventiviMese * 12;
    const conversioneAttuale = conv / 100;
    const contrattiAttuali = preventiviAnnui * conversioneAttuale;
    const marginePerContratto = importoMedio * (marg / 100);
    margineAttuale = contrattiAttuali * marginePerContratto;

    const MOLTIPLICATORE_CONVERSIONE = 2.0; // TODO: rendere configurabile in B5.1 (admin RoiSettings)
    const conversioneAttesa = conversioneAttuale * MOLTIPLICATORE_CONVERSIONE;
    const contrattiAttesi = preventiviAnnui * conversioneAttesa;
    margineAtteso = contrattiAttesi * marginePerContratto;

    const setupTotals = computeSetupTotals(quote);
    investimentoPrimoAnno = Math.max(0, setupTotals.totalSetup + quote.totalMonthly * 12);
    const deltaPrimoAnno = margineAtteso - margineAttuale;
    roi = investimentoPrimoAnno > 0 ? deltaPrimoAnno / investimentoPrimoAnno : null;
  }

  let perditaContratti: number | null = null;
  if (hasRoiData && preventiviMese != null && importoMedio != null && conv != null && marg != null) {
    const preventiviAnnui = preventiviMese * 12;
    const contrattiChiusi = preventiviAnnui * (conv / 100);
    const contrattiPersiRecuperabili = (preventiviAnnui - contrattiChiusi) * 0.5 * 0.15;
    const margineMedio = importoMedio * (marg / 100);
    perditaContratti = contrattiPersiRecuperabili * margineMedio;
  }

  return `
  <section class="pdf-page">
    ${pageHeader("05")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">Ritorno e danno evitato</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:6mm">
      Due facce dello stesso conto: cosa puoi guadagnare costruendo il sistema, cosa stai perdendo ogni mese che resta tutto così
    </div>
    <div style="font-style:italic;font-size:11pt;margin-bottom:7mm">
      Quello che Remus e Giovanni hanno misurato a posteriori, noi lo calcoliamo in anticipo sui tuoi dati.
      Due tabelle. Cosa puoi guadagnare costruendo il sistema. Cosa stai perdendo a non farlo.
    </div>

    ${
      hasRoi
        ? `
    <div class="no-break box box-green" style="margin-bottom:8mm">
      <div class="caps muted" style="font-size:8pt">I tuoi numeri di partenza</div>
      <div style="margin-top:2mm;font-size:10pt">
        Preventivi/mese: <b>${escapeHtml(String(preventiviMese))}</b> ·
        Importo medio: <b>${escapeHtml(formatEuro(importoMedio!))}</b> ·
        Conversione attuale: <b>${escapeHtml(String(conv))} %</b> ·
        Margine commessa: <b>${escapeHtml(String(marg))} %</b>
      </div>
      <table style="margin-top:4mm">
        <tbody>
          <tr>
            <td>Margine annuo attuale</td>
            <td class="right"><b>${escapeHtml(formatEuro(Math.round(margineAttuale || 0)))}</b></td>
          </tr>
          <tr>
            <td>Margine annuo atteso (con MC360 in regime)</td>
            <td class="right"><b style="color:var(--mc-green)">${escapeHtml(
              formatEuro(Math.round(margineAtteso || 0))
            )}</b></td>
          </tr>
        </tbody>
      </table>
      <div class="display" style="margin-top:4mm;font-size:14pt;color:var(--mc-green)">
        Delta primo anno: + ${escapeHtml(
          formatEuro(Math.max(0, Math.round((margineAtteso || 0) - (margineAttuale || 0))))
        )}
      </div>
      <div style="margin-top:2mm;font-size:10pt">
        Investimento primo anno: <b>${escapeHtml(formatEuro(investimentoPrimoAnno || 0))}</b> ·
        ROI: <b>${roi != null ? escapeHtml(roi.toFixed(2)) : "—"} ×</b>
      </div>
    </div>
    `
        : ""
    }

    <div class="no-break box box-red">
      <div class="caps" style="font-size:8pt;color:var(--mc-red)">Danno evitato — cosa stai perdendo oggi</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
        Numeri concreti su quanto la situazione attuale ti costa, mese dopo mese. Non proiezioni: perdite reali calcolate sui tuoi dati di partenza.
      </div>

      ${
        hasRoiData
          ? `
      <div style="margin-top:4mm">
        <div style="font-weight:800;font-size:11pt">1) Contratti regalati ai competitor per inerzia di processo</div>
        <div style="font-size:10pt;margin-top:1mm">
          ${
            preventiviMese != null && conv != null
              ? `Dei <b>${escapeHtml(String(preventiviMese * 12))}</b> preventivi annui che invii, l'<b>${escapeHtml(
                  String(Math.max(0, 100 - conv))
                )}</b>% oggi non si chiude.`
              : `Dei preventivi annui che invii, una parte oggi non si chiude.`
          }
          Stima prudente: una quota è recuperabile con follow-up strutturato e regole CRM.
        </div>
        ${
          perditaContratti != null
            ? `<div style="margin-top:1mm;font-weight:800;color:var(--mc-red)">Perdita stimata: ${escapeHtml(
                formatEuro(Math.round(perditaContratti))
              )}/anno</div>`
            : ""
        }
      </div>
      `
          : ""
      }

      <div style="margin-top:4mm">
        <div style="font-weight:800;font-size:11pt">${hasRoiData ? "2" : "1"}) Marketing che gira senza direzione commerciale</div>
        <div style="font-size:10pt;margin-top:1mm">
          Ogni euro investito in marketing che arriva su un processo commerciale non strutturato è budget bruciato a metà.
          Calcolo medio sul tuo settore: 35-45 % di efficienza persa.
        </div>
        <div style="margin-top:1mm;font-weight:800;color:var(--mc-red)">Perdita stimata sul tuo budget marketing annuo: 3.000 - 8.000 €/anno</div>
      </div>

      <div style="margin-top:4mm">
        <div style="font-weight:800;font-size:11pt">${hasRoiData ? "3" : "2"}) Costo opportunità dei clienti sbagliati</div>
        <div style="font-size:10pt;margin-top:1mm">
          Ogni ora che il titolare passa a inseguire un cliente sbagliato è un'ora tolta a un cliente buono. Senza un sistema di selezione, l'agenda si riempie dei primi e i secondi vanno altrove.
        </div>
        <div style="margin-top:1mm;font-weight:800;color:var(--mc-red)">Perdita stimata: a 5 cifre, difficilmente quantificabile a priori</div>
      </div>

      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:5mm">
        Le stime sopra sono prudenti e calibrate sui dati che ci hai dato. La realtà è spesso peggiore. Le rivediamo insieme nella diagnosi e le ricalcoliamo trimestre dopo trimestre.
      </div>
    </div>
  </section>
  `;
}

function renderPage6(quote: QuoteWithRelations) {
  const primoAnnoCompleto =
    typeof quote.totalAnnual === "number" && quote.totalAnnual > 0
      ? quote.totalAnnual
      : quote.totalSetup + quote.totalMonthly * 12;

  const setupTotals = computeSetupTotals(quote);

  const dceMonthly = quote.items
    .filter((i) => i.isMonthly && DCE_ALLOWED_CODES.includes(i.productCode as any))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const crmMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_CRM"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const hasCrmAnnualPrepay = !!quote.scontoCrmAnnuale && crmMonthlyFromItems > 0;
  const crmAnnualFull = hasCrmAnnualPrepay ? crmMonthlyFromItems * 12 : 0;
  const crmAnnualDiscount = hasCrmAnnualPrepay ? Math.round(crmAnnualFull * 0.2) : 0;
  const crmAnnualNet = hasCrmAnnualPrepay ? crmAnnualFull - crmAnnualDiscount : 0;

  const creditoAcceleratori = Math.round(quote.totalSetup * 0.1);
  const direttoreCosto = escapeHtml(formatEuro(primoAnnoCompleto));
  const stripeSetupSconto = Math.round(quote.totalSetup * 0.97);
  const anticipatoSconto = Math.round(primoAnnoCompleto * 0.95);
  const discountLabel = getDiscountLabel(quote);

  return `
  <section class="pdf-page">
    ${pageHeader("06")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:6mm">Riepilogo economico</div>

    <div class="no-break box box-black">
      <table style="border-collapse:collapse">
        <tbody>
          <tr>
            <td colspan="2" style="border-bottom:none;padding-bottom:3mm">
              <div class="caps" style="font-size:8pt;letter-spacing:0.16em;color:rgba(250,248,244,0.75)">SETUP UNA TANTUM</div>
            </td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Setup sistema · una tantum</td>
            <td class="right" style="border-bottom:none"><span style="font-size:18pt">${escapeHtml(
              formatEuro(setupTotals.setupBefore)
            )}</span></td>
          </tr>
          ${
            setupTotals.voucherDiagnosi > 0
              ? `
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Voucher Diagnosi Strategica già versata</td>
            <td class="right" style="border-bottom:none;color:var(--mc-orange)"><b>- ${escapeHtml(
              formatEuro(setupTotals.voucherDiagnosi)
            )}</b></td>
          </tr>
          `
              : ""
          }
          ${
            setupTotals.discountAmount > 0 && discountLabel
              ? `
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">${escapeHtml(discountLabel)}</td>
            <td class="right" style="border-bottom:none;color:var(--mc-orange)"><b>- ${escapeHtml(
              formatEuro(setupTotals.discountAmount)
            )}</b></td>
          </tr>
          `
              : ""
          }
          ${
            quote.voucherAuditApplied
              ? `
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Voucher Audit Lampo</td>
            <td class="right" style="border-bottom:none;color:var(--mc-orange)"><b>- ${escapeHtml(
              formatEuro(147)
            )}</b></td>
          </tr>
          `
              : ""
          }
          <tr><td colspan="2" style="border-bottom:1px solid rgba(250,248,244,0.18);padding-top:2mm"></td></tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Totale setup</td>
            <td class="right" style="border-bottom:none"><span class="display" style="font-style:italic;font-size:24pt;color:var(--mc-orange)">${escapeHtml(
              formatEuro(setupTotals.totalSetup)
            )}</span></td>
          </tr>
          <tr><td colspan="2" style="border-bottom:none;height:4mm"></td></tr>

          <tr>
            <td colspan="2" style="border-bottom:none;padding-bottom:2mm">
              <div class="caps" style="font-size:8pt;letter-spacing:0.16em;color:rgba(250,248,244,0.75)">DIREZIONE MENSILE</div>
            </td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Direzione mensile</td>
            <td class="right" style="border-bottom:none"><span style="font-size:16pt">${escapeHtml(
              formatEuro(dceMonthly)
            )} / mese</span></td>
          </tr>
          ${
            hasCrmAnnualPrepay
              ? `
          <tr><td colspan="2" style="border-bottom:none;height:5mm"></td></tr>
          <tr>
            <td colspan="2" style="border-bottom:none;padding-bottom:2mm">
              <div class="caps" style="font-size:8pt;font-weight:800;letter-spacing:0.14em;color:#2D7A3E">
                HAI SCELTO IL PAGAMENTO ANNUALE ANTICIPATO DEL CANONE CRM
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Canone CRM annuale (12 mesi anticipati)</td>
            <td class="right" style="border-bottom:none;color:rgba(250,248,244,0.9)"><b>${escapeHtml(
              formatEuro(crmAnnualFull)
            )}</b></td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Sconto pagamento anticipato 20%</td>
            <td class="right" style="border-bottom:none;color:var(--mc-orange)"><b>- ${escapeHtml(
              formatEuro(crmAnnualDiscount)
            )}</b></td>
          </tr>
          <tr><td colspan="2" style="border-bottom:1px solid rgba(250,248,244,0.18);padding-top:2mm"></td></tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Totale canone annuale anticipato</td>
            <td class="right" style="border-bottom:none;color:rgba(250,248,244,0.95)"><b>${escapeHtml(
              formatEuro(crmAnnualNet)
            )}</b></td>
          </tr>
          `
              : ""
          }

          <tr><td colspan="2" style="border-bottom:none;height:5mm"></td></tr>
          <tr><td colspan="2" style="border-bottom:2.5pt solid rgba(250,248,244,0.35)"></td></tr>
          <tr><td colspan="2" style="border-bottom:none;height:3mm"></td></tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75);text-transform:uppercase;letter-spacing:0.14em;font-size:9pt"><b>Primo anno completo</b></td>
            <td class="right" style="border-bottom:none"><span class="display" style="font-style:italic;font-size:28pt;color:var(--mc-orange)">${escapeHtml(
              formatEuro(Math.max(0, setupTotals.totalSetup + quote.totalMonthly * 12))
            )}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm;color:rgba(250,248,244,0.55)">
        Quanto costa portare il tuo commerciale a lavorare come una macchina. Tutti gli importi sono al netto di IVA.
      </div>
    </div>

    <div class="no-break box box-green" style="margin-top:8mm">
      <div class="caps" style="font-size:9pt;color:var(--mc-green)">IN PIÙ: CREDITO ACCELERATORI · 10% del Setup</div>
      <div style="margin-top:2mm;font-weight:800;color:var(--mc-green)">
        Sul tuo piano: ${escapeHtml(formatEuro(creditoAcceleratori))}
      </div>
      <div style="margin-top:2mm;font-size:10pt">
        Quando firmi il piano, attiviamo un credito pari al 10% dell'investimento Setup, spendibile sui moduli Acceleratori entro 12 mesi.
        Non è uno sconto sul prezzo del piano. È un'estensione del valore che ti restituiamo per partire più completo.
      </div>
    </div>

    <div class="no-break" style="margin-top:8mm">
      <div class="caps orange" style="font-size:8pt;margin-bottom:3mm">Modalità di pagamento e sconti</div>
      <table>
        <thead>
          <tr>
            <th style="background:var(--mc-beige);color:var(--mc-muted)">STANDARD</th>
            <th style="background:var(--mc-green);color:#fff">STRIPE SETUP · -3%</th>
            <th style="background:var(--mc-orange);color:#fff">ANTICIPATO 12 MESI · -5%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bonifico standard alla firma per il Setup. Direzione mensile addebitata mese per mese.</td>
            <td style="background:var(--mc-green-bg)"><b>Setup ${escapeHtml(
              formatEuro(stripeSetupSconto)
            )}</b> via Stripe. Direzione mensile a parte.</td>
            <td style="background:var(--mc-orange-light)"><b>${escapeHtml(
              formatEuro(anticipatoSconto)
            )}</b> (Setup + 12 mesi) in anticipo alla firma.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="no-break box" style="margin-top:6mm;background:var(--mc-beige);border:1px solid #EDE6D6">
      <div class="caps muted" style="font-size:8pt">IN ALTERNATIVA: RATEIZZAZIONE SU CARTA DI CREDITO</div>
      <div style="margin-top:2mm;font-size:10pt">
        Per Setup superiori a 5.000 € puoi rateizzare con la tua carta di credito aziendale tramite Stripe: 30% all'accettazione del piano,
        il restante 70% in 3 o 6 rate mensili automatiche sulla stessa carta. Le rate non sono cumulabili con gli sconti del 3% o 5%.
      </div>
    </div>

    <div class="no-break" style="margin-top:8mm">
      <div class="caps orange" style="font-size:8pt">Metti Metodo Cantiere a confronto</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:1mm">La direzione commerciale strutturata, normalmente, costa così</div>
      <table style="margin-top:3mm">
        <thead>
          <tr>
            <th style="background:var(--mc-beige)">VOCE DI COSTO</th>
            <th style="background:var(--mc-beige);color:var(--mc-blue)">DIRETTORE COMMERCIALE INTERNO</th>
            <th style="background:var(--mc-orange-light);color:var(--mc-orange)">METODO CANTIERE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Costo annuo lordo (RAL + contributi + auto + premi)</td>
            <td style="background:var(--mc-blue-bg)">85.000 - 120.000 €</td>
            <td style="background:var(--mc-orange-light)"><b>${direttoreCosto}</b></td>
          </tr>
          <tr>
            <td>Tempo per averlo operativo</td>
            <td style="background:var(--mc-blue-bg)">3 - 6 mesi (ricerca + onboarding)</td>
            <td style="background:var(--mc-orange-light)"><b>7 giorni dalla firma</b></td>
          </tr>
          <tr>
            <td>Costo di ricerca e selezione</td>
            <td style="background:var(--mc-blue-bg)">Head hunter: 5.000 - 15.000 €</td>
            <td style="background:var(--mc-orange-light)"><b>incluso</b></td>
          </tr>
          <tr>
            <td>Rischio di assunzione sbagliata</td>
            <td style="background:var(--mc-blue-bg)">alto (30-40% dei casi)</td>
            <td style="background:var(--mc-orange-light)"><b>zero (uscita prevista)</b></td>
          </tr>
          <tr>
            <td>Esperienza nel settore edile</td>
            <td style="background:var(--mc-blue-bg)">da verificare caso per caso</td>
            <td style="background:var(--mc-orange-light)"><b>30 anni reali</b></td>
          </tr>
          <tr>
            <td>Continuità in caso di malattia o uscita</td>
            <td style="background:var(--mc-blue-bg)">sistema si ferma</td>
            <td style="background:var(--mc-orange-light)"><b>team che presidia continuativo</b></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="no-break box box-blue" style="margin-top:6mm">
      <div style="font-weight:800;font-size:11pt">
        Io dirigo la macchina. Il mio team la fa girare ogni giorno. È come funziona qualunque azienda ben organizzata: chi decide non è la stessa persona che esegue.
      </div>
      <div style="margin-top:2mm;font-size:10pt">
        Metodo Cantiere non sostituisce un direttore commerciale interno full-time. Lo anticipa. Ti dà la funzione direzionale, il sistema, gli strumenti e la direzione mensile,
        mentre tu cresci. Quando sarai pronto a inserire un direttore tuo, noi ti aiuteremo a selezionarlo, formarlo e a passargli le consegne in modo ordinato.
      </div>
    </div>

    <div class="no-break" style="margin-top:6mm;padding:10px 12px;background:var(--mc-orange);color:var(--mc-black);border-radius:10px">
      <div class="caps" style="font-size:9pt">LA NOSTRA GARANZIA</div>
      <div style="margin-top:2mm;font-size:10pt">
        Attivazione completa entro 60 giorni dalla firma. Se non ci arriviamo, continuiamo a lavorare gratis fino a quando il sistema è operativo.
        Senza eccezioni, senza clausole nascoste.
      </div>
    </div>
  </section>
  `;
}

function renderPage7(quote: QuoteWithRelations) {
  const { primary } = getClientDisplayName(quote);
  return `
  <section class="pdf-page">
    ${pageHeader("07")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">Per partire davvero</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:6mm">
      Cosa serve da parte tua, e cosa succede dalla firma in poi
    </div>

    <div class="no-break box box-warm" style="border:0.5pt solid var(--mc-orange)">
      <div class="caps orange" style="font-size:9pt">COSA TI CHIEDIAMO PER PARTIRE</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
        Per costruire il sistema sulla tua impresa abbiamo bisogno da te di cinque cose. Niente di pesante, ma necessarie.
      </div>
      <ol style="margin-top:3mm;padding-left:18px">
        <li><b>Accessi</b> — Sito web, social, email aziendale, eventuale CRM precedente.</li>
        <li><b>Materiali aziendali</b> — Foto dei lavori fatti e dei cantieri in corso, brochure esistenti, listino attuale.</li>
        <li><b>Elenchi</b> — Clienti storici e fornitori abituali (anche su Excel).</li>
        <li><b>Decisione del referente operativo</b> — Una persona sola come punto di contatto operativo.</li>
        <li><b>Tempo</b> — Quattro call di onboarding nel primo mese, poi una call di direzione al mese.</li>
      </ol>
    </div>

    <div class="no-break" style="margin-top:7mm">
      <div class="caps orange" style="font-size:8pt">PROSSIMI PASSI</div>
      <ol style="margin-top:2mm;padding-left:18px;font-size:12pt">
        <li>Conferma del piano operativo entro la validità (15 giorni dalla data di emissione).</li>
        <li>Firma del contratto e pagamento del setup. Primo addebito direzione al lancio operativo.</li>
        <li>Call di onboarding con il team Metodo Cantiere entro 7 giorni dalla firma.</li>
        <li>Lancio operativo del sistema con KPI dei primi 90 giorni concordati insieme.</li>
      </ol>
    </div>

    <div class="no-break" style="margin-top:7mm;background:var(--mc-beige);border:1px solid #EDE6D6;border-radius:10px;padding:12px 14px">
      <div class="caps orange" style="font-size:8pt;margin-bottom:3mm">PER ACCETTAZIONE DEL PIANO</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:10pt">
        <div>
          <div class="muted" style="font-style:italic;font-size:8pt">Data</div>
          <div style="height:12mm;border-bottom:1px solid var(--mc-border)"></div>
        </div>
        <div>
          <div class="muted" style="font-style:italic;font-size:8pt">Firma</div>
          <div style="height:12mm;border-bottom:1px solid var(--mc-border)"></div>
        </div>
        <div>
          <div class="muted" style="font-style:italic;font-size:8pt">Nome e cognome</div>
          <div style="height:12mm;border-bottom:1px solid var(--mc-border)"></div>
        </div>
        <div>
          <div class="muted" style="font-style:italic;font-size:8pt">Ruolo</div>
          <div style="height:12mm;border-bottom:1px solid var(--mc-border)"></div>
        </div>
      </div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:3mm">
        Proposta per: <b>${escapeHtml(primary)}</b>
      </div>
    </div>

    <div class="no-break" style="margin-top:6mm">
      <div class="caps orange" style="font-size:8pt;margin-bottom:2mm">DOMANDE CHE CI FANNO TUTTI</div>

      <div class="no-break box box-warm" style="border:1px solid #EDE6D6;margin-top:3mm">
        <div style="font-weight:800;font-size:11pt">E se il mio team non vuole usare il CRM?</div>
        <div style="margin-top:2mm;font-size:10pt">
          È la causa numero uno per cui le implementazioni CRM falliscono nelle aziende edili. Per questo il setup non parte mai senza una call con la persona che dovrà usarlo ogni giorno.
          Se sentiamo resistenza forte, ti aiutiamo a riconfigurare i ruoli prima di partire.
        </div>
      </div>

      <div class="no-break box box-warm" style="border:1px solid #EDE6D6;margin-top:3mm">
        <div style="font-weight:800;font-size:11pt">E se Metodo Cantiere sparisce dopo aver incassato?</div>
        <div style="margin-top:2mm;font-size:10pt">
          La call di direzione mensile è scritta nel contratto, non promessa a voce. La fee di direzione mensile la paghi solo se le call avvengono.
          Vedi il team in onboarding, parli con loro nelle call di lavoro: direzione decide e indirizza, il team esegue.
        </div>
      </div>

      <div class="no-break box box-warm" style="border:1px solid #EDE6D6;margin-top:3mm">
        <div style="font-weight:800;font-size:11pt">Quanto sono vincolato? E se voglio uscire prima?</div>
        <div style="margin-top:2mm;font-size:10pt">
          La direzione mensile prevede una permanenza di 6 mesi minimi. Dopo i 6 mesi sei libero di uscire mese su mese, senza penali, con preavviso di 30 giorni.
          La garanzia 60 giorni copre la fase di attivazione: se entro 60 giorni il sistema non è operativo, continuiamo a lavorare gratis fino a quando lo è.
        </div>
      </div>
    </div>

    <div style="margin-top:6mm;text-align:center;font-style:italic;font-size:11pt">
      “Se in 15 giorni non sei pronto a firmare, vuol dire che non è il momento, e lasciamo stare. Non vogliamo che tu prenda Metodo Cantiere per stanchezza o per fretta. Si prende per scelta.”
    </div>
  </section>
  `;
}

export function generateTemplate(quote: QuoteWithRelations): string {
  const styles = generateStyles();
  const { setup, monthly } = splitItems(quote);

  // Accesso ai valori evita unused warnings (ci servono per template in evoluzione)
  void setup;
  void monthly;

  return `
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <title>Piano Operativo ${escapeHtml(quote.quoteNumber)}</title>
    <style>${styles}</style>
  </head>
  <body>
    ${renderCover(quote)}
    ${renderPage2(quote)}
    ${renderPage3(quote)}
    ${renderPage4()}
    ${renderPage5(quote)}
    ${renderPage6(quote)}
    ${renderPage7(quote)}
  </body>
</html>
  `;
}

