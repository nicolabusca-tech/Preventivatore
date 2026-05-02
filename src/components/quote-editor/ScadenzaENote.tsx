"use client";

export type ScadenzaENoteProps = {
  expiresInDays: number;
  setExpiresInDays: (v: number) => void;
  notes: string;
  setNotes: (v: string) => void;
};

/**
 * Sezione "Scadenza e note" del QuoteEditor: validità in giorni con label
 * data calcolata, e note interne (visibili solo al team, non al cliente).
 */
export function ScadenzaENote({
  expiresInDays,
  setExpiresInDays,
  notes,
  setNotes,
}: ScadenzaENoteProps) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-2xl mb-4">Scadenza e note</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Validità (giorni)</label>
          <input
            type="number"
            min={1}
            className="input"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value) || 30)}
          />
          <p className="helper-text">
            Scadenza:{" "}
            {new Date(Date.now() + Math.max(1, expiresInDays) * 24 * 60 * 60 * 1000).toLocaleDateString("it-IT")}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <label className="label">Note interne</label>
        <textarea
          rows={3}
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note operative, condizioni speciali, follow-up..."
        />
      </div>
    </div>
  );
}
