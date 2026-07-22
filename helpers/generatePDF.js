import puppeteer from "puppeteer";

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");

    return puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  }

  return puppeteer.launch({
    ignoreDefaultArgs: ["--disable-extensions"],
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images || []);
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
          // data-uris / cached images can already be done
          setTimeout(resolve, 1500);
        });
      })
    );
  });
}

async function generatePDF(htmlArray) {
  const browser = await launchBrowser();
  const pdfPromises = [];

  try {
    for (const html of htmlArray) {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: ["load", "domcontentloaded"],
        timeout: 60000,
      });
      await waitForImages(page);

      const { height } = await page.evaluate(() => {
        const content = document.body;
        return {
          height: Math.max(
            content?.scrollHeight || 0,
            content?.offsetHeight || 0,
            800
          ),
        };
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        height: `${height + 20}px`,
        printBackground: true,
        preferCSSPageSize: false,
      });

      pdfPromises.push(Buffer.from(pdfBuffer));
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return pdfPromises;
}

export default generatePDF;
