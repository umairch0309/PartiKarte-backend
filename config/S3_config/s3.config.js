import AWS from "aws-sdk";
import env from "./s3.env.js";

export const s3Client = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.REGION,
});

export const uploadParams = {
  Bucket: env.BUCKET,
  Key: "", // pass key
  Body: null, // pass file body
  ContentType: "",
};

export const s3 = {
  s3Client,
  uploadParams,
};
