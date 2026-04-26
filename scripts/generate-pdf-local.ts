import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf/generate-pdf";
import fs from "node:fs";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Missing quote id argument");
    process.exit(2);
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!quote) {
    console.error("Quote not found");
    process.exit(3);
  }

  const pdf = await generatePdf(quote);
  const out = "/tmp/test-pdf.pdf";
  fs.writeFileSync(out, pdf);
  process.stdout.write(out);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

