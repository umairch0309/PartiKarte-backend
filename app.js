import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import router from "./routes/index.js";
import connectDB from "./config/db.js";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";

import HttpError from "./helpers/HttpError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(upload.any());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

const allowedOrigins = [
  "https://partikarte-frontend.vercel.app",
  "https://partikarte-admin-five.vercel.app",
  "https://partikarte-admin.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:4173",
  "http://localhost:4174",
  "http://localhost:3000",
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/partikarte-frontend.*\.vercel\.app$/.test(origin) ||
        /^https:\/\/partikarte-admin.*\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/", router);

// Local uploaded files (S3 fallback for development)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!process.env.VERCEL) {
  const adminBuildPath = path.join(__dirname, "admin-build");

  app.use(express.static(adminBuildPath));
  app.use("/admin", express.static(adminBuildPath));

  app.get("/admin/*", (req, res) => {
    res.sendFile(path.join(adminBuildPath, "index.html"), function (err) {
      if (err) {
        res.status(500).send(err);
        console.log("Error serving file");
      }
    });
  });

  const buildPath = path.join(__dirname, "build");
  app.use(express.static(buildPath));
  app.use("/", express.static(buildPath));
  app.get("/*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"), function (err) {
      if (err) {
        res.status(500).send(err);
        console.log("Error serving file");
      }
    });
  });
}

app.use((req, res, next) => {
  return next(new HttpError("Could not find this route.", 404));
});

app.use((error, req, res, next) => {
  const statusCode = error.code || 500;
  const message = error.message || "An unknown error occurred!";
  res.status(statusCode).json({ message });
});

export default app;
