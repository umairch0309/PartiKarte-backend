import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Matches partikarte-frontend/src/styles/_variables.scss */
export const BRAND = {
  primary: "#3d8aff",
  secondary: "#0e2d5d",
  text: "#1d1e25",
  muted: "#5b6b86",
  border: "#e8eef6",
  pageBg: "#f0f4fa",
  cardBg: "#ffffff",
  softBlue: "#eaf2ff",
  font: "'Outfit', Arial, Helvetica, sans-serif",
};

const LOGO_WHITE = "partikarte-logo-white.png";
const LOGO_ON_BLUE = "partikarte-logo-on-blue.png";
const LOGO_COLOR = "partikarte-logo.png";
export const BRAND_LOGO_CID = "partikarte-logo";
export const BRAND_NAME = "Partikarte";

const candidatePaths = [
  path.join(__dirname, "email_templates", "include", LOGO_WHITE),
  path.join(__dirname, "email_templates", "include", LOGO_COLOR),
  path.join(__dirname, "..", "uploads", "images", "partikarte_data", LOGO_WHITE),
  path.join(__dirname, "..", "uploads", "images", "partikarte_data", LOGO_COLOR),
];

function resolveLogoPath(preferredFile) {
  if (preferredFile) {
    const preferred = [
      path.join(__dirname, "email_templates", "include", preferredFile),
      path.join(__dirname, "..", "uploads", "images", "partikarte_data", preferredFile),
    ];
    for (const candidate of preferred) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function fileForVariant(variant = "color") {
  if (variant === "white") return LOGO_WHITE;
  if (variant === "on-blue" || variant === "footer") return LOGO_ON_BLUE;
  return LOGO_COLOR;
}

export function getBrandLogoBuffer(variant = "white") {
  const logoPath = resolveLogoPath(fileForVariant(variant));
  if (!logoPath) return null;
  return fs.readFileSync(logoPath);
}

/** Base64 data URI — reliable for PDF/puppeteer rendering. */
export function getBrandLogoDataUri(variant = "color") {
  const logoPath = resolveLogoPath(fileForVariant(variant));
  if (!logoPath) return "";
  const buffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * For HTML emails: prefer a public HTTPS URL when configured.
 * Otherwise use CID so Resend/SendGrid embed the image inline.
 */
export function getBrandLogoCidUrl() {
  if (process.env.BRAND_LOGO_URL) return process.env.BRAND_LOGO_URL;
  return `cid:${BRAND_LOGO_CID}`;
}

/** PDF / local HTML: embedded data URI. */
export function getBrandLogoUrl(variant = "color") {
  if (process.env.BRAND_LOGO_URL) return process.env.BRAND_LOGO_URL;
  return getBrandLogoDataUri(variant);
}

/** Attachment object for Resend/SendGrid inline logo (skip when using public URL). */
export function getBrandLogoInlineAttachment() {
  if (process.env.BRAND_LOGO_URL) return null;
  const buffer = getBrandLogoBuffer("white");
  if (!buffer) return null;
  return {
    filename: LOGO_WHITE,
    content: buffer.toString("base64"),
    type: "image/png",
    contentType: "image/png",
    contentId: BRAND_LOGO_CID,
    content_id: BRAND_LOGO_CID,
    disposition: "inline",
  };
}
