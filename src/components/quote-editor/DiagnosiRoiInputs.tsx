"use client";

import type { Dispatch, SetStateAction } from "react";

export type RoiInputsState = {
  preventiviMese: number;
  importoMedio: number;
  conversioneAttuale: number;
  margineCommessa: number;
};

export type DiagnosiRoiInputsProps = {
  originCliente: string;
  setOriginCliente: (v: string) => void;
  estrattoDiagnosi: string;
  setEstrattoDiagnosi: (v: string) => void;
  roiInputs: RoiInputsState;
  setRoiInputs: Dispatch<SetStateAction<RoiInputsState>>;
};

/**
 * Sezione "Diagnosi & ROI" del QuoteEditor: contesto cliente (origine,
 * estratto diagnosi) + 4 input numerici per il calcolo ROI live (preventivi
 * al mese, importo medio, conversione attuale, margine commessa). I voucher
 * Diagnosi/Audit non si gestiscono qui ma nel listino piu' sotto.
 */
export function DiagnosiRoiInputs({
  originCliente,
  setOriginCliente,
  estrattoDiagnosi,
  setEstrattoDiagnosi,
  roiInputs,
  setRoiInputs,
}: DiagnosiRoiInputsProps) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-2xl mb-4">Diagnosi &amp; ROI (prima della proposta)</h2>
      <p className="text-sm mb-4" style={{ color: "var(--mc-text-secondary)" }}>
        Seleziona <strong>Diagnosi Strategica</strong> o <strong>Audit Lampo</strong> sotto, nel
        listino: indicano l&apos;importo come già versato (credito, una sola tra le due). I totali
        a destra li mostrano in verde con il segno meno.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Origine cliente</label>
          <input
            type="text"
            className="input"
            value={originCliente}
            onChange={(e) => setOriginCliente(e.target.value)}
            placeholder="es. Passaparola, Ads, Partner..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Estratto diagnosi</label>
          <textarea
            rows={3}
            className="input"
            value={estrattoDiagnosi}
            onChange={(e) => setEstrattoDiagnosi(e.target.value)}
            placeholder="Sintesi problemi/opportunità emersi..."
          />
        </div>

        <div>
          <label className="label">Preventivi / mese</label>
          <input
            type="number"
            className="input"
            min={0}
            value={roiInputs.preventiviMese}
            onChange={(e) =>
              setRoiInputs((p) => ({ ...p, preventiviMese: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div>
          <label className="label">Importo medio (€)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={roiInputs.importoMedio}
            onChange={(e) =>
              setRoiInputs((p) => ({ ...p, importoMedio: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div>
          <label className="label">Conversione attuale (%)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={roiInputs.conversioneAttuale}
            onChange={(e) =>
              setRoiInputs((p) => ({ ...p, conversioneAttuale: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div>
          <label className="label">Margine commessa (%)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={roiInputs.margineCommessa}
            onChange={(e) =>
              setRoiInputs((p) => ({ ...p, margineCommessa: Number(e.target.value) || 0 }))
            }
          />
        </div>
      </div>
    </div>
  );
}
