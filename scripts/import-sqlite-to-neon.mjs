import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = process.env.SQLITE_PATH || "prisma/dev.db";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "nicola@metodocantiere.com").toLowerCase();

function sqliteJson(sql) {
  const cmd = `sqlite3 "${SQLITE_PATH}" ".mode json" "${sql.replaceAll('"', '""')}"`;
  const out = execSync(cmd, { encoding: "utf8" }).trim();
  return out ? JSON.parse(out) : [];
}

function toDate(v) {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    // sqlite might store ms epoch as string
    const asNum = Number(v);
    if (!Number.isNaN(asNum) && asNum > 1000000000000) return new Date(asNum);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(`Admin user not found in Postgres: ${ADMIN_EMAIL}`);
  }

  const roiRows = sqliteJson(
    `SELECT id, defaultPreventiviMese, defaultImportoMedio, defaultConversione, defaultMargine, createdAt, updatedAt FROM RoiConfig`
  );
  if (roiRows.length > 0) {
    const r = roiRows[0];
    await prisma.roiConfig.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        defaultPreventiviMese: r.defaultPreventiviMese ?? 4,
        defaultImportoMedio: r.defaultImportoMedio ?? 5000,
        defaultConversione: r.defaultConversione ?? 25,
        defaultMargine: r.defaultMargine ?? 20,
        createdAt: toDate(r.createdAt) ?? new Date(),
        updatedAt: toDate(r.updatedAt) ?? new Date(),
      },
      update: {
        defaultPreventiviMese: r.defaultPreventiviMese ?? 4,
        defaultImportoMedio: r.defaultImportoMedio ?? 5000,
        defaultConversione: r.defaultConversione ?? 25,
        defaultMargine: r.defaultMargine ?? 20,
      },
    });
  }

  const quotes = sqliteJson(`SELECT * FROM Quote ORDER BY createdAt ASC`);
  const items = sqliteJson(`SELECT * FROM QuoteItem ORDER BY createdAt ASC`);

  const itemsByQuoteId = new Map();
  for (const it of items) {
    const list = itemsByQuoteId.get(it.quoteId) || [];
    list.push(it);
    itemsByQuoteId.set(it.quoteId, list);
  }

  let importedQuotes = 0;
  let importedItems = 0;

  for (const q of quotes) {
    // Avoid duplicate import if re-run
    const existing = await prisma.quote.findUnique({ where: { quoteNumber: q.quoteNumber } });
    if (existing) continue;

    const qItems = itemsByQuoteId.get(q.id) || [];

    await prisma.quote.create({
      data: {
        quoteNumber: q.quoteNumber,
        userId: admin.id,
        dceProductId: null, // legacy quotes might not match current FK; keep null
        clientName: q.clientName,
        clientCompany: q.clientCompany,
        clientEmail: q.clientEmail,
        clientPhone: q.clientPhone,
        clientNotes: q.clientNotes,
        crmCustomerId: q.crmCustomerId,
        clientAddress: q.clientAddress,
        clientPostalCode: q.clientPostalCode,
        clientCity: q.clientCity,
        clientProvince: q.clientProvince,
        originCliente: q.originCliente,
        estrattoDiagnosi: q.estrattoDiagnosi,
        diagnosiGiaPagata: !!q.diagnosiGiaPagata,
        roiPreventiviMese: q.roiPreventiviMese,
        roiImportoMedio: q.roiImportoMedio,
        roiConversioneAttuale: q.roiConversioneAttuale,
        roiMargineCommessa: q.roiMargineCommessa,
        roiSnapshot: q.roiSnapshot,
        clientVat: q.clientVat,
        clientSdi: q.clientSdi,
        totalSetup: q.totalSetup ?? 0,
        totalMonthly: q.totalMonthly ?? 0,
        totalAnnual: q.totalAnnual ?? 0,
        setupBeforeDiscount: q.setupBeforeDiscount ?? 0,
        discountType: q.discountType,
        discountAmount: q.discountAmount ?? 0,
        discountCode: q.discountCode,
        discountPercent: q.discountPercent ?? 0,
        scontoCrmAnnuale: !!q.scontoCrmAnnuale,
        scontoAiVocaleAnnuale: !!q.scontoAiVocaleAnnuale,
        scontoWaAnnuale: !!q.scontoWaAnnuale,
        voucherAuditApplied: !!q.voucherAuditApplied,
        notes: q.notes,
        status: q.status ?? "draft",
        expiresAt: toDate(q.expiresAt) ?? new Date(),
        createdAt: toDate(q.createdAt) ?? new Date(),
        updatedAt: toDate(q.updatedAt) ?? new Date(),
        items: {
          create: qItems.map((it) => ({
            productCode: it.productCode,
            productName: it.productName,
            price: it.price ?? 0,
            quantity: it.quantity ?? 1,
            isMonthly: !!it.isMonthly,
            notes: it.notes,
            createdAt: toDate(it.createdAt) ?? new Date(),
          })),
        },
      },
    });

    importedQuotes += 1;
    importedItems += qItems.length;
  }

  console.log(
    JSON.stringify(
      {
        sqlite: { quotes: quotes.length, quoteItems: items.length, roiConfigs: roiRows.length },
        imported: { quotes: importedQuotes, quoteItems: importedItems },
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

