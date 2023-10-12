import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import generatePDF from "./generatePDF.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateInvoice = async (data) => {
  let result = null;

  try {
    const html = await ejs.renderFile(
      __dirname + `/ticket_templates/invoice.ejs`,
      { ...data }
    );

    if (html) {
      // console.log("generating pdf of invoice", html);
      result = await generatePDF([html]);
    }
    console.log("Invoice generated");
  } catch (e) {
    console.error("Could not generate tickets", e);
  }

  return result;
};

export default generateInvoice;
