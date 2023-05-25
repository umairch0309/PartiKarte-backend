import express from "express";
import {
  getDocumentBySlug,
  AddOrUpdateDoc,
  getNavigationFolders,
} from "../controllers/documentController.js";

const router = express.Router();

// Get a document by urlSlug
router.get("/:urlSlug", getDocumentBySlug);

// Create or update a post
router.put("/:id?", AddOrUpdateDoc);

router.get("/folders/navigation", getNavigationFolders);

export { router as documents };
