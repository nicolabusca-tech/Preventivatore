import puppeteer from "puppeteer";
import { generateTemplate } from "./template";
import { Quote, QuoteItem, User } from "@prisma/client";

type QuoteWithRelations = Quote & {
  items: QuoteItem[];
  user: Pick<User, "name" | "email">;
};

export async function generatePdf(quote: QuoteWithRelations): Promise<Buffer> {
  const html = generateTemplate(quote);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

