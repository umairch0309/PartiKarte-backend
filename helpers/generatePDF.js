import puppeteer from "puppeteer";
import { Buffer } from "buffer";

async function generatePDF(htmlArray) {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ["--disable-extensions"],
    headless: "new",
    args: ["--use-gl=egl", "--no-sandbox", "--disable-setuid-sandbox"],
  });

  const pdfPromises = [];

  for (const html of htmlArray) {
    // console.log(html, "htmlItem", "__________________________");

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
    });

    pdfPromises.push(pdfBuffer);

    await page.close(); // Close the current page to create a new one in the next iteration
  }

  await browser.close();

  // const combinedPdfBuffer = Buffer.concat(pdfPromises);

  return pdfPromises;
}

export default generatePDF;
