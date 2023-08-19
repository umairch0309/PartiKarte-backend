import unidecode from "unidecode";
import HttpError from "./HttpError.js";
import sharp from "sharp";
import path from "path";

export function generateUrlSlug(organizerName) {
  const decodedName = unidecode(organizerName);

  return decodedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculatePriceWithVAT(price, vatPercentage) {
  const vat = (price * vatPercentage) / 100;
  const priceWithVAT = price + vat;
  return { vat, priceWithVAT };
}

export const isImageFile = async (type, next) => {
  const isImage = type?.startsWith("image/");

  if (!isImage) {
    return next(new HttpError("Please upload image or valid type.", 400));
  }
  return;
};

export async function preprocessImage(imagePath) {
  const optimizedImage = sharp(imagePath);
  optimizedImage.jpeg({ quality: 80 });
  const newPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, path.extname(imagePath)) +
      ".optimized" +
      path.extname(imagePath)
  );
  await optimizedImage.toFile(newPath);
  return newPath;
}
