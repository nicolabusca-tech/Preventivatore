import { generateTemplate } from "./template";
import { Quote, QuoteItem, User } from "@prisma/client";

type QuoteWithRelations = Quote & {
  items: QuoteItem[];
  user: Pick<User, "name" | "email">;
};

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.NETLIFY);
}

export async function generatePdf(quote: QuoteWithRelations): Promise<Buffer> {
  const html = generateTemplate(quote);

  // Local dev: use full puppeteer (bundled Chromium).
  // Serverless (Vercel/Lambda): use puppeteer-core + @sparticuz/chromium.
  const puppeteer = isServerlessRuntime()
    ? (await import("puppeteer-core")).default
    : (await import("puppeteer")).default;

  const launchOpts: any = isServerlessRuntime()
    ? await (async () => {
        const chromium = (await import("@sparticuz/chromium")).default;
        return {
          args: chromium.args,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
          headless: true,
          ignoreHTTPSErrors: true,
        };
      })()
    : {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      };

  const browser = await puppeteer.launch({
    ...launchOpts,
    // Evita hang infiniti in ambienti serverless sotto carico
    protocolTimeout: 60_000,
  } as any);

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

