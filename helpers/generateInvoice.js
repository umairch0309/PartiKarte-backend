import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import generatePDF from "./generatePDF.js";
import { PLATFORM_FEE_PERCENT } from "../config/stripe.js";
import { getBrandLogoUrl } from "./brandAssets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateInvoice = async (data) => {
  let result = null;

  try {
    const html = await ejs.renderFile(
      path.join(__dirname, "ticket_templates", "invoice.ejs"),
      {
        platformFeePercent: PLATFORM_FEE_PERCENT,
        logoUrl: getBrandLogoUrl("white"),
        headerLogoUrl: getBrandLogoUrl("white"),
        ...data,
      }
    );

    if (html) {
      result = await generatePDF([html]);
    }
    console.log("Invoice generated");
  } catch (e) {
    console.error("Could not generate invoice", e);
  }

  return result;
};

export default generateInvoice;
