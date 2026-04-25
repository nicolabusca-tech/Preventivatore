export function formatEuro(value: number, withCurrency = true): string {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return withCurrency ? `${formatted} €` : formatted;
}

export function formatDate(date: Date | string, format: "long" | "short" = "long"): string {
  const d = new Date(date);
  if (format === "long") {
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("it-IT");
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export function getClientDisplayName(quote: {
  clientCompany?: string | null;
  clientName?: string | null;
}): { primary: string; secondary: string | null } {
  const company = quote.clientCompany?.trim() || null;
  const name = quote.clientName?.trim() || null;

  if (company && name && company.toLowerCase() !== name.toLowerCase()) {
    return { primary: company, secondary: name };
  }

  if (company) {
    return { primary: company, secondary: null };
  }

  return { primary: name || "Cliente", secondary: null };
}

export function getDiscountLabel(quote: {
  discountType?: string | null;
  discountAmount?: number | null;
  discountCode?: string | null;
  discountPercent?: number | null;
}): string | null {
  const amount = quote.discountAmount ?? 0;
  if (!quote.discountType || amount <= 0) return null;

  switch (quote.discountType) {
    case "volume_5":
      return "Sconto volume 5% (3+ moduli)";
    case "volume_10":
      return "Sconto volume 10% (5+ moduli)";
    case "manual":
      return quote.discountCode
        ? `Codice \"${quote.discountCode}\" (-${quote.discountPercent ?? 0}%)`
        : `Sconto manuale (-${quote.discountPercent ?? 0}%)`;
    default:
      return "Sconto applicato";
  }
}

