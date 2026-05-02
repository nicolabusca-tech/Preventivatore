import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureQuoteSchema } from "@/lib/db/ensure-quote-schema";
import { assertCsrf } from "@/lib/security/csrf";
import { computeQuoteCosts } from "@/lib/costs";
import { loadQuoteDetailById } from "@/lib/quotes/serialize-quote-detail";
import { CreateQuoteSchema, badRequestFromZod } from "@/lib/quotes/schemas";
import { ZodError } from "zod";

const DCE_ALLOWED_CODES = ["DCE_BASE", "DCE_STRUTTURATO", "DCE_ENTERPRISE"] as const;
const DIAGNOSI_CODE = "DIAGNOSI_STRATEGICA";
const AUDIT_LAMPO_CODE = "AUDIT_LAMPO";

function buildNextQuoteNumber(prev: string | null, year: number) {
  const prefix = `Q${year}-`;
  const prevNum = prev && prev.startsWith(prefix) ? Number(prev.slice(prefix.length)) : 0;
  const nextNum = Number.isFinite(prevNum) ? prevNum + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  try {
    assertCsrf(req);
  } catch {
    return NextResponse.json({ error: "CSRF" }, { status: 403 });
  }

  await ensureQuoteSchema();

  // Validazione Zod del payload: se manca un campo obbligatorio o un tipo è
  // sbagliato, restituiamo 400 con messaggi leggibili invece di un 500.
  let data: import("@/lib/quotes/schemas").CreateQuotePayload;
  try {
    data = CreateQuoteSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(badRequestFromZod(e), { status: 400 });
    }
    return NextResponse.json({ error: "Payload non leggibile (JSON malformato)" }, { status: 400 });
  }
  const {
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientNotes,
    clientVat,
    clientSdi,
    clientAddress,
    clientPostalCode,
    clientCity,
    clientProvince,
    originCliente,
    estrattoDiagnosi,
    roiPreventiviMese,
    roiImportoMedio,
    roiConversioneAttuale,
    roiMargineCommessa,
    roiSnapshot,
    crmCustomerId,
    scontoAiVocaleAnnuale,
    scontoWaAnnuale,
    diagnosiGiaPagata,
    items,
    dceProductId,
    notes,
    expiresAt,
    totalOneTime,
    totalMonthly,
    totalAnnual,
    setupBeforeDiscount,
    discountType,
    discountAmount,
    discountCode,
    discountPercent,
    scontoCrmAnnuale,
    voucherAuditApplied,
    creditoMcEnabled,
  } = data;

  if (!clientName || !items || items.length === 0) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const wantsDce = typeof dceProductId === "string" && dceProductId.length > 0;

  let dceProduct: { id: string; code: string; name: string; price: number; isMonthly: boolean } | null =
    null;
  if (wantsDce) {
    const p = await prisma.product.findUnique({
      where: { id: dceProductId },
      select: { id: true, code: true, name: true, price: true, isMonthly: true },
    });
    if (!p || !DCE_ALLOWED_CODES.includes(p.code as any) || !p.isMonthly) {
      return NextResponse.json(
        { error: "Livello DCE non valido. Seleziona DCE_BASE, DCE_STRUTTURATO o DCE_ENTERPRISE." },
        { status: 400 }
      );
    }
    dceProduct = p;
  }

  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);

  const diagnosiPaid = diagnosiGiaPagata !== undefined ? !!diagnosiGiaPagata : true;

  // Enforce: una sola DCE, e deve essere quella selezionata da Product (no prezzi liberi)
  const itemsWithoutDce = Array.isArray(items)
    ? items.filter(
        (it: any) =>
          !it ||
          typeof it.productCode !== "string" ||
          !DCE_ALLOWED_CODES.some((c) => it.productCode === c || it.productCode.startsWith("DCE"))
      )
    : [];

  const itemsWithoutDiagnosi = itemsWithoutDce.filter(
    (it: any) =>
      !it ||
      typeof it.productCode !== "string" ||
      (it.productCode !== DIAGNOSI_CODE && it.productCode !== AUDIT_LAMPO_CODE)
  );

  // Nessuna riga "Diagnosi" aggiunta in automatico se non è nei items: in UI la diagnosi a fini
  // addebito andrebbe scelta in listino; il credito (già versata) passa da diagnosiGiaPagata.
  const finalItems = [
    ...itemsWithoutDiagnosi,
    ...(dceProduct
      ? [
          {
            productCode: dceProduct.code,
            productName: dceProduct.name,
            price: dceProduct.price,
            quantity: 1,
            isMonthly: true,
            notes: null,
          },
        ]
      : []),
  ];

  // Create with retry to avoid duplicate quoteNumber in concurrent requests.
  let quote: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const last = await prisma.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: "desc" },
        select: { quoteNumber: true },
      });
      const quoteNumber = buildNextQuoteNumber(last?.quoteNumber ?? null, year);

      quote = await prisma.$transaction(async (tx) => {
        const created = await tx.quote.create({
          data: {
          quoteNumber,
          userId: session.user.id,
          // Forza lo stato iniziale: alcuni DB legacy avevano default "pending".
          status: "draft",
          dceProductId: dceProduct ? dceProduct.id : null,
          clientName,
          clientCompany,
          clientEmail,
          clientPhone,
          clientNotes,
          clientVat: clientVat || null,
          clientSdi: clientSdi || null,
          clientAddress: clientAddress ?? null,
          clientPostalCode: clientPostalCode ?? null,
          clientCity: clientCity ?? null,
          clientProvince: clientProvince ?? null,
          originCliente: originCliente ?? null,
          estrattoDiagnosi: estrattoDiagnosi ?? null,
          diagnosiGiaPagata: diagnosiPaid,
          roiPreventiviMese: roiPreventiviMese ?? null,
          roiImportoMedio: roiImportoMedio ?? null,
          roiConversioneAttuale: roiConversioneAttuale ?? null,
          roiMargineCommessa: roiMargineCommessa ?? null,
          roiSnapshot: roiSnapshot ?? null,
          crmCustomerId: crmCustomerId ?? null,
          scontoAiVocaleAnnuale: scontoAiVocaleAnnuale ?? false,
          scontoWaAnnuale: scontoWaAnnuale ?? false,
          notes,
          expiresAt: expiresAt ? new Date(expiresAt) : defaultExpiry,
          totalOneTime: totalOneTime || 0,
          totalMonthly: totalMonthly || 0,
          totalAnnual: totalAnnual || 0,
          setupBeforeDiscount: setupBeforeDiscount || totalOneTime || 0,
          discountType: discountType || null,
          discountAmount: discountAmount || 0,
          discountCode: discountCode || null,
          discountPercent: discountPercent || 0,
          scontoCrmAnnuale: scontoCrmAnnuale ?? false,
          voucherAuditApplied: voucherAuditApplied || false,
          // Default false sui nuovi preventivi: il credito e' una leva
          // commerciale opzionale che il commerciale accende caso per caso.
          creditoMcEnabled: creditoMcEnabled === true,
          items: {
            create: finalItems.map((item: any) => ({
              productCode: item.productCode,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity || 1,
              isMonthly: item.isMonthly || false,
              notes: item.notes,
            })),
          },
          },
          include: { items: true },
        });

        // --- Costi e margini (snapshot) ---
        const productCodes = created.items.map((it) => it.productCode);
        const products = await tx.product.findMany({
          where: { code: { in: productCodes } },
          select: {
            code: true,
            costs: {
              where: { active: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                unitCostCents: true,
                unit: true,
                multiplierKind: true,
                multiplierValue: true,
                conditionsJson: true,
                active: true,
              },
            },
          },
        });
        const costsByCode = new Map(products.map((p) => [p.code, p.costs]));
        const computed = computeQuoteCosts({
          ctx: {
            scontoCrmAnnuale: created.scontoCrmAnnuale,
            scontoAiVocaleAnnuale: created.scontoAiVocaleAnnuale,
            scontoWaAnnuale: created.scontoWaAnnuale,
          },
          revenueAnnual: created.totalAnnual,
          items: created.items.map((it) => ({
            id: it.id,
            productCode: it.productCode,
            quantity: it.quantity,
            isMonthly: it.isMonthly,
          })),
          costsByProductCode: costsByCode,
        });

        if (computed.itemCosts.length > 0) {
          await tx.quoteItemCost.createMany({
            data: computed.itemCosts.map((c) => ({
              quoteItemId: c.quoteItemId,
              productCostId: c.productCostId,
              name: c.name,
              unitCostCents: c.unitCostCents,
              unit: c.unit,
              multiplier: c.multiplier,
              lineCostCents: c.lineCostCents,
            })),
          });
        }

        const updated = await tx.quote.update({
          where: { id: created.id },
          data: {
            costSetup: computed.costSetup,
            costMonthly: computed.costMonthly,
            costAnnual: computed.costAnnual,
            marginAnnual: computed.marginAnnual,
            marginPercentAnnual: computed.marginPercentAnnual,
          },
          include: { items: true },
        });

        return updated;
      });

      break;
    } catch (e: any) {
      // Prisma unique constraint violation on quoteNumber
      if (e?.code === "P2002") continue;
      throw e;
    }
  }
  if (!quote) {
    return NextResponse.json({ error: "Impossibile generare quoteNumber" }, { status: 500 });
  }

  // Se usato un codice manuale, incrementa contatore utilizzi
  if (discountType === "manual" && discountCode) {
    await prisma.discountCode.updateMany({
      where: { code: discountCode.toUpperCase().trim() },
      data: { usedCount: { increment: 1 } },
    });
  }

  const detail = await loadQuoteDetailById(quote.id);
  if (!detail) {
    return NextResponse.json({ error: "Preventivo creato ma non recuperabile." }, { status: 500 });
  }
  return NextResponse.json(detail);
}
