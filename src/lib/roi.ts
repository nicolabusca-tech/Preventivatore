/**
 * Calcoli Diagnosi & ROI (v1.5) — allineati al Metodo Cantiere.
 * I pesi "diagnosi" sul listino sono gestiti in admin/roi-settings.
 */

export type RoiFormInputs = {
  preventiviMese: number;
  importoMedio: number;
  conversioneAttuale: number;
  margineCommessa: number;
};

export type RoiSnapshotPayload = {
  inputs: RoiFormInputs;
  fatturatoAnnuoBaseline: number;
  margineAnnuoBaseline: number;
  valoreFatturatoProposta: number;
  margineStimatoProposta: number;
  valoreQuotaDiagnosi: number;
  indice: number | null;
};

export const DEFAULT_ROI_FORM: RoiFormInputs = {
  preventiviMese: 4,
  importoMedio: 5000,
  conversioneAttuale: 25,
  margineCommessa: 20,
};

export function mergeRoiDefaults(over: Partial<RoiFormInputs> | null | undefined): RoiFormInputs {
  if (!over) return { ...DEFAULT_ROI_FORM };
  return {
    preventiviMese: over.preventiviMese ?? DEFAULT_ROI_FORM.preventiviMese,
    importoMedio: over.importoMedio ?? DEFAULT_ROI_FORM.importoMedio,
    conversioneAttuale: over.conversioneAttuale ?? DEFAULT_ROI_FORM.conversioneAttuale,
    margineCommessa: over.margineCommessa ?? DEFAULT_ROI_FORM.margineCommessa,
  };
}

type ProductRoiRow = { diagnosiPeso: number; isMonthly: boolean };

export function computeDiagnosiShareValue(
  selected: { productCode: string; quantity: number; price: number; isMonthly: boolean }[],
  byCode: Map<string, ProductRoiRow>
): number {
  let sum = 0;
  for (const row of selected) {
    const p = byCode.get(row.productCode);
    if (!p) continue;
    const w = (p.diagnosiPeso || 0) / 100;
    if (p.isMonthly) {
      sum += row.price * row.quantity * 12 * w;
    } else {
      sum += row.price * row.quantity * w;
    }
  }
  return sum;
}

export function computeDiagnosiPesoTotale(
  selected: { productCode: string; quantity: number }[],
  byCode: Map<string, ProductRoiRow>
): number {
  let sum = 0;
  for (const row of selected) {
    const p = byCode.get(row.productCode);
    if (!p) continue;
    sum += (p.diagnosiPeso || 0) * row.quantity;
  }
  return sum;
}

export function buildRoiSnapshot(
  inputs: RoiFormInputs,
  oneTimeTotal: number,
  monthlyTotal: number,
  diagnosiShareValue: number,
  diagnosiPesoTotale: number
): { snapshot: string; payload: RoiSnapshotPayload } {
  const preventiviAnnui = inputs.preventiviMese * 12;
  const conversioneAttuale = inputs.conversioneAttuale / 100;
  const contrattiAttuali = preventiviAnnui * conversioneAttuale;
  const fatturatoAnnuoBaseline = contrattiAttuali * inputs.importoMedio;
  const marginePerContratto = inputs.importoMedio * (inputs.margineCommessa / 100);
  const margineAnnuoBaseline = contrattiAttuali * marginePerContratto;

  // FORMULA ROI v2 — usa diagnosiPesoTotale (somma pesi voci selezionate)
  // Cap assoluto 30% conversione attesa.
  // Pavimento 6%: se il piano ha peso ≥ 15%, garantiamo almeno 6% di conversione attesa
  // (utile per clienti che partono da conversione molto bassa, es 2%).
  const PAVIMENTO_CONVERSIONE = diagnosiPesoTotale >= 15 ? 0.06 : 0;
  const CAP_CONVERSIONE = 0.3;

  const conversioneAttesaProporzionale = conversioneAttuale * (1 + diagnosiPesoTotale / 100);
  const conversioneAttesaConPavimento = Math.max(conversioneAttesaProporzionale, PAVIMENTO_CONVERSIONE);
  const conversioneAttesa = Math.min(conversioneAttesaConPavimento, CAP_CONVERSIONE);
  const contrattiAttesi = preventiviAnnui * conversioneAttesa;
  const margineStimatoProposta = contrattiAttesi * marginePerContratto;

  // L'investimento del primo anno (setup + canoni annui) serve per l'indice ROI.
  const investimentoPrimoAnno = Math.max(0, oneTimeTotal + monthlyTotal * 12);
  const deltaPrimoAnno = margineStimatoProposta - margineAnnuoBaseline;
  const indice = investimentoPrimoAnno > 0 ? deltaPrimoAnno / investimentoPrimoAnno : null;

  // NB: "valoreFatturatoProposta" è usato nel PDF come "Investimento primo anno".
  const valoreFatturatoProposta = investimentoPrimoAnno;
  const payload: RoiSnapshotPayload = {
    inputs: { ...inputs },
    fatturatoAnnuoBaseline,
    margineAnnuoBaseline,
    valoreFatturatoProposta,
    margineStimatoProposta,
    valoreQuotaDiagnosi: diagnosiShareValue,
    indice,
  };
  return { snapshot: JSON.stringify(payload), payload };
}

export function liveRoiFromPayload(
  inputs: RoiFormInputs,
  oneTimeTotal: number,
  monthlyTotal: number,
  diagnosiShareValue: number,
  diagnosiPesoTotale: number
) {
  return buildRoiSnapshot(inputs, oneTimeTotal, monthlyTotal, diagnosiShareValue, diagnosiPesoTotale).payload;
}

export function parseRoiSnapshot(s: string | null | undefined): RoiSnapshotPayload | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as RoiSnapshotPayload;
  } catch {
    return null;
  }
}
