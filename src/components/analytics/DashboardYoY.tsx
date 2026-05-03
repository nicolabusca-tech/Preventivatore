"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import type {
  AnalyticsResponse,
  AnalyticsYoYView,
  AnalyticsPipelineByStage,
  AnalyticsFunnelStep,
  CashflowPoint,
  MonthlyPoint,
  AnalyticsByOrigin,
} from "@/lib/types/analytics";

function formatEuro(v: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatPct(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

/**
 * Tooltip Recharts coerente con la palette Metodo Cantiere.
 * Background scuro, bordo accent, font leggibile a 12px.
 */
function McTooltip(props: any) {
  const { active, payload, label } = props || {};
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "var(--mc-bg-elevated, #fff)",
        border: "1px solid var(--mc-border, #e5e5e5)",
        borderRadius: 8,
        padding: "8px 10px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        fontSize: 12,
        color: "var(--mc-text, #1a1a1a)",
      }}
    >
      {label && (
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
            color: "var(--mc-text-secondary, #555)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: i > 0 ? 2 : 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              background: p.color || p.stroke || p.fill || "#999",
            }}
          />
          <span style={{ color: "var(--mc-text-secondary, #555)" }}>{p.name}:</span>
          <strong style={{ marginLeft: "auto" }}>
            {typeof p.value === "number" ? formatEuro(p.value) : String(p.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function deltaBadge(deltaPct: number | null): { text: string; tone: "up" | "down" | "neutral" } {
  if (deltaPct === null) return { text: "nuovo", tone: "neutral" };
  if (deltaPct === 0) return { text: "0%", tone: "neutral" };
  const sign = deltaPct > 0 ? "+" : "";
  return { text: `${sign}${deltaPct.toFixed(1)}%`, tone: deltaPct > 0 ? "up" : "down" };
}

function KpiCard({
  label,
  value,
  sub,
  deltaPct,
}: {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number | null;
}) {
  const badge = deltaPct !== undefined ? deltaBadge(deltaPct) : null;
  const toneColor = badge?.tone === "up" ? "#2D7A3E" : badge?.tone === "down" ? "#B33A3A" : "var(--mc-text-muted)";
  return (
    <div className="card p-4 sm:p-5" style={{ minHeight: 110 }}>
      <div className="caps text-xs" style={{ color: "var(--mc-text-secondary)" }}>{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
      {(sub || badge) && (
        <div className="mt-1 text-xs flex items-center gap-2" style={{ color: "var(--mc-text-muted)" }}>
          {badge && (
            <span className="font-semibold" style={{ color: toneColor }}>
              {badge.text}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function MonthlyYoYChart({
  monthly,
  monthlyPrev,
  year,
  compareYear,
}: {
  monthly: MonthlyPoint[];
  monthlyPrev: MonthlyPoint[];
  year: number;
  compareYear: number | null;
}) {
  const series = useMemo(() => {
    return monthly.map((m, i) => ({
      label: m.label,
      [String(year)]: m.acquired,
      ...(compareYear != null ? { [String(compareYear)]: monthlyPrev[i]?.acquired ?? 0 } : {}),
    }));
  }, [monthly, monthlyPrev, year, compareYear]);

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-base font-semibold mb-1">Acquisito mese per mese</h3>
      <p className="text-xs mb-4" style={{ color: "var(--mc-text-muted)" }}>
        Confronto anno corrente vs anno precedente sui preventivi vinti (data wonAt).
        Bar chart raggruppato: con pochi dati e' piu' leggibile di una linea.
      </p>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={series} margin={{ top: 6, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--mc-text-muted)" fontSize={12} />
            <YAxis
              stroke="var(--mc-text-muted)"
              fontSize={12}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
            />
            <Tooltip content={<McTooltip />} cursor={{ fill: "rgba(255,106,0,0.06)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {compareYear != null && (
              <Bar
                dataKey={String(compareYear)}
                fill="#999"
                radius={[3, 3, 0, 0]}
                isAnimationActive={true}
                animationDuration={400}
              />
            )}
            <Bar
              dataKey={String(year)}
              fill="#FF6A00"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={400}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PipelineByStageChart({ data }: { data: AnalyticsPipelineByStage[] }) {
  const series = data.map((s) => ({
    label: s.label,
    valore: s.value,
    count: s.count,
    stage: s.stage,
  }));
  const colors: Record<AnalyticsPipelineByStage["stage"], string> = {
    draft: "#999",
    sent: "#7CA9D6",
    in_trattativa: "#F0A040",
    won: "#2D7A3E",
    lost: "#B33A3A",
  };
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-base font-semibold mb-1">Pipeline per fase</h3>
      <p className="text-xs mb-4" style={{ color: "var(--mc-text-muted)" }}>
        Distribuzione dei preventivi nello stato attuale, per valore totale (1° anno).
      </p>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={series} layout="vertical" margin={{ top: 6, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--mc-text-muted)"
              fontSize={11}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
            />
            <YAxis dataKey="label" type="category" stroke="var(--mc-text-muted)" fontSize={11} width={100} />
            <Tooltip
              content={<McTooltip />}
              cursor={{ fill: "rgba(255,106,0,0.06)" }}
            />
            <Bar dataKey="valore" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={400}>
              {series.map((s) => (
                <Cell key={s.stage} fill={colors[s.stage as AnalyticsPipelineByStage["stage"]]} />
              ))}
              <LabelList
                dataKey="valore"
                position="right"
                formatter={
                  ((v: number, _e: unknown, idx: number) => {
                    const r = series[idx];
                    return r ? `${r.count} · ${formatEuro(v)}` : formatEuro(v);
                  }) as any
                }
                style={{ fontSize: 11, fill: "var(--mc-text)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FunnelChart({ data }: { data: AnalyticsFunnelStep[] }) {
  const max = Math.max(1, ...data.map((s) => s.count));
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-base font-semibold mb-1">Funnel di conversione</h3>
      <p className="text-xs mb-4" style={{ color: "var(--mc-text-muted)" }}>
        Bozze create &gt; Inviate al cliente &gt; Acquisite. Percentuali fra step.
      </p>
      <div className="space-y-3">
        {data.map((step, i) => {
          const widthPct = (step.count / max) * 100;
          return (
            <div key={step.stage}>
              <div className="flex justify-between mb-1 text-sm">
                <span className="font-semibold">{step.label}</span>
                <span className="tabular-nums" style={{ color: "var(--mc-text-secondary)" }}>
                  {step.count}
                  {step.conversionFromPrev !== null && (
                    <span className="ml-2 text-xs" style={{ color: "var(--mc-text-muted)" }}>
                      ({formatPct(step.conversionFromPrev, 0)} dal precedente)
                    </span>
                  )}
                </span>
              </div>
              <div
                className="rounded-md"
                style={{
                  height: 28,
                  width: `${widthPct}%`,
                  background:
                    step.stage === "won"
                      ? "#2D7A3E"
                      : step.stage === "sent"
                        ? "#7CA9D6"
                        : "#999",
                  transition: "width 0.25s ease",
                  minWidth: 40,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const total = data.reduce((s, p) => s + p.expected, 0);
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-base font-semibold mb-1">Cashflow garantito 12 mesi</h3>
      <p className="text-xs mb-4" style={{ color: "var(--mc-text-muted)" }}>
        Incassi gia' programmati (rate firmate, canoni mensili, anticipi). Niente nuove vendite.
        Totale periodo: <strong className="tabular-nums">{formatEuro(total)}</strong>.
      </p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--mc-text-muted)" fontSize={12} />
            <YAxis
              stroke="var(--mc-text-muted)"
              fontSize={12}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
            />
            <Tooltip content={<McTooltip />} />
            <Area
              type="monotone"
              dataKey="expected"
              stroke="#FF6A00"
              fill="#FF6A00"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WinLossByOriginChart({ data }: { data: AnalyticsByOrigin[] }) {
  // Limito a 8 origini per leggibilita'; le altre vengono raggruppate in "Altre".
  const top = data.slice(0, 8);
  const series = top.map((row) => ({
    origin: row.origin,
    won: row.won,
    lost: row.lost,
    open: row.open,
    total: row.total,
    winRate: row.winRate,
    acquiredValue: row.acquiredValue,
  }));

  if (series.length === 0) {
    return (
      <div className="card p-4 sm:p-5">
        <h3 className="text-base font-semibold mb-1">Win/Loss per origine cliente</h3>
        <p className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
          Compila il campo &quot;Origine cliente&quot; nei preventivi per vedere quali canali ti
          fanno chiudere meglio.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="text-base font-semibold mb-1">Win/Loss per origine cliente</h3>
      <p className="text-xs mb-4" style={{ color: "var(--mc-text-muted)" }}>
        Da quale canale arrivano i preventivi che chiudi davvero. Win rate = vinti / (vinti + persi).
      </p>
      <div style={{ width: "100%", height: Math.max(220, series.length * 44 + 60) }}>
        <ResponsiveContainer>
          <BarChart data={series} layout="vertical" margin={{ top: 6, right: 28, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" horizontal={false} />
            <XAxis type="number" stroke="var(--mc-text-muted)" fontSize={12} />
            <YAxis dataKey="origin" type="category" stroke="var(--mc-text-muted)" fontSize={12} width={120} />
            <Tooltip
              content={
                ((props: any) => {
                  if (!props?.active || !props?.payload || props.payload.length === 0) return null;
                  const row = props.payload[0]?.payload as typeof series[number];
                  return (
                    <div
                      style={{
                        background: "var(--mc-bg-elevated, #fff)",
                        border: "1px solid var(--mc-border, #e5e5e5)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{row.origin}</div>
                      <div>Vinti: <strong>{row.won}</strong></div>
                      <div>Persi: <strong>{row.lost}</strong></div>
                      <div>Aperti: <strong>{row.open}</strong></div>
                      <div style={{ marginTop: 4 }}>
                        Win rate: <strong>{row.winRate != null ? `${row.winRate.toFixed(1)}%` : "—"}</strong>
                      </div>
                      <div>Acquisito: <strong>{formatEuro(row.acquiredValue)}</strong></div>
                    </div>
                  );
                }) as any
              }
              cursor={{ fill: "rgba(255,106,0,0.06)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="won" name="Vinti" stackId="a" fill="#2D7A3E" radius={[0, 0, 0, 0]} isAnimationActive={true} animationDuration={400} />
            <Bar dataKey="lost" name="Persi" stackId="a" fill="#B33A3A" radius={[0, 0, 0, 0]} isAnimationActive={true} animationDuration={400} />
            <Bar dataKey="open" name="Aperti" stackId="a" fill="#999" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={400}>
              <LabelList
                dataKey="winRate"
                position="right"
                formatter={
                  ((v: number | null) => (v == null ? "—" : `${v.toFixed(0)}%`)) as any
                }
                style={{ fontSize: 11, fontWeight: 700, fill: "var(--mc-text)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length > 8 && (
        <div className="text-[11px] mt-2" style={{ color: "var(--mc-text-muted)" }}>
          Mostrate le prime 8 origini per acquisito. Le altre {data.length - 8} sono nascoste.
        </div>
      )}
    </div>
  );
}

export type DashboardYoYProps = {
  data: AnalyticsResponse;
  /** Se false, mostra solo i KPI e nasconde i 4 grafici grandi. Default: true. */
  chartsVisible?: boolean;
};

export function DashboardYoY({ data, chartsVisible = true }: DashboardYoYProps) {
  const yoy = data.yoy;
  const pipelineByStage = data.pipelineByStage;
  const funnel = data.funnel;
  const cashflow = data.cashflow12m;

  if (!yoy) {
    return (
      <div className="card p-5">
        <p style={{ color: "var(--mc-text-muted)" }}>
          Dashboard YoY non disponibile per questa response.
        </p>
      </div>
    );
  }

  const cashflowTotal = cashflow?.reduce((s, p) => s + p.expected, 0) ?? 0;
  const wonRatio = yoy.kpi.wonCount > 0 || yoy.kpi.wonCountPrev > 0
    ? `${yoy.kpi.wonCount} preventivi vinti${yoy.compareYear != null ? ` (era ${yoy.kpi.wonCountPrev})` : ""}`
    : "nessun preventivo vinto";

  return (
    <div className="space-y-5">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={`Acquisito YTD ${yoy.year}`}
          value={formatEuro(yoy.kpi.acquired)}
          sub={
            yoy.compareYear != null
              ? `vs ${formatEuro(yoy.kpi.acquiredPrev)} ${yoy.compareYear}`
              : undefined
          }
          deltaPct={yoy.kpi.acquiredDeltaPct ?? null}
        />
        <KpiCard
          label="Pipeline aperta"
          value={formatEuro(yoy.kpi.pipelineOpenValue)}
          sub="preventivi 'open' adesso"
        />
        <KpiCard
          label="Conversion rate"
          value={formatPct(yoy.kpi.conversionRate)}
          sub={
            yoy.compareYear != null
              ? `vs ${formatPct(yoy.kpi.conversionRatePrev)} ${yoy.compareYear}`
              : "vinti / nuovi creati YTD"
          }
        />
        <KpiCard label="Cashflow 12 mesi" value={formatEuro(cashflowTotal)} sub="incasso garantito" />
      </div>

      {chartsVisible && (
        <>
          {/* GRAFICI: 2x2 layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MonthlyYoYChart
              monthly={yoy.monthly}
              monthlyPrev={yoy.monthlyPrev}
              year={yoy.year}
              compareYear={yoy.compareYear}
            />
            {pipelineByStage && pipelineByStage.length > 0 && (
              <PipelineByStageChart data={pipelineByStage} />
            )}
            {funnel && funnel.length > 0 && <FunnelChart data={funnel} />}
            {cashflow && cashflow.length > 0 && <CashflowChart data={cashflow} />}
          </div>

          {/* Win/Loss per origine: full-width, e' la metrica piu' utile per decidere
             dove investire tempo/budget commerciale. */}
          {data.byOrigin && data.byOrigin.length > 0 && (
            <WinLossByOriginChart data={data.byOrigin} />
          )}
        </>
      )}

      <div className="text-xs" style={{ color: "var(--mc-text-muted)" }}>
        {wonRatio}.
        {yoy.compareYear != null && (
          <>
            {" "}
            Confronto con {yoy.compareYear} alla stessa data del calendario (year-to-date).
          </>
        )}
      </div>
    </div>
  );
}
