import s3 from "../config/S3_config/s3.config.js";
import upload from "../config/S3_config/multer.config.js";

import HttpError from "../helpers/HttpError.js";

const uploadS3Image = async (imageName, directory, imageData, next) => {
  const date = Date.now();
  const response = {};
  const savePath = `images/${directory}`;
  const imageFileName = imageName;
  upload.single("file");

  const { s3Client, uploadParams } = s3;
  uploadParams.Key = savePath + date + imageFileName;
  uploadParams.Body = imageData;
  uploadParams.ContentType = "image/jpeg";

  try {
    const uploadedImage = await s3Client.upload(uploadParams).promise();
    console.log(uploadedImage);
    if (uploadedImage) {
      response.status = true;
      response.uploadedImagePath =
        "https://partibucket.s3.amazonaws.com/" +
        savePath +
        date +
        imageFileName;
    }
  } catch (err) {
    return next(new HttpError("Couldn't upload image due to S3", 500));
  }
  return response;
};

export default uploadS3Image;
