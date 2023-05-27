import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import router from "./routes/index.js";
import connectDB from "./config/db.js";

import HttpError from "./helpers/HttpError.js";

dotenv.config();

connectDB();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json());
app.use("/api/", router);

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
