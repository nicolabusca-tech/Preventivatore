"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { computeCredito } from "@/lib/pricing/engine";
import { parseRoiSnapshot } from "@/lib/roi";
import { QuoteEditor } from "@/components/QuoteEditor";
import { deriveFase, getFaseOption, faseToneStyle } from "@/lib/fase";
import type { QuoteDetail, QuoteEditorInitialData } from "@/lib/types/quote";

const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";
const DIAGNOSI_VOUCHER_AMOUNT = 497;
const AUDIT_VOUCHER_AMOUNT = 147;

const discountTypeLabels: Record<string, string> = {
  manual: "Codice sconto manuale",
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFullAddress(q: QuoteDetail): string {
  const parts: string[] = [];
  if (q.clientAddress) parts.push(q.clientAddress);
  const cityLine = [q.clientPostalCode, q.clientCity].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  if (q.clientProvince) parts.push(`(${q.clientProvince})`);
  return parts.join(" — ");
}

export default function DettaglioPreventivoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/quotes/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            (body && typeof body.error === "string" && body.error) ||
            `Errore caricamento preventivo (HTTP ${res.status})`;
          throw new Error(message);
        }
        return body as QuoteDetail;
      })
      .then((data) => {
        if (!alive) return;
        setQuote(data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setQuote(null);
        setError(e instanceof Error ? e.message : "Errore inatteso");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--mc-text-muted)" }}>
        <div className="inline-flex items-center gap-2">
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm">Caricamento preventivo...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <p className="text-sm mb-4" style={{ color: "var(--mc-danger, #b91c1c)" }}>
          {error}
        </p>
        <Link href="/preventivi" className="btn-secondary">
          Torna ai preventivi
        </Link>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm mb-4" style={{ color: "var(--mc-text-muted)" }}>
          Preventivo non trovato.
        </p>
        <Link href="/preventivi" className="btn-secondary">
          Torna ai preventivi
        </Link>
      </div>
    );
  }

  // Bozze modificabili: draft (standard) o pending (legacy DB / migrazioni).
  const isEditableDraft = quote.status === "draft" || quote.status === "pending";

  if (isEditableDraft) {
    const initial: QuoteEditorInitialData = {
      id: quote.id,
      status: quote.status,
      kind: quote.kind,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      clientEmail: quote.clientEmail,
      clientPhone: quote.clientPhone,
      clientNotes: quote.clientNotes,
      crmCustomerId: quote.crmCustomerId,
      clientAddress: quote.clientAddress,
      clientPostalCode: quote.clientPostalCode,
      clientCity: quote.clientCity,
      clientProvince: quote.clientProvince,
      clientVat: quote.clientVat,
      clientSdi: quote.clientSdi,
      originCliente: quote.originCliente,
      estrattoDiagnosi: quote.estrattoDiagnosi,
      diagnosiGiaPagata: quote.diagnosiGiaPagata,
      roiPreventiviMese: quote.roiPreventiviMese,
      roiImportoMedio: quote.roiImportoMedio,
      roiConversioneAttuale: quote.roiConversioneAttuale,
      roiMargineCommessa: quote.roiMargineCommessa,
      roiSnapshot: quote.roiSnapshot,
      notes: quote.notes,
      expiresAt: quote.expiresAt,
      voucherAuditApplied: quote.voucherAuditApplied,
      scontoCrmAnnuale: quote.scontoCrmAnnuale,
      scontoAiVocaleAnnuale: quote.scontoAiVocaleAnnuale,
      scontoWaAnnuale: quote.scontoWaAnnuale,
      discountType: quote.discountType,
      discountAmount: quote.discountAmount,
      discountCode: quote.discountCode,
      discountPercent: quote.discountPercent,
      items: quote.items.map((it) => ({
        productCode: it.productCode,
        quantity: it.quantity,
        price: it.price,
        isMonthly: it.isMonthly,
        productName: it.productName,
      })),
    };

    return (
      <div className="animate-fade-in">
        <div className="mb-7">
          <Link
            href="/preventivi"
            className="inline-flex items-center gap-1 text-xs font-semibold mb-3 hover:underline"
            style={{ color: "var(--mc-text-secondary)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Torna ai preventivi
          </Link>
          <h1 className="text-2xl sm:text-4xl mb-1">Bozza {quote.quoteNumber}</h1>
          <p className="text-sm italic" style={{ color: "var(--mc-text-secondary)" }}>
            {quote.status === "pending"
              ? "Record in stato legacy “pending”: editabile e inviabile come bozza."
              : "Tutto editabile finché resta in bozza. Puoi stampare il PDF dopo il primo salvataggio."}
          </p>
        </div>

        <QuoteEditor initial={initial} />
      </div>
    );
  }

  const setupLineItems = quote.items.filter(
    (i) =>
      !i.isMonthly && !(quote.diagnosiGiaPagata && i.productCode === DIAGNOSI_CODE)
  );
  const monthlyItems = quote.items.filter((i) => i.isMonthly);
  const fullAddress = buildFullAddress(quote);
  const roiSnap = parseRoiSnapshot(quote.roiSnapshot);
  const showSetupSection = setupLineItems.length > 0 || quote.diagnosiGiaPagata;

  const grossSetupForCredito =
    quote.setupBeforeDiscount > 0
      ? quote.setupBeforeDiscount
      : setupLineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const creditoMetodoCantiere = computeCredito({
    setupGross: grossSetupForCredito,
    diagnosiGiaPagata: quote.diagnosiGiaPagata,
    voucherAuditApplied: quote.voucherAuditApplied,
    manualDiscountAmount: quote.discountAmount,
    manualDiscountPercent: quote.discountPercent,
    legacyDiscountType: quote.discountType,
  });

  const fase = deriveFase(quote);
  const faseOpt = getFaseOption(fase);
  // Marker esplicito (vedi schema.prisma): preventivi creati con
  // /api/quotes/create-manual hanno kind="MANUAL". Tutti gli altri sono
  // STANDARD. Per i preventivi storici precedenti a questo campo, la
  // migration ha fatto un backfill basato sui productCode "MANUAL_*".
  const isManualQuote = quote.kind === "MANUAL";

  const bannerText = (() => {
    if (quote.status === "sent")
      return quote.sentAt ? `Inviato il ${formatDateTime(quote.sentAt)}` : "Inviato";
    if (quote.status === "viewed")
      return quote.viewedAt ? `Visualizzato il ${formatDateTime(quote.viewedAt)}` : "Visualizzato";
    return null;
  })();

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          href="/preventivi"
          className="inline-flex items-center gap-1 text-xs font-semibold mb-3 hover:underline"
          style={{ color: "var(--mc-text-secondary)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Torna ai preventivi
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div
              className="font-mono text-xs mb-1 font-bold tracking-wider"
              style={{ color: "var(--mc-accent)" }}
            >
              {quote.quoteNumber}
            </div>
            <h1 className="text-2xl sm:text-4xl mb-1">{quote.clientName}</h1>
            {quote.clientCompany && (
              <div
                className="text-base italic"
                style={{ color: "var(--mc-text-secondary)" }}
              >
                {quote.clientCompany}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="badge text-sm px-3 py-1.5"
              style={faseToneStyle(faseOpt.tone)}
              title="Fase pipeline (modificabile da Analisi e dalla lista preventivi)"
            >
              <span className="badge-dot" />
              {faseOpt.label}
            </span>
            {isManualQuote && (
              <span
                className="badge text-xs px-2.5 py-1"
                style={{
                  background: "rgba(148,163,184,0.16)",
                  color: "var(--mc-text-secondary)",
                  borderColor: "rgba(148,163,184,0.45)",
                }}
                title="Preventivo creato manualmente (servizio non standardizzato)"
              >
                Manuale
              </span>
            )}
            {!isManualQuote && (
              <a href={`/api/quotes/${quote.id}/pdf`} className="btn-secondary text-sm">
                Scarica PDF
              </a>
            )}
            {!isManualQuote && (
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={async () => {
                  const y = new Date().getFullYear();
                  const ok = window.confirm(
                    `Duplicare come nuova bozza? Verrà creato un altro preventivo con un nuovo numero (progressivo Q${y}-####); questo resta invariato.`
                  );
                  if (!ok) return;
                  const res = await fetch("/api/quotes/duplicate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ quoteId: quote.id }),
                  });
                  const body = await res.json().catch(() => null);
                  if (res.ok && body?.id) {
                    window.location.href = `/preventivi/${body.id}`;
                  } else {
                    alert((body && body.error) || "Errore duplicazione bozza");
                  }
                }}
              >
                Duplica come nuova bozza
              </button>
            )}
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs"
          style={{ color: "var(--mc-text-muted)" }}
        >
          <span>Creato da {quote.user.name}</span>
          <span>·</span>
          <span>{formatDateTime(quote.createdAt)}</span>
          {quote.crmCustomerId && (
            <>
              <span>·</span>
              <span className="font-mono">CRM #{quote.crmCustomerId}</span>
            </>
          )}
        </div>
      </div>

      {bannerText && (
        <div className="mb-5 alert alert-success">
          <span className="text-sm font-semibold">{bannerText}</span>
          <span className="text-xs block mt-1" style={{ opacity: 0.9 }}>
            In sola lettura: voci e importi non si modificano qui. Duplica per creare una bozza con le modifiche richieste
            dal cliente.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna sinistra */}
        <div className="lg:col-span-2 space-y-5">
          {/* Dati cliente */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-4">Cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <div className="label">Nome referente</div>
                <div className="text-sm font-medium">{quote.clientName}</div>
              </div>
              {quote.clientCompany && (
                <div>
                  <div className="label">Ragione sociale</div>
                  <div className="text-sm font-medium">{quote.clientCompany}</div>
                </div>
              )}
              {quote.clientEmail && (
                <div>
                  <div className="label">Email</div>
                  <div className="text-sm font-medium">
                    <a
                      href={`mailto:${quote.clientEmail}`}
                      className="hover:underline"
                      style={{ color: "var(--mc-accent)" }}
                    >
                      {quote.clientEmail}
                    </a>
                  </div>
                </div>
              )}
              {quote.clientPhone && (
                <div>
                  <div className="label">Telefono</div>
                  <div className="text-sm font-medium">
                    <a
                      href={`tel:${quote.clientPhone}`}
                      className="hover:underline"
                      style={{ color: "var(--mc-accent)" }}
                    >
                      {quote.clientPhone}
                    </a>
                  </div>
                </div>
              )}

              {fullAddress && (
                <div className="sm:col-span-2">
                  <div className="label">Indirizzo</div>
                  <div className="text-sm font-medium">{fullAddress}</div>
                </div>
              )}

              {quote.clientVat && (
                <div>
                  <div className="label">Partita IVA</div>
                  <div className="text-sm font-medium font-mono">
                    {quote.clientVat}
                  </div>
                </div>
              )}
              {quote.clientSdi && (
                <div>
                  <div className="label">Codice SDI</div>
                  <div className="text-sm font-medium font-mono">
                    {quote.clientSdi}
                  </div>
                </div>
              )}
              {quote.clientNotes && (
                <div className="sm:col-span-2">
                  <div className="label">Note cliente</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {quote.clientNotes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(quote.originCliente ||
            quote.estrattoDiagnosi ||
            quote.roiPreventiviMese != null ||
            roiSnap) && (
            <div className="card p-5 sm:p-6">
              <h2 className="text-2xl mb-4">Diagnosi &amp; ROI</h2>
              {(quote.originCliente || quote.estrattoDiagnosi) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {quote.originCliente && (
                    <div>
                      <div className="label">Origine cliente</div>
                      <div className="text-sm font-medium">{quote.originCliente}</div>
                    </div>
                  )}
                  {quote.estrattoDiagnosi && (
                    <div className="sm:col-span-2">
                      <div className="label">Estratto diagnosi</div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {quote.estrattoDiagnosi}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div
                className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: "var(--mc-text-secondary)" }}
              >
                I numeri del cliente (alla creazione)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="label">Prev. / mese</div>
                  <div className="font-medium tabular-nums">
                    {roiSnap?.inputs.preventiviMese ?? quote.roiPreventiviMese ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Importo medio €</div>
                  <div className="font-medium tabular-nums">
                    {roiSnap?.inputs.importoMedio ?? quote.roiImportoMedio ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Conv. %</div>
                  <div className="font-medium tabular-nums">
                    {roiSnap?.inputs.conversioneAttuale ?? quote.roiConversioneAttuale ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Margine %</div>
                  <div className="font-medium tabular-nums">
                    {roiSnap?.inputs.margineCommessa ?? quote.roiMargineCommessa ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voci preventivo */}
          <div className="card p-5 sm:p-6">
            <h2 className="text-2xl mb-5">Composizione offerta</h2>
            <div className="space-y-6">
              {showSetupSection && (
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: "var(--mc-text-secondary)" }}
                  >
                    Setup una tantum
                  </h3>
                  <div className="space-y-1">
                    {setupLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start gap-3 py-2.5"
                        style={{ borderBottom: "1px solid var(--mc-border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {item.productName}
                          </div>
                          <div
                            className="text-xs font-mono mt-0.5"
                            style={{ color: "var(--mc-text-muted)" }}
                          >
                            {item.productCode}
                            {item.quantity > 1 && ` · × ${item.quantity}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-semibold tabular-nums">
                          {formatEuro(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}

                    {quote.diagnosiGiaPagata && (
                      <div
                        className="flex justify-between items-start gap-3 py-2.5"
                        style={{ borderBottom: "1px solid var(--mc-border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-semibold text-sm"
                            style={{ color: "var(--mc-success)" }}
                          >
                            Diagnosi Strategica (già versata)
                          </div>
                        </div>
                        <div
                          className="text-right shrink-0 font-semibold tabular-nums"
                          style={{ color: "var(--mc-success)" }}
                        >
                          −{formatEuro(DIAGNOSI_VOUCHER_AMOUNT)}
                        </div>
                      </div>
                    )}

                    <div
                      className="pt-3 space-y-1.5 text-sm"
                      style={{ borderTop: "1px solid var(--mc-border)" }}
                    >
                      <div className="flex justify-between">
                        <span style={{ color: "var(--mc-text-secondary)" }}>
                          Subtotale setup
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatEuro(quote.setupBeforeDiscount || quote.totalOneTime)}
                        </span>
                      </div>
                      {quote.discountAmount > 0 &&
                        quote.discountType !== "volume_5" &&
                        quote.discountType !== "volume_10" && (
                          <div
                            className="flex justify-between"
                            style={{ color: "var(--mc-success)" }}
                          >
                            <span className="text-xs">
                              {quote.discountType &&
                                (discountTypeLabels[quote.discountType] ||
                                  quote.discountType)}
                              {quote.discountCode && ` · ${quote.discountCode}`}
                              {quote.discountPercent > 0 && ` (−${quote.discountPercent}%)`}
                              {quote.discountPercent <= 0 &&
                                quote.discountAmount > 0 &&
                                ` (−${formatEuro(quote.discountAmount)})`}
                            </span>
                            <span className="font-semibold text-xs tabular-nums">
                              −{formatEuro(quote.discountAmount)}
                            </span>
                          </div>
                        )}
                      {quote.voucherAuditApplied && (
                        <div
                          className="flex justify-between"
                          style={{ color: "var(--mc-success)" }}
                        >
                          <span className="text-xs">Voucher Audit Lampo</span>
                          <span className="font-semibold text-xs tabular-nums">
                            −{formatEuro(AUDIT_VOUCHER_AMOUNT)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {monthlyItems.length > 0 && (
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: "var(--mc-text-secondary)" }}
                  >
                    Canoni mensili
                  </h3>
                  <div className="space-y-1">
                    {monthlyItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start gap-3 py-2.5"
                        style={{ borderBottom: "1px solid var(--mc-border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {item.productName}
                          </div>
                          <div
                            className="text-xs font-mono mt-0.5"
                            style={{ color: "var(--mc-text-muted)" }}
                          >
                            {item.productCode}
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-semibold tabular-nums">
                          {formatEuro(item.price)}
                          <span
                            className="text-xs font-normal"
                            style={{ color: "var(--mc-text-muted)" }}
                          >
                            /mese
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(quote.scontoCrmAnnuale ||
                    quote.scontoAiVocaleAnnuale ||
                    quote.scontoWaAnnuale) && (
                    <div className="alert alert-success mt-3" style={{ fontSize: "0.75rem" }}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>
                        Pagamento annuale anticipato attivo per:{" "}
                        {[
                          quote.scontoCrmAnnuale && "CRM (−20%)",
                          quote.scontoAiVocaleAnnuale && "AI Vocale (−15%)",
                          quote.scontoWaAnnuale && "WhatsApp (−15%)",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        . L&apos;importo annuale è già incluso nel totale una tantum.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {quote.notes && (
            <div className="card p-5 sm:p-6">
              <h2 className="text-2xl mb-3">Note interne</h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {quote.notes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="label">Una tantum (alla firma)</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">
              {formatEuro(quote.totalOneTime)}
            </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="card-muted p-3">
              <div className="label">Costo 1° anno</div>
              <div className="font-semibold tabular-nums">{quote.costAnnual > 0 ? formatEuro(quote.costAnnual) : "—"}</div>
            </div>
            <div className="card-muted p-3">
              <div className="label">Margine 1° anno</div>
              <div className="font-semibold tabular-nums">
                {quote.marginAnnual !== 0 ? formatEuro(quote.marginAnnual) : "—"}{" "}
                <span style={{ color: "var(--mc-text-secondary)", fontWeight: 600 }}>
                  ({formatPct(quote.marginPercentAnnual)})
                </span>
              </div>
            </div>
          </div>

            {quote.totalMonthly > 0 && (
              <>
                <div className="label mt-4">Canoni mese per mese</div>
                <div className="text-2xl font-bold tabular-nums mt-0.5">
                  {formatEuro(quote.totalMonthly)}
                  <span
                    className="text-sm font-normal ml-1"
                    style={{ color: "var(--mc-text-muted)" }}
                  >
                    /mese
                  </span>
                </div>
              </>
            )}

            {creditoMetodoCantiere > 0 && (
              <div
                className="mt-4 rounded-lg p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(45, 122, 62, 0.14), rgba(45, 122, 62, 0.05))",
                  border: "1px solid rgba(45, 122, 62, 0.4)",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2D7A3E" }}>
                  Credito MC
                </div>
                <div className="text-xl font-bold tabular-nums mt-1" style={{ color: "#2D7A3E" }}>
                  {formatEuro(creditoMetodoCantiere)}
                </div>
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--mc-text-muted)" }}>
                  10% sul netto setup modulo listino (dopo voucher e sconto codice sul setup). I canoni in anticipo annuo
                  non entrano in questa base. Spendibile entro 12 mesi su qualunque voce del listino.
                </p>
              </div>
            )}

            <div
              className="pt-4 mt-4"
              style={{ borderTop: "2px solid var(--mc-text)" }}
            >
              <div className="label">Totale primo anno</div>
              <div
                className="text-3xl font-bold tabular-nums mt-0.5"
                style={{ color: "var(--mc-accent)", letterSpacing: "-0.02em" }}
              >
                {formatEuro(quote.totalAnnual)}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--mc-text-muted)" }}
              >
                IVA esclusa
              </div>
            </div>
          </div>

          {roiSnap && (
            <div className="card p-5">
              <h3
                className="text-sm font-bold uppercase tracking-wider mb-3"
                style={{ color: "var(--mc-accent)" }}
              >
                ROI (snapshot)
              </h3>
              <p className="text-xs mb-3" style={{ color: "var(--mc-text-muted)" }}>
                Valori congelati al salvataggio: non cambiano se modifichi il listino ROI in admin.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Margine annuo baseline</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiSnap.margineAnnuoBaseline)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Margine stimato proposta</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiSnap.margineStimatoProposta)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Valore quota diagnosi</span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(roiSnap.valoreQuotaDiagnosi)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span style={{ color: "var(--mc-text-secondary)" }}>Indice</span>
                  <span className="font-semibold tabular-nums">
                    {roiSnap.indice != null ? roiSnap.indice.toFixed(2) : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {quote.expiresAt && (
            <div className="card p-5">
              <div className="label">Scadenza preventivo</div>
              <div className="font-semibold text-sm mt-1">{formatDate(quote.expiresAt)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
