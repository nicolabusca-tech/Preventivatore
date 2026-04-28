import { PrismaClient } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function createClient(url: string) {
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

async function main() {
  const sourceUrl = requireEnv("SOURCE_DATABASE_URL");
  const targetUrl = requireEnv("TARGET_DATABASE_URL");

  const src = createClient(sourceUrl);
  const dst = createClient(targetUrl);

  try {
    const [
      srcUsers,
      srcProducts,
      srcRoiConfig,
      srcDiscountCodes,
      srcQuotes,
      srcQuoteItems,
    ] = await Promise.all([
      src.user.findMany(),
      src.product.findMany(),
      src.roiConfig.findMany(),
      src.discountCode.findMany(),
      src.quote.findMany(),
      src.quoteItem.findMany(),
    ]);

    await dst.$transaction(async (tx) => {
      // Wipe target in FK-safe order
      await tx.quoteItem.deleteMany();
      await tx.quote.deleteMany();
      await tx.discountCode.deleteMany();
      await tx.roiConfig.deleteMany();
      await tx.product.deleteMany();
      await tx.user.deleteMany();

      // Re-import (preserve ids and timestamps)
      if (srcUsers.length) {
        await tx.user.createMany({ data: srcUsers });
      }
      if (srcProducts.length) {
        await tx.product.createMany({ data: srcProducts });
      }
      if (srcRoiConfig.length) {
        await tx.roiConfig.createMany({ data: srcRoiConfig });
      }
      if (srcDiscountCodes.length) {
        await tx.discountCode.createMany({ data: srcDiscountCodes });
      }
      if (srcQuotes.length) {
        await tx.quote.createMany({ data: srcQuotes });
      }
      if (srcQuoteItems.length) {
        await tx.quoteItem.createMany({ data: srcQuoteItems });
      }
    });

    const [u, p, r, d, q, qi] = await Promise.all([
      dst.user.count(),
      dst.product.count(),
      dst.roiConfig.count(),
      dst.discountCode.count(),
      dst.quote.count(),
      dst.quoteItem.count(),
    ]);

    console.log(
      JSON.stringify(
        {
          status: "ok",
          imported: {
            users: u,
            products: p,
            roiConfig: r,
            discountCodes: d,
            quotes: q,
            quoteItems: qi,
          },
        },
        null,
        2
      )
    );
  } finally {
    await Promise.allSettled([src.$disconnect(), dst.$disconnect()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

