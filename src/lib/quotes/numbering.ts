/**
 * Generatore del numero di preventivo Q<year>-####.
 *
 * Supporta una env var per anno per "saltare" i numeri iniziali (utile quando
 * si vuole partire dal numero N invece che da 1, ad esempio dopo aver ripulito
 * i preventivi di test, oppure quando si parte un trimestre prima della fine
 * dell'anno e non si vuole comunicare al cliente un numero troppo basso).
 *
 * Variabile attesa: `QUOTE_NUMBER_MIN_START_<year>` (intero positivo).
 * Es. `QUOTE_NUMBER_MIN_START_2026=47` => il prossimo numero del 2026 sara'
 *     almeno Q2026-0048 (47 + 1).
 *
 * La logica e': next = max(prevExistingNumber, minStart) + 1.
 * - Se i preventivi reali superano gia' minStart, l'env e' di fatto ignorata.
 * - Se non ci sono preventivi nell'anno e l'env non e' settata, parte da 1.
 */
function readMinStartForYear(year: number): number {
  const raw = process.env[`QUOTE_NUMBER_MIN_START_${year}`];
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function buildNextQuoteNumber(prev: string | null, year: number): string {
  const prefix = `Q${year}-`;
  const prevNum =
    prev && prev.startsWith(prefix) ? Number(prev.slice(prefix.length)) : 0;
  const safePrev = Number.isFinite(prevNum) ? prevNum : 0;
  const minStart = readMinStartForYear(year);
  const baseline = Math.max(safePrev, minStart);
  const nextNum = baseline + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
