import express from "express";
import {
  createNews,
  deleteNews,
  getAllNews,
  getNews,
  updateNews,
} from "../../controllers/newsControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/news", verifyAdminToken, getAllNews);

router.get("/news/:newsId", verifyAdminToken, getNews);

router.post("/news/create-news", verifyAdminToken, createNews);

router.put("/news/update-news/:newsId", verifyAdminToken, updateNews);

router.delete("/news/delete-news/:newsId", verifyAdminToken, deleteNews);

export { router as news };
