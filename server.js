import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import router from "./routes/index.js";
import connectDB from "./config/db.js";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import cron from "node-cron";

import HttpError from "./helpers/HttpError.js";
import SendBusinessesMoney from "./services/SendBusinessesMoney.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

connectDB();

const app = express();
const port = process.env.PORT || 5600;

const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(upload.any());

cron.schedule("0 0 1 * *", async () => {
  await SendBusinessesMoney();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

app.use("/api/", router);

const buildPath = path.join(__dirname, "build");

app.use(express.static(buildPath));

app.use("/", express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), function (err) {
    if (err) {
      res.status(500).send(err);
      console.log("Error serving file");
    }
  });
});

app.use((req, res, next) => {
  return next(new HttpError("Could not find this route.", 404));
});

app.use((error, req, res, next) => {
  const statusCode = error.code || 500;
  const message = error.message || "An unknown error occurred!";
  res.status(statusCode).json({ message });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
