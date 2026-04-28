import { Quote, QuoteItem, User } from "@prisma/client";
import { canonePrepayFromMonthly, computeCreditoMetodoCantiere } from "@/lib/discounts";
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

/** Blocco tabellare PDF: canone annuale anticipato (stesso layout del CRM). */
function pdfCanoneAnticipatoRows(args: {
  titolo: string;
  rigaLordoLabel: string;
  rigaScontoLabel: string;
  fullAnnual: number;
  discountAmount: number;
  netOneTime: number;
}): string {
  return `
          <tr><td colspan="2" style="border-bottom:none;height:5mm"></td></tr>
          <tr>
            <td colspan="2" style="border-bottom:none;padding-bottom:2mm">
              <div class="caps" style="font-size:8pt;font-weight:800;letter-spacing:0.14em;color:#2D7A3E">
                ${args.titolo}
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">${escapeHtml(args.rigaLordoLabel)}</td>
            <td class="right" style="border-bottom:none;color:rgba(250,248,244,0.9)"><b>${escapeHtml(
              formatEuro(args.fullAnnual)
            )}</b></td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">${escapeHtml(args.rigaScontoLabel)}</td>
            <td class="right" style="border-bottom:none;color:var(--mc-orange)"><b>- ${escapeHtml(
              formatEuro(args.discountAmount)
            )}</b></td>
          </tr>
          <tr><td colspan="2" style="border-bottom:1px solid rgba(250,248,244,0.18);padding-top:2mm"></td></tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Totale canone annuale anticipato</td>
            <td class="right" style="border-bottom:none;color:rgba(250,248,244,0.95)"><b>${escapeHtml(
              formatEuro(args.netOneTime)
            )}</b></td>
          </tr>`;
}

function computeSetupTotals(quote: QuoteWithRelations) {
  const setupBefore = quote.setupBeforeDiscount || quote.totalSetup;
  const voucherDiagnosi = quote.diagnosiGiaPagata ? DIAGNOSI_VOUCHER_AMOUNT : 0;

  const baseAfterVoucher = Math.max(0, setupBefore - voucherDiagnosi);
  const isVolumeLegacy =
    quote.discountType === "volume_5" || quote.discountType === "volume_10";
  const storedDiscount = quote.discountAmount ?? 0;
  const rawDiscountFromQuote =
    storedDiscount > 0
      ? Math.min(storedDiscount, baseAfterVoucher)
      : quote.discountPercent > 0
        ? Math.round(baseAfterVoucher * (quote.discountPercent / 100))
        : 0;
  // Storico volume_*: lo sconto non era applicato al totale setup in fattura preventivo.
  const discountAmount = isVolumeLegacy ? 0 : rawDiscountFromQuote;

  let totalSetup = baseAfterVoucher - discountAmount;
  if (quote.voucherAuditApplied) totalSetup -= 147;
  if (totalSetup < 0) totalSetup = 0;

  const grossSetupModuli = Math.max(0, Math.round(Number(quote.setupBeforeDiscount) || 0));
  const creditoMetodoCantiere = computeCreditoMetodoCantiere({
    setupBeforeDiscount: grossSetupModuli > 0 ? grossSetupModuli : Math.max(0, setupBefore),
    diagnosiGiaPagata: !!quote.diagnosiGiaPagata,
    voucherAuditApplied: !!quote.voucherAuditApplied,
    discountType: quote.discountType,
    discountAmount: quote.discountAmount,
    discountPercent: quote.discountPercent,
  });

  return {
    setupBefore,
    voucherDiagnosi,
    discountAmount,
    totalSetup,
    creditoMetodoCantiere,
  };
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
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:4mm">02 Prima del prezzo</div>

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
            Le fondamenta che mancavano. Posizionamento, CRM, materiali commerciali. Il punto da cui ogni impresa edile
            dovrebbe partire per smettere di improvvisare la vendita.
          </div>
        </div>
        <div class="box" style="background:var(--mc-beige-warm)">
          <div class="caps" style="font-size:8pt">LIVELLO 2</div>
          <div class="display" style="font-size:14pt;margin-top:2mm">Acceleratori</div>
          <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm">
            Le leve che riducono i tempi tra contatto e contratto. WhatsApp, AI Vocale, ADS, funnel, coaching operativo
            del team. Si attivano sopra un sistema che ha già le fondamenta in ordine.
          </div>
        </div>
        <div class="box" style="background:var(--mc-black);color:var(--mc-beige)">
          <div class="caps" style="font-size:8pt;color:rgba(250,248,244,0.8)">LIVELLO 3</div>
          <div class="display" style="font-size:14pt;margin-top:2mm;font-style:italic">Direzione</div>
          <div class="muted" style="font-style:italic;font-size:8pt;margin-top:2mm;color:rgba(250,248,244,0.7)">
            Il presidio strategico continuativo. Per chi vuole il sistema commerciale gestito mese dopo mese da chi
            l'ha costruito, con revisione della pipeline, decisioni prese sui dati e accountability sul team commerciale.
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
            <td style="background:var(--mc-beige-warm)">✗ Preferisci interventi spot al posto di un sistema replicabile.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Sei disposto a seguire regole scritte (qualifica, pipeline, incentivi).</td>
            <td style="background:var(--mc-beige-warm)">✗ Vuoi risultati prima di aver costruito il sistema.</td>
          </tr>
          <tr>
            <td style="background:var(--mc-green-bg)"><b>✓</b> Vuoi un sistema commerciale strutturato, non un singolo intervento spot.</td>
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
    ${pageHeader("05")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:5mm">05 Cosa costruiamo per te</div>
    <div style="font-style:italic;font-size:11pt;margin-bottom:6mm">
      Il piano che segue è costruito sugli anelli che abbiamo visto rotti nella tua azienda.
      Non è un catalogo di servizi da scegliere a piacere. È una sequenza di interventi ordinati per impatto,
      ognuno collegato al dolore specifico che toglie.
    </div>

    ${renderItemsTable("SETUP SISTEMA", "Le fondamenta · investimento una tantum", cat.setup)}
    ${renderItemsTable("ACCELERATORI", "Moduli che accorciano i tempi · canoni mensili", cat.acceleratori)}

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

    ${renderItemsTable("DIREZIONE E COACHING OPERATIVO", "La direzione · canone mensile", cat.direzione)}
  </section>
  `;
}

function renderCosaSuccedeOgniMese() {
  return `
  <section class="pdf-page">
    ${pageHeader("06")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:4mm">06 Cosa succede ogni mese</div>

    <div class="no-break" style="margin-top:2mm">
      <div class="box" style="background:var(--mc-beige);border:1px solid #EDE6D6">
        <div class="caps orange" style="font-size:9pt">METODO CANTIERE — SEMPRE</div>
        <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
          Ogni mese, un ciclo operativo ripetibile in 5 fasi.
        </div>
        <ol style="margin-top:3mm;padding-left:18px;font-size:10.5pt;line-height:1.45">
          <li><b>Raccolta numeri reali</b> — Lead, chiamate, appuntamenti, preventivi, contratti: tutto dal CRM, non a sensazione. I numeri diventano il tuo cruscotto di comando.</li>
          <li><b>Revisione pipeline e colli di bottiglia</b> — Dove si ferma il flusso questo mese: tempi di risposta, preventivi fermi, follow up mancati, clienti non qualificati. Il sistema te lo mostra, tu decidi dove intervenire.</li>
          <li><b>Decisioni operative</b> — Cosa cambiare ora, cosa tagliare, cosa raddoppiare. Un piano d'azione di 30 giorni con priorità chiare, non una lista infinita di cose da fare.</li>
          <li><b>Esecuzione su 1 o 2 leve</b> — Focus sul gap più costoso del mese. Aggiornamento playbook, script, gestione obiezioni, sequenze di follow up. Materiale operativo pronto per il team.</li>
          <li><b>Verifica e accountability</b> — KPI aggiornati nel CRM: a fine mese vedi se le azioni hanno mosso i numeri. Se non li muovono, si corregge rotta.</li>
        </ol>
      </div>

      <div class="no-break" style="margin-top:8mm">
        <div style="padding:18px;border:1px solid rgba(255,106,0,0.28);border-left:4px solid #FF6A00;background:#1a1a1a;color:#FAF8F4;border-radius:10px">
          <div class="caps" style="font-size:10pt;color:#fff;letter-spacing:0.12em">SE ATTIVI ANCHE LA DIREZIONE</div>
          <div style="margin-top:3mm;font-size:10.5pt;line-height:1.5;color:rgba(250,248,244,0.88)">
            Il metodo funziona anche da solo, ma con la <b>Direzione</b> non sei solo a guidarlo.
            Ogni mese lavoriamo insieme: leggiamo i numeri con te, identifichiamo il collo di bottiglia, prendiamo le decisioni operative in una sessione di <b>60 minuti</b> col titolare, e ti affianchiamo nell'esecuzione.
            Tu metti il team, noi mettiamo il presidio strategico. Mese dopo mese, il sistema migliora perché qualcuno lo tiene vivo.
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}


/** Pag. 4 (prima facciata): intro + Remus + Giovanni — il testo completo per Mydatec è su 4b per evitare taglio in PDF (altezza A4 fissa). */
function renderPage4aTestimonianze() {
  return `
  <section class="pdf-page">
    ${pageHeader("04")}
    <div class="display" style="font-style:italic;font-size:24pt;margin-bottom:2mm">04 Hanno scelto Metodo Cantiere</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:4mm">
      Imprese che hanno smesso di perdere contratti per inerzia di processo
    </div>

    <div class="no-break" style="font-size:10pt;margin-bottom:8mm;line-height:1.45">
      Alcuni dei clienti con cui lavoriamo, su segmenti diversi del settore: manutenzione impianti, edilizia residenziale, B2B industriale premium.
      Ogni realtà ha portato a casa risultati misurabili lavorando sui propri anelli rotti. Alcuni li seguiamo a livello di metodo e team operativo,
      altri richiedono un presidio diretto: il segmento decide quale livello di interlocuzione serve.
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
  </section>
  `;
}

/** Continuazione pag. 4: testimonianza Mydatec (case study consulente) — stesso numero di sezione, facciata dedicata per PDF completo. */
function renderPage4bMydatec() {
  return `
  <section class="pdf-page">
    ${pageHeader("04")}
    <div class="display" style="font-style:italic;font-size:24pt;margin-bottom:1mm">04 Hanno scelto Metodo Cantiere</div>
    <div class="caps muted" style="font-size:7.5pt;letter-spacing:0.2em;margin-bottom:6mm">segue</div>

    <div class="no-break" style="display:grid;grid-template-columns:26% 74%;gap:10px">
      <div class="box box-warm" style="display:flex;align-items:center;justify-content:center">
        <div class="display" style="font-style:italic;font-size:22pt;color:var(--mc-orange);letter-spacing:0.02em">B2B</div>
      </div>
      <div class="box" style="background:var(--mc-beige)">
        <div style="font-weight:800;font-size:12pt">Mydatec</div>
        <div class="muted" style="font-style:italic;font-size:8pt;margin-top:1mm">Pompe di calore con VMC integrata · Italia</div>
        <div class="muted" style="font-style:italic;font-size:8.5pt;margin-top:3mm;color:var(--mc-muted)">Dal nostro lavoro in corso:</div>
        <div style="font-size:10.5pt;margin-top:2mm;line-height:1.5">
          Mydatec è uno dei clienti che seguiamo in prima persona, perché il segmento richiede un livello di interlocuzione che non si delega. Abbiamo lavorato in due tempi.
          Prima abbiamo studiato una nicchia strategica del loro mercato che nessuno aveva ancora aggredito davvero: i grossi costruttori e i player nazionali dello sviluppo immobiliare,
          dove un sistema integrato pompa di calore + VMC è scelta tecnica e architetturale, non commodity da listino. Abbiamo capito come compra quel tipo di cliente, chi decide, in che tempi, con quali criteri.
          Poi abbiamo iniziato a formare la rete vendita con un processo strutturato e ripetibile, fatto di passi chiari e definiti.
          Non solo perché serviva ai venditori di oggi, ma perché un processo scritto è l'unico modo di inserire nuove figure nel team senza ricominciare da capo ogni volta.
          Oggi sono nelle prime trattative con player che prima non sapevano nemmeno della loro esistenza.
        </div>
      </div>
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
  let deltaPrimoAnno: number | null = null;
  let roi: number | null = null;
  if (roiInputsOk && roiSnap) {
    margineAttuale = roiSnap.margineAnnuoBaseline;
    margineAtteso = roiSnap.margineStimatoProposta;
    investimentoPrimoAnno = roiSnap.valoreFatturatoProposta;
    roi = roiSnap.indice ?? null;
    if (margineAtteso != null && margineAttuale != null) {
      deltaPrimoAnno = margineAtteso - margineAttuale;
    }
  }

  let perditaContratti: number | null = null;
  let voce1ChiusiLabel: string | null = null;
  if (hasRoiData && preventiviMese != null && importoMedio != null && conv != null && marg != null) {
    const preventiviAnnui = preventiviMese * 12;
    const contrattiChiusi = preventiviAnnui * (conv / 100);
    if (contrattiChiusi < 1) voce1ChiusiLabel = "meno di 1";
    else if (contrattiChiusi < 3) voce1ChiusiLabel = "1-2";
    else voce1ChiusiLabel = String(Math.round(contrattiChiusi));
    const contrattiPersiRecuperabili = (preventiviAnnui - contrattiChiusi) * 0.5 * 0.15;
    const margineMedio = importoMedio * (marg / 100);
    perditaContratti = contrattiPersiRecuperabili * margineMedio;
  }

  return `
  <section class="pdf-page">
    ${pageHeader("03")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">03 Ritorno e danno evitato</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:6mm">
      Due facce dello stesso conto: cosa puoi guadagnare costruendo il sistema, cosa stai perdendo ogni mese che resta tutto così
    </div>
    <div style="font-style:italic;font-size:11pt;margin-bottom:7mm">
      <b>Di solito questi numeri li vedi a posteriori.</b> Quando è tardi: preventivi persi, follow-up saltati, margini regalati.
      <br />
      <b>Noi li mettiamo sul tavolo prima</b>, usando i tuoi dati: due conti semplici.
      <br />
      <b>1) Cosa puoi recuperare costruendo il sistema.</b> <b>2) Cosa stai già perdendo ogni mese</b> lasciandolo com’è.
      <br />
      Nelle pagine successive vedi esempi reali di aziende che hanno scoperto lo stesso “buco” solo dopo.
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
          formatEuro(Math.max(0, Math.round(deltaPrimoAnno ?? 0)))
        )}
      </div>
      <div class="muted" style="margin-top:2mm;font-style:italic;font-size:9pt">
        Nota: in questa pagina ti mostriamo il <b>perché</b> dei numeri (cosa stai guadagnando e cosa stai perdendo).
        Il valore ROI completo e l’investimento del primo anno li trovi dopo il riepilogo economico, insieme alla nostra offerta.
      </div>
      <div class="muted" style="margin-top:1.5mm;font-style:italic;font-size:9pt">
        In più, c’è anche un <b>credito riutilizzabile</b> per i prossimi 12 mesi sul listino: lo quantifichiamo nel riepilogo economico.
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
            preventiviMese != null && conv != null && voce1ChiusiLabel != null
              ? `Dei <b>${escapeHtml(String(preventiviMese * 12))}</b> preventivi annui che invii, oggi si chiudono in <b>${escapeHtml(
                  voce1ChiusiLabel
                )}</b> (conversione del <b>${escapeHtml(String(conv))}</b>%). Una parte significativa degli altri è recuperabile con follow-up strutturato e regole CRM.`
              : `Dei preventivi annui che invii, oggi una parte resta fuori conversione. Una parte significativa degli altri è recuperabile con follow-up strutturato e regole CRM.`
          }
        </div>
        ${
          perditaContratti != null
            ? `<div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">Stima prudente (danno evitato):</div>
        <div style="margin-top:1mm;font-weight:800;color:var(--mc-red)">Perdita stimata: ${escapeHtml(
                formatEuro(Math.round(perditaContratti))
              )}/anno</div>`
            : ""
        }
        <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
          Questa stima è un ordine di grandezza del margine che oggi lasci sul tavolo per inerzia di processo: non è il calcolo ROI e non dipende dai moduli scelti.
        </div>
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

  /** Tutti i canoni addebitati mese per mese (Direzione DCE, CRM se non anticipato, ecc.) — allineato a quote.totalMonthly. */
  const canoniMensiliRicorrenti =
    typeof quote.totalMonthly === "number" ? Math.max(0, quote.totalMonthly) : 0;

  const crmMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_CRM"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const aiMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_AI"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const waMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_WA"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const crmPrepay =
    !!quote.scontoCrmAnnuale && crmMonthlyFromItems > 0
      ? canonePrepayFromMonthly(crmMonthlyFromItems, "CRM")
      : null;
  const aiPrepay =
    !!quote.scontoAiVocaleAnnuale && aiMonthlyFromItems > 0
      ? canonePrepayFromMonthly(aiMonthlyFromItems, "AIVOCALE")
      : null;
  const waPrepay =
    !!quote.scontoWaAnnuale && waMonthlyFromItems > 0 ? canonePrepayFromMonthly(waMonthlyFromItems, "WA") : null;

  const crmAnticipatoHtml = crmPrepay
    ? pdfCanoneAnticipatoRows({
        titolo: "HAI SCELTO IL PAGAMENTO ANNUALE ANTICIPATO DEL CANONE CRM",
        rigaLordoLabel: "Canone CRM annuale (12 mesi anticipati)",
        rigaScontoLabel: "Sconto pagamento anticipato 20%",
        fullAnnual: crmPrepay.fullAnnual,
        discountAmount: crmPrepay.discountAmount,
        netOneTime: crmPrepay.netOneTime,
      })
    : "";

  const aiAnticipatoHtml = aiPrepay
    ? pdfCanoneAnticipatoRows({
        titolo: "HAI SCELTO IL PAGAMENTO ANNUALE ANTICIPATO DEL CANONE AI VOCALE",
        rigaLordoLabel: "Canone AI Vocale annuale (12 mesi anticipati)",
        rigaScontoLabel: "Sconto pagamento anticipato 15%",
        fullAnnual: aiPrepay.fullAnnual,
        discountAmount: aiPrepay.discountAmount,
        netOneTime: aiPrepay.netOneTime,
      })
    : "";

  const waAnticipatoHtml = waPrepay
    ? pdfCanoneAnticipatoRows({
        titolo: "HAI SCELTO IL PAGAMENTO ANNUALE ANTICIPATO DEL CANONE WHATSAPP",
        rigaLordoLabel: "Canone WhatsApp annuale (12 mesi anticipati)",
        rigaScontoLabel: "Sconto pagamento anticipato 15%",
        fullAnnual: waPrepay.fullAnnual,
        discountAmount: waPrepay.discountAmount,
        netOneTime: waPrepay.netOneTime,
      })
    : "";

  const direttoreCosto = escapeHtml(formatEuro(primoAnnoCompleto));
  const stripeSetupSconto = Math.round(setupTotals.totalSetup * 0.97);
  const anticipatoSconto = Math.round(primoAnnoCompleto * 0.95);
  const discountLabel = getDiscountLabel(quote);

  return `
  <section class="pdf-page">
    ${pageHeader("07")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:6mm">07 Riepilogo economico</div>

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
              <div class="caps" style="font-size:8pt;letter-spacing:0.16em;color:rgba(250,248,244,0.75)">CANONI MENSILI</div>
            </td>
          </tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75)">Totale canoni mensili (addebito mese per mese)</td>
            <td class="right" style="border-bottom:none"><span style="font-size:16pt">${escapeHtml(
              formatEuro(canoniMensiliRicorrenti)
            )} / mese</span></td>
          </tr>
          ${crmAnticipatoHtml}
          ${aiAnticipatoHtml}
          ${waAnticipatoHtml}

          <tr><td colspan="2" style="border-bottom:none;height:5mm"></td></tr>
          <tr><td colspan="2" style="border-bottom:2.5pt solid rgba(250,248,244,0.35)"></td></tr>
          <tr><td colspan="2" style="border-bottom:none;height:3mm"></td></tr>
          <tr>
            <td style="border-bottom:none;color:rgba(250,248,244,0.75);text-transform:uppercase;letter-spacing:0.14em;font-size:9pt"><b>Primo anno completo</b></td>
            <td class="right" style="border-bottom:none"><span class="display" style="font-style:italic;font-size:28pt;color:var(--mc-orange)">${escapeHtml(
              formatEuro(Math.max(0, primoAnnoCompleto))
            )}</span></td>
          </tr>
        </tbody>
      </table>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm;color:rgba(250,248,244,0.55)">
        Il totale «primo anno» somma setup, eventuali canoni pagati in anticipo (CRM −20%, AI Vocale e WhatsApp −15%) e dodici rate dei canoni mensili ricorrenti: non coincide con l'importo una tantum alla firma, che è setup più solo le voci anticipate.
        Tutti gli importi sono al netto di IVA.
      </div>
    </div>

    <div class="no-break box box-green" style="margin-top:8mm;padding:4mm 5mm">
      <div class="caps" style="font-size:9.5pt;font-weight:800;color:#2D7A3E;letter-spacing:0.04em">
        HAI UN CREDITO DI ${escapeHtml(formatEuro(setupTotals.creditoMetodoCantiere))}
      </div>
      <div style="margin-top:2mm;font-size:9.5pt;color:var(--mc-muted)">spendibile nei prossimi 12 mesi su nuovi acquisti</div>
      <div style="margin-top:3mm;font-size:9pt;line-height:1.45;color:var(--mc-black)">
        Il credito è il 10% sul netto setup modulo listino (dopo voucher Diagnosi/Audit e sconto codice sul setup); i canoni
        in anticipo annuo non entrano in questa base. Spendibile entro 12 mesi su qualunque voce del listino — AI Vocale,
        Bundle Multicanale, Direzione mensile e altro.
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

function renderPage8Roi(quote: QuoteWithRelations) {
  const roiSnap = parseRoiSnapshot(quote.roiSnapshot);
  const investimento = roiSnap?.valoreFatturatoProposta ?? null;
  const roi = roiSnap?.indice ?? null;
  const margineAttuale = roiSnap?.margineAnnuoBaseline ?? null;
  const margineAtteso = roiSnap?.margineStimatoProposta ?? null;
  const delta = margineAtteso != null && margineAttuale != null ? margineAtteso - margineAttuale : null;

  // Il credito lo riprendiamo qui come leva, ma l’importo lo lasciamo al riepilogo economico (pag. 07).
  const setupTotals = computeSetupTotals(quote);

  return `
  <section class="pdf-page">
    ${pageHeader("08")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">08 ROI e investimento</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:6mm">
      Prima la spiegazione, poi i numeri: come leggere il conto del primo anno
    </div>

    <div class="no-break box" style="background:var(--mc-beige);border:1px solid #EDE6D6">
      <div style="font-weight:800;font-size:11pt">Il conto vero</div>
      <div style="margin-top:2mm;font-size:10pt;line-height:1.45">
        Qui non stai comprando “marketing”. Stai comprando un sistema commerciale che smette di disperdere preventivi, tempo e budget.
        Il ROI nasce da due cose misurabili: <b>più conversione</b> sui preventivi che già fai e <b>meno dispersione</b> nel follow-up.
      </div>
      <div class="muted" style="margin-top:2mm;font-style:italic;font-size:9pt">
        I valori sotto sono stime prudenziali basate sui dati che ci hai dato e sul peso dei moduli scelti.
      </div>
    </div>

    <div class="no-break box box-black" style="margin-top:6mm">
      <div class="caps" style="font-size:8pt;letter-spacing:0.16em;color:rgba(250,248,244,0.75)">NUMERI (PRIMO ANNO)</div>
      <div style="margin-top:4mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm">
        <div>
          <div class="caps" style="font-size:8pt;color:rgba(250,248,244,0.7)">Investimento primo anno</div>
          <div class="display" style="font-style:italic;font-size:24pt;color:var(--mc-orange);margin-top:1mm">
            ${escapeHtml(formatEuro(Math.round(investimento ?? 0)))}
          </div>
          <div class="muted" style="font-style:italic;font-size:9pt;margin-top:1mm;color:rgba(250,248,244,0.6)">
            Setup + canoni (12 mesi) del primo anno
          </div>
        </div>
        <div>
          <div class="caps" style="font-size:8pt;color:rgba(250,248,244,0.7)">ROI stimato</div>
          <div class="display" style="font-style:italic;font-size:24pt;color:var(--mc-green);margin-top:1mm">
            ${roi == null ? "—" : escapeHtml(roi.toFixed(2))} ×
          </div>
          <div class="muted" style="font-style:italic;font-size:9pt;margin-top:1mm;color:rgba(250,248,244,0.6)">
            Rapporto tra Δ margine stimato e investimento
          </div>
        </div>
      </div>
      <div style="margin-top:5mm;border-top:1px solid rgba(250,248,244,0.18);padding-top:4mm">
        <div class="caps" style="font-size:8pt;color:rgba(250,248,244,0.7)">Δ margine stimato (primo anno)</div>
        <div style="margin-top:1mm;font-weight:800;font-size:14pt;color:var(--mc-green)">
          + ${escapeHtml(formatEuro(Math.max(0, Math.round(delta ?? 0))))}
        </div>
      </div>
    </div>

    <div class="no-break box box-green" style="margin-top:8mm;padding:5mm 6mm">
      <div class="caps" style="font-size:9.5pt;font-weight:800;color:#2D7A3E;letter-spacing:0.04em">
        LEVA DI ACCELERAZIONE: CREDITO MC
      </div>
      <div style="margin-top:2mm;font-size:10pt;line-height:1.45;color:var(--mc-black)">
        Oltre all’investimento, hai anche un <b>credito riutilizzabile</b> entro 12 mesi su qualunque voce del listino.
        L’importo esatto lo trovi nel riepilogo economico: qui ti basta sapere che è una leva pronta per potenziare il sistema quando i numeri lo giustificano.
        Nel tuo caso, il credito indicativo (già calcolato nel riepilogo) è <b>${escapeHtml(
          formatEuro(setupTotals.creditoMetodoCantiere)
        )}</b>.
      </div>
    </div>
  </section>
  `;
}

function renderPage9Payments(quote: QuoteWithRelations) {
  const setupTotals = computeSetupTotals(quote);
  const primoAnnoCompleto =
    typeof quote.totalAnnual === "number" && quote.totalAnnual > 0
      ? quote.totalAnnual
      : quote.totalSetup + quote.totalMonthly * 12;

  const crmMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_CRM"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const aiMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_AI"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const waMonthlyFromItems = quote.items
    .filter((i) => i.isMonthly && typeof i.productCode === "string" && i.productCode.startsWith("CANONE_WA"))
    .reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

  const crmPrepay =
    !!quote.scontoCrmAnnuale && crmMonthlyFromItems > 0
      ? canonePrepayFromMonthly(crmMonthlyFromItems, "CRM")
      : null;
  const aiPrepay =
    !!quote.scontoAiVocaleAnnuale && aiMonthlyFromItems > 0
      ? canonePrepayFromMonthly(aiMonthlyFromItems, "AIVOCALE")
      : null;
  const waPrepay =
    !!quote.scontoWaAnnuale && waMonthlyFromItems > 0 ? canonePrepayFromMonthly(waMonthlyFromItems, "WA") : null;

  const canoniAnticipatiAllaFirma =
    (crmPrepay?.netOneTime ?? 0) + (aiPrepay?.netOneTime ?? 0) + (waPrepay?.netOneTime ?? 0);

  const oggiStandard = Math.round(setupTotals.totalSetup + canoniAnticipatiAllaFirma);
  const oggiAnticipato = Math.round(primoAnnoCompleto * 0.95);
  const rateBase = Math.round(setupTotals.totalSetup + canoniAnticipatiAllaFirma);
  const rateOggi30 = Math.round(rateBase * 0.3);
  const rateResto70 = Math.max(0, rateBase - rateOggi30);
  const totalePrimoAnno = Math.round(primoAnnoCompleto);

  return `
  <section class="pdf-page">
    ${pageHeader("09")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">09 Modalità di pagamento</div>
    <div class="muted" style="font-style:italic;font-size:10pt;margin-bottom:6mm">
      Scegli la modalità più comoda. Dove previsto, i canoni mensili ricorrenti restano separati.
    </div>

    <div class="no-break">
      <div class="caps orange" style="font-size:8pt;margin-bottom:3mm">Modalità di pagamento e sconti</div>
      <div class="no-break" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="box" style="background:var(--mc-beige);border:1px solid #EDE6D6">
          <div class="caps muted" style="font-size:8pt">STANDARD (BONIFICO)</div>
          <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
            Setup alla firma. Canoni ricorrenti mese per mese (se presenti). Canoni annuali anticipati (se scelti) alla firma.
          </div>
          <div style="margin-top:4mm;border-top:1px solid #EDE6D6;padding-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Oggi alla firma</div>
            <div style="font-weight:800;font-size:13pt;color:var(--mc-black)">${escapeHtml(formatEuro(oggiStandard))}</div>
          </div>
          <div style="margin-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Totale primo anno</div>
            <div style="font-weight:800;font-size:12pt;color:var(--mc-black)">${escapeHtml(formatEuro(totalePrimoAnno))}</div>
          </div>
        </div>

        <div class="box" style="background:var(--mc-orange-light);border:1px solid rgba(255,106,0,0.25)">
          <div class="caps" style="font-size:8pt;color:var(--mc-orange)">ANTICIPATO 12 MESI · -5%</div>
          <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
            Primo anno completo in anticipo alla firma (setup + 12 mesi). Sconto 5% sul totale primo anno.
          </div>
          <div style="margin-top:4mm;border-top:1px solid rgba(255,106,0,0.22);padding-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Oggi alla firma</div>
            <div style="font-weight:800;font-size:13pt;color:var(--mc-black)">${escapeHtml(formatEuro(oggiAnticipato))}</div>
          </div>
          <div style="margin-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Totale primo anno</div>
            <div style="font-weight:800;font-size:12pt;color:var(--mc-black)">${escapeHtml(formatEuro(oggiAnticipato))}</div>
          </div>
        </div>

        <div class="box" style="background:var(--mc-green-bg);border:1px solid rgba(45,122,62,0.25)">
          <div class="caps" style="font-size:8pt;color:#2D7A3E">RATEIZZAZIONE SU CARTA (30% + 3/6 RATE)</div>
          <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
            30% oggi e restante 70% in 3 o 6 rate mensili automatiche sulla stessa carta. Le rate non sono cumulabili con lo sconto del 5%.
          </div>
          <div style="margin-top:4mm;border-top:1px solid rgba(45,122,62,0.2);padding-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Oggi alla firma</div>
            <div style="font-weight:800;font-size:13pt;color:var(--mc-black)">${escapeHtml(formatEuro(rateOggi30))}</div>
          </div>
          <div style="margin-top:3mm">
            <div class="caps muted" style="font-size:7.5pt">Poi</div>
            <div style="font-weight:800;font-size:12pt;color:var(--mc-black)">${escapeHtml(formatEuro(rateResto70))}</div>
            <div class="muted" style="font-style:italic;font-size:9pt;margin-top:1mm">
              in 3 o 6 rate mensili. I canoni mensili ricorrenti (se presenti) restano addebitati mese per mese.
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

function renderPage7(quote: QuoteWithRelations) {
  const { primary } = getClientDisplayName(quote);
  return `
  <section class="pdf-page">
    ${pageHeader("10")}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:2mm">10 Per partire davvero</div>
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

    <div class="no-break" style="margin-top:10mm">
      <div class="caps orange" style="font-size:11pt;margin-bottom:4mm;letter-spacing:0.12em">DOMANDE CHE CI FANNO TUTTI</div>

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

      <div class="no-break box box-warm" style="border:1px solid #EDE6D6;margin-top:3mm">
        <div style="font-weight:800;font-size:11pt">Quanto tempo devo dedicare io come titolare?</div>
        <div style="margin-top:2mm;font-size:10pt">
          Dipende da cosa attivi. Solo per il setup iniziale ti chiediamo 2 o 3 sessioni da un'ora nella prima settimana, per configurare il sistema col tuo team. Da quel momento in poi il sistema lavora in autonomia: il CRM raccoglie i dati, le automazioni fanno il follow up, la dashboard ti mostra i numeri. Quanto guardi quei numeri dipende da te. Se attivi anche la Direzione mensile, aggiungi una call da 60 minuti al mese in cui leggiamo i dati insieme e decidiamo dove intervenire. In entrambi i casi non ti chiediamo di smettere di stare in cantiere. Ti chiediamo di dedicare alla parte commerciale lo stesso tempo che oggi dedichi a perdere preventivi.
        </div>
      </div>

      <div class="no-break box box-warm" style="border:1px solid #EDE6D6;margin-top:3mm">
        <div style="font-weight:800;font-size:11pt">Funziona anche per un'impresa con pochi commerciali o senza rete vendita?</div>
        <div style="margin-top:2mm;font-size:10pt">
          Il metodo è nato proprio per imprese che non hanno un reparto commerciale strutturato. La maggior parte dei nostri clienti sono titolari che fanno tutto da soli o con un commerciale e mezzo. Il sistema non richiede una rete vendita: richiede un processo. Se oggi rispondi tu al telefono, fai tu i preventivi e segui tu i clienti, il metodo ti serve ancora di più, perché automatizza tutto quello che oggi dimentichi di fare quando sei in cantiere.
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
    ${renderPage5(quote)}
    ${renderPage4aTestimonianze()}
    ${renderPage4bMydatec()}
    ${renderPage3(quote)}
    ${renderCosaSuccedeOgniMese()}
    ${renderPage6(quote)}
    ${renderPage8Roi(quote)}
    ${renderPage9Payments(quote)}
    ${renderPage7(quote)}
  </body>
</html>
  `;
}

