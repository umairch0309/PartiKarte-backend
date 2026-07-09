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
    args: ["--use-gl=egl", "--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function generatePDF(htmlArray) {
  const browser = await launchBrowser();
  const pdfPromises = [];

  for (const html of htmlArray) {
    const page = await browser.newPage();
    await page.setContent(html);

    const { height } = await page.evaluate(() => {
      const content = document.body;
      return {
        height: content.offsetHeight,
      };
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      height: `${height + 20}px`,
      printBackground: true,
      dpi: 72,
      quality: 40,
    });

    pdfPromises.push(pdfBuffer);
    await page.close();
  }

  await browser.close();
  return pdfPromises;
}

export default generatePDF;
