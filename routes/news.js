import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  createNews,
  deleteNews,
  getAllNews,
  getNews,
  updateNews,
} from "../controllers/newsControllers.js";

const router = express.Router();

router.get("/news", verifyToken, getAllNews);

router.get("/news/:newsId", verifyToken, getNews);

router.post("/news/create-news", verifyToken, createNews);

router.put("/news/update-news/:newsId", verifyToken, updateNews);

router.delete("/news/delete-news/:newsId", verifyToken, deleteNews);

export { router as news };
