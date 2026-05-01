"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

export type CashflowMonthPoint = {
  month: string;
  label: string;
  scheduledIn: number;
  scheduledOut: number;
  paidIn: number;
  paidOut: number;
  netScheduled: number;
  netPaid: number;
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CashflowCharts({ series }: { series: CashflowMonthPoint[] }) {
  if (!series.length) {
    return (
      <div className="text-sm py-8 text-center" style={{ color: "var(--mc-text-muted)" }}>
        Nessun pagamento nel periodo analizzato: grafico cassa non disponibile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-semibold mb-1">Cassa prevista vs incassata</div>
        <div className="text-xs mb-3" style={{ color: "var(--mc-text-muted)" }}>
          Incassi da scadenze rate vs pagamenti segnati come incassati; uscite fornitore stimate dal rapporto
          costo/ricavo annuo del preventivo (stime proporzionali).
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" opacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--mc-text-secondary)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--mc-text-secondary)"
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatEuro(Number(value ?? 0)),
                  String(name ?? ""),
                ]}
                labelStyle={{ color: "var(--mc-text-secondary)" }}
                contentStyle={{
                  background: "var(--mc-card-bg, #fff)",
                  border: "1px solid var(--mc-border)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="scheduledIn" name="Da incassare (scadenze)" fill="var(--mc-accent, #2563eb)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paidIn" name="Incassato" fill="rgb(34 197 94)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="scheduledOut" name="Uscite stimate (su scadenze)" stroke="#f97316" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="paidOut" name="Uscite stimate (su incassi)" stroke="#a855f7" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">Netto cassa (stime)</div>
        <div className="text-xs mb-3" style={{ color: "var(--mc-text-muted)" }}>
          Netto = incassi − uscite stimate nello stesso mese.
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mc-border)" opacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--mc-text-secondary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--mc-text-secondary)" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value) => [formatEuro(Number(value ?? 0)), ""]}
                labelStyle={{ color: "var(--mc-text-secondary)" }}
                contentStyle={{
                  background: "var(--mc-card-bg, #fff)",
                  border: "1px solid var(--mc-border)",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="netScheduled" name="Netto su scadenze" stroke="var(--mc-accent, #2563eb)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="netPaid" name="Netto su incassi" stroke="rgb(34 197 94)" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
