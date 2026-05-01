// Fase del preventivo (pipeline commerciale): unica sorgente di verità per
// label, colori, derivazione da salesStage/deliveryStage e patch verso il DB.
// Usata sia in Analisi (dove si modifica) sia in "I miei preventivi" e nel
// dettaglio /preventivi/[id] (dove si visualizza), così i tre punti restano
// sempre allineati.

import type { CSSProperties } from "react";

export type SalesStage = "open" | "won" | "lost";
export type DeliveryStage = "not_started" | "in_progress" | "done";

export type FaseValue =
  | "in_trattativa"
  | "won_not_started"
  | "won_in_progress"
  | "won_done"
  | "lost";

export type FaseTone = "muted" | "accent" | "success" | "danger";

export type FaseOption = {
  value: FaseValue;
  label: string;
  shortLabel: string;
  tone: FaseTone;
};

export const FASE_OPTIONS: FaseOption[] = [
  { value: "in_trattativa", label: "In trattativa", shortLabel: "In trattativa", tone: "muted" },
  { value: "won_not_started", label: "Acquisito · da iniziare", shortLabel: "Acquisito", tone: "accent" },
  { value: "won_in_progress", label: "In corso", shortLabel: "In corso", tone: "accent" },
  { value: "won_done", label: "Completato", shortLabel: "Completato", tone: "success" },
  { value: "lost", label: "Perso", shortLabel: "Perso", tone: "danger" },
];

export function deriveFase(args: {
  salesStage?: string | null;
  deliveryStage?: string | null;
}): FaseValue {
  if (args.salesStage === "lost") return "lost";
  if (args.salesStage === "won") {
    if (args.deliveryStage === "done") return "won_done";
    if (args.deliveryStage === "in_progress") return "won_in_progress";
    return "won_not_started";
  }
  return "in_trattativa";
}

export function getFaseOption(value: FaseValue): FaseOption {
  return FASE_OPTIONS.find((o) => o.value === value) ?? FASE_OPTIONS[0];
}

export function fasePatch(
  value: FaseValue,
  currentWonAt: string | null
): {
  salesStage: SalesStage;
  deliveryStage: DeliveryStage;
  wonAt: string | null;
} {
  switch (value) {
    case "in_trattativa":
      return { salesStage: "open", deliveryStage: "not_started", wonAt: null };
    case "won_not_started":
      return {
        salesStage: "won",
        deliveryStage: "not_started",
        wonAt: currentWonAt ?? new Date().toISOString(),
      };
    case "won_in_progress":
      return {
        salesStage: "won",
        deliveryStage: "in_progress",
        wonAt: currentWonAt ?? new Date().toISOString(),
      };
    case "won_done":
      return {
        salesStage: "won",
        deliveryStage: "done",
        wonAt: currentWonAt ?? new Date().toISOString(),
      };
    case "lost":
      return { salesStage: "lost", deliveryStage: "not_started", wonAt: null };
  }
}

export function faseToneStyle(tone: FaseTone): CSSProperties {
  switch (tone) {
    case "success":
      return {
        background: "rgba(34,197,94,0.14)",
        color: "var(--mc-success)",
        borderColor: "rgba(34,197,94,0.35)",
      };
    case "accent":
      return {
        background: "rgba(255,106,0,0.14)",
        color: "#FF6A00",
        borderColor: "rgba(255,106,0,0.35)",
      };
    case "danger":
      return {
        background: "rgba(185,28,28,0.14)",
        color: "var(--mc-danger, #b91c1c)",
        borderColor: "rgba(185,28,28,0.35)",
      };
    case "muted":
    default:
      return {
        background: "rgba(148,163,184,0.16)",
        color: "var(--mc-text-secondary)",
        borderColor: "rgba(148,163,184,0.45)",
      };
  }
}
