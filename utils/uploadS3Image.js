import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { put } from "@vercel/blob";
import s3 from "../config/S3_config/s3.config.js";
import env from "../config/S3_config/s3.env.js";
import HttpError from "../helpers/HttpError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "uploads");

function buildPublicBaseUrl() {
  const port = process.env.PORT || 5600;
  return (
    process.env.PUBLIC_API_URL || `http://localhost:${port}`
  ).replace(/\/$/, "");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function buildFileName(image, directory) {
  const extension = `.${(image.mimetype || "image/png").split("/")[1] || "png"}`;
  const safeDir = String(directory || "").replace(/^\/+|\/+$/g, "");
  return `images/${safeDir}/${uuidv4()}${image.fieldname || "file"}${extension}`;
}

function saveLocalImage(image, directory) {
  const relativeDir = path.join("images", directory).replace(/\\/g, "/");
  const absDir = path.join(uploadsRoot, relativeDir);
  ensureDir(absDir);

  const extension = `.${(image.mimetype || "image/png").split("/")[1] || "png"}`;
  const fileName = `${uuidv4()}${image.fieldname || "file"}${extension}`;
  const absPath = path.join(absDir, fileName);

  fs.writeFileSync(absPath, image.buffer);

  const relativePath = `${relativeDir}/${fileName}`.replace(/\\/g, "/");
  const publicUrl = `${buildPublicBaseUrl()}/uploads/${relativePath}`;

  console.log(`[uploads] Saved locally: ${publicUrl}`);

  return {
    status: true,
    uploadedImagePath: publicUrl,
    storage: "local",
  };
}

async function saveVercelBlobImage(image, directory) {
  const pathname = buildFileName(image, directory);
  const blob = await put(pathname, image.buffer, {
    access: "public",
    contentType: image.mimetype || "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  console.log(`[uploads] Saved to Vercel Blob: ${blob.url}`);

  return {
    status: true,
    uploadedImagePath: blob.url,
    storage: "vercel-blob",
  };
}

async function saveS3Image(image, directory) {
  const savePath = `images/${directory}`;
  const fileFormat = `.${image.mimetype.split("/")[1]}`;
  const imageFileName = path.basename(image.fieldname);
  const pathOfImage = savePath + uuidv4() + imageFileName + fileFormat;

  const { s3Client, uploadParams } = s3;
  uploadParams.Key = pathOfImage;
  uploadParams.Body = image.buffer;
  uploadParams.ContentType = image.mimetype;

  const uploadedImage = await s3Client.upload(uploadParams).promise();
  if (!uploadedImage) {
    return { status: false, uploadedImagePath: "" };
  }

  return {
    status: true,
    uploadedImagePath: `https://${env.BUCKET}.s3.amazonaws.com/${pathOfImage}`,
    storage: "s3",
  };
}

const uploadS3Image = async (image, directory, next) => {
  if (!image?.buffer) {
    const error = new HttpError("No image file provided", 400);
    if (typeof next === "function") return next(error);
    throw error;
  }

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasAwsKeys = Boolean(env.AWS_ACCESS_KEY && env.AWS_SECRET_ACCESS_KEY);

  try {
    // Vercel Blob — works on Vercel without AWS
    if (hasBlobToken) {
      return await saveVercelBlobImage(image, directory);
    }

    // Local disk — localhost only (Vercel filesystem is read-only)
    if (env.USE_LOCAL_UPLOAD_FALLBACK && !isVercelRuntime()) {
      console.warn(
        "[uploads] No BLOB_READ_WRITE_TOKEN — storing image locally under /uploads"
      );
      return saveLocalImage(image, directory);
    }

    // Optional AWS if configured
    if (hasAwsKeys) {
      return await saveS3Image(image, directory);
    }

    const error = new HttpError(
      isVercelRuntime()
        ? "Image upload requires Vercel Blob. Add BLOB_READ_WRITE_TOKEN (Storage → Blob) and redeploy."
        : "Image upload is not configured. Set BLOB_READ_WRITE_TOKEN or enable local upload fallback.",
      500
    );
    if (typeof next === "function") return next(error);
    throw error;
  } catch (err) {
    if (err instanceof HttpError) {
      if (typeof next === "function") return next(err);
      throw err;
    }

    const message = err?.message || err?.code || "Image upload failed";
    console.error(`[uploads] Upload failed: ${message}`);

    if (env.USE_LOCAL_UPLOAD_FALLBACK && !isVercelRuntime()) {
      console.warn("[uploads] Falling back to local disk storage");
      return saveLocalImage(image, directory);
    }

    const error = new HttpError(message, 500);
    if (typeof next === "function") return next(error);
    throw error;
  }
};

export default uploadS3Image;
