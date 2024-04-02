import unidecode from "unidecode";
import HttpError from "./HttpError.js";
import sharp from "sharp";
import path from "path";
import crypto from "crypto";

export function generateUrlSlug(organizerName) {
  const decodedName = unidecode(organizerName);

  return decodedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculatePriceWithVAT(price, vatPercentage) {
  const vat = (price * vatPercentage) / 100;
  const priceWithVAT = parseFloat(price) + parseFloat(vat);
  return { vat, priceWithVAT };
}

export function generateOTP() {
  const otpLength = 6;

  const randomBytes = crypto.randomBytes(otpLength);

  const otp = randomBytes
    .toString("hex")
    .slice(0, otpLength)
    .split("")
    .map((byte) => (parseInt(byte, 16) % 10).toString())
    .join("");

  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 5);

  return {
    otp,
    expiry: expiryDate.toISOString(),
  };
}

export function generateRandomCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

export function currencySymbolGenerator(currencyCode) {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    });
    const parts = formatter.formatToParts(1);
    const currencySymbol = parts.find((part) => part.type === "currency").value;
    return currencySymbol || "€";
  } catch (error) {
    return "€";
  }
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
