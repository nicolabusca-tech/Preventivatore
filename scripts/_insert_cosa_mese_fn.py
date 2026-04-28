from pathlib import Path

# Unicode quotes as in the original template
LQ, RQ = "\u201c", "\u201d"

new_fn = f"""
function renderCosaSuccedeOgniMere() {{
  return `
  <section class="pdf-page">
    ${{pageHeader("06")}}
    <div class="display" style="font-style:italic;font-size:28pt;margin-bottom:4mm">06 Cosa succede ogni mese nella direzione</div>

    <div class="no-break box box-warm" style="margin-top:2mm;border:0.5pt solid var(--mc-orange)">
      <div class="caps orange" style="font-size:9pt">COSA SUCCEDE OGNI MESE NELLA DIREZIONE</div>
      <div class="muted" style="font-style:italic;font-size:9pt;margin-top:2mm">
        Il prezzo della direzione non paga {LQ}essere reperibili{RQ}. Paga un ciclo operativo ripetibile, ogni mese, in questa sequenza:
      </div>
      <ol style="margin-top:3mm;padding-left:18px">
        <li><b>Raccolta numeri reali</b> — Lead, chiamate, appuntamenti, preventivi, contratti: tutto dal CRM (e dalle fonti collegate), non {LQ}a sensazione{RQ}.</li>
        <li><b>Revisione pipeline e colli di bottiglia</b> — Dove si ferma il flusso questo mese: tempi di risposta, preventivi, follow-up, chiusura, selezione clienti.</li>
        <li><b>Decisioni di direzione con te (titolare)</b> — 60 minuti: cosa cambiamo ora, cosa tagliamo, cosa raddoppiamo. Un piano d'azione di 30 giorni con priorità chiare.</li>
        <li><b>Esecuzione guidata su 1–2 leve</b> — Coaching sul gap più costoso e aggiornamento playbook (script, obiezioni, follow-up) con materiale operativo usabile dal team.</li>
        <li><b>Verifica e accountability</b> — KPI aggiornati nel CRM: a fine mese vediamo se le azioni hanno mosso i numeri. Se non li muovono, si corregge rotta.</li>
      </ol>
    </div>
  </section>
  `;
}}

"""

path = Path("src/lib/pdf/template.ts")
s = path.read_text(encoding="utf-8")
marker = "/** Pag. 4 (prima facciata): intro + Remus + Giovanni"
if new_fn.strip() in s:
    print("Already inserted")
    raise SystemExit(0)
if marker not in s:
    raise SystemExit("marker not found")
s = s.replace("\n" + marker, new_fn + "\n" + marker, 1)
path.write_text(s, encoding="utf-8")
print("inserted renderCosaSuccedeOgniMere")
