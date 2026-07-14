import dotenv from "dotenv";

dotenv.config();

const env = {
  BUCKET: process.env.AWS_S3_BUCKET || "partibucket",
  REGION: process.env.AWS_REGION || "eu-west-3",
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  // When true (default in local), S3 failures fall back to disk under /uploads
  USE_LOCAL_UPLOAD_FALLBACK:
    process.env.USE_LOCAL_UPLOAD_FALLBACK !== "false",
};

export default env;
