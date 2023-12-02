import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import generatePDF from "./generatePDF.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisified QRCode.toDataURL function
function generateQRCodeData(qrCodeData) {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(qrCodeData, (err, qrDataURL) => {
      if (err) {
        reject(err);
      } else {
        resolve(qrDataURL);
      }
    });
  });
}

const generateTickets = async (tickets) => {
  let result = null;

  try {
    const htmlFiles = [];

    for (const ticket of tickets) {
      console.log(ticket?.noOfTickets, "ticket number ");

      for (let i = 0; i < ticket?.noOfTickets; i++) {
        const qrCodeDataString = `${ticket?.qrCodeData}${i + 1}`;
        console.log(qrCodeDataString, "qrCodeDataString");
        const qrCode = await generateQRCodeData(qrCodeDataString);

        const html = await ejs.renderFile(
          __dirname + `/ticket_templates/template.ejs`,
          { ...ticket?.ticketAppearance, qrCode }
        );

        htmlFiles.push(html);
      }
    }

    if (htmlFiles?.length > 0) {
      result = await generatePDF(htmlFiles);
    }

    console.log("Tickets generated");
  } catch (e) {
    console.error("Could not generate tickets", e);
  }

  return result;
};

export default generateTickets;
