import express from "express";
import fs from "fs";
import { resolveOrderDocumentPath } from "../helpers/orderDocuments.js";

const router = express.Router();

/**
 * Public PDF download for ticket/invoice email buttons.
 * Always returns a PDF or JSON 404 — never the SPA/login page.
 */
router.get("/order-docs/:token/:filename", (req, res) => {
  const absolute = resolveOrderDocumentPath(
    req.params.token,
    req.params.filename
  );

  if (!absolute) {
    return res.status(404).json({
      message: "Document not found. It may have expired or the link is invalid.",
    });
  }

  const filename = req.params.filename;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${filename.replace(/"/g, "")}"`
  );
  res.setHeader("Cache-Control", "private, max-age=3600");

  fs.createReadStream(absolute).pipe(res);
});

export { router as publicDocs };
