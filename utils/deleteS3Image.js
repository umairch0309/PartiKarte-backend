import s3 from "../config/S3_config/s3.config.js";
import env from "../config/S3_config/s3.env.js";

const getImageKeyFromURL = (imageUrl) => {
  const urlParts = imageUrl.split("/");
  const imageKey = urlParts.slice(3).join("/");

  return imageKey;
};

const deleteImageFromS3 = async (imageUrl) => {
  const imageKey = getImageKeyFromURL(imageUrl);
  const params = {
    Bucket: env.BUCKET,
    Key: imageKey,
  };

  try {
    await s3.s3Client.deleteObject(params).promise();
    console.log("Image deleted successfully from S3");
  } catch (error) {
    console.error("Error deleting image from S3:", error);
  }
};

export default deleteImageFromS3;
