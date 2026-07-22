import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORDER_DOCS_ROOT = path.join(__dirname, "..", "uploads", "order-docs");

function publicApiBase() {
  return (
    process.env.PUBLIC_API_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || 5600}`
  ).replace(/\/$/, "");
}

function toBase64(content) {
  if (!content) return null;
  if (typeof content === "string") return content;
  return Buffer.from(content).toString("base64");
}

function safeFilename(name) {
  const base = path.basename(String(name || ""));
  if (!/^[A-Za-z0-9._-]+\.pdf$/i.test(base)) return null;
  return base;
}

function safeToken(token) {
  const value = String(token || "");
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return value;
}

/**
 * Build Resend/SendGrid PDF attachments from ticket + invoice PDF buffers.
 */
export function buildTicketEmailAttachments(pdfResult = [], invoiceResult = []) {
  const tickets = Array.isArray(pdfResult) ? pdfResult : [];
  const invoices = Array.isArray(invoiceResult) ? invoiceResult : [];
  const attachments = [];

  tickets.forEach((pdf, index) => {
    const content = toBase64(pdf);
    if (!content) return;
    attachments.push({
      content,
      filename: tickets.length === 1 ? "ticket.pdf" : `ticket${index}.pdf`,
      type: "application/pdf",
      contentType: "application/pdf",
      disposition: "attachment",
    });
  });

  invoices.forEach((pdf, index) => {
    const content = toBase64(pdf);
    if (!content) return;
    attachments.push({
      content,
      filename: invoices.length === 1 ? "Invoice.pdf" : `Invoice${index}.pdf`,
      type: "application/pdf",
      contentType: "application/pdf",
      disposition: "attachment",
    });
  });

  return attachments;
}

/**
 * Persist PDFs and return public API download links (never SPA routes).
 */
export function saveOrderDocuments({
  orderId,
  pdfResult = [],
  invoiceResult = [],
}) {
  const token = safeToken(`${orderId}-${randomBytes(8).toString("hex")}`);
  const dir = path.join(ORDER_DOCS_ROOT, token);
  fs.mkdirSync(dir, { recursive: true });

  const tickets = Array.isArray(pdfResult) ? pdfResult : [];
  const invoices = Array.isArray(invoiceResult) ? invoiceResult : [];
  const base = `${publicApiBase()}/api/public/order-docs/${token}`;
  const files = [];

  tickets.forEach((pdf, index) => {
    const filename =
      tickets.length === 1 ? "ticket.pdf" : `ticket${index}.pdf`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(pdf));
    files.push({
      label: filename,
      url: `${base}/${encodeURIComponent(filename)}`,
      kind: "ticket",
    });
  });

  invoices.forEach((pdf, index) => {
    const filename =
      invoices.length === 1 ? "Invoice.pdf" : `Invoice${index}.pdf`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(pdf));
    files.push({
      label: filename,
      url: `${base}/${encodeURIComponent(filename)}`,
      kind: "invoice",
    });
  });

  console.log("order documents saved", {
    token,
    files: files.map((f) => f.label),
    dir,
  });

  return {
    token,
    files,
    ticketUrl: files.find((f) => f.kind === "ticket")?.url || null,
    invoiceUrl: files.find((f) => f.kind === "invoice")?.url || null,
  };
}

/** Resolve a saved order PDF absolute path, or null if invalid/missing. */
export function resolveOrderDocumentPath(token, filename) {
  const safeTok = safeToken(token);
  const safeName = safeFilename(filename);
  if (!safeTok || !safeName) return null;

  const absolute = path.join(ORDER_DOCS_ROOT, safeTok, safeName);
  if (!absolute.startsWith(ORDER_DOCS_ROOT)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}
