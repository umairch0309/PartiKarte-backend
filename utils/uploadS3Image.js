import path from "path";
import { v4 as uuidv4 } from "uuid";
import s3 from "../config/S3_config/s3.config.js";
import upload from "../config/S3_config/multer.config.js";

import HttpError from "../helpers/HttpError.js";

const uploadS3Image = async (image, directory, next) => {
  const savePath = `images/${directory}`;
  const fileFormat = `.${image.mimetype.split("/")[1]}`;
  const imageFileName = path.basename(image.fieldname);
  upload.single("file");

  const pathOfImage = savePath + uuidv4() + imageFileName + fileFormat;

  const { s3Client, uploadParams } = s3;
  uploadParams.Key = pathOfImage;
  uploadParams.Body = image.buffer;
  uploadParams.ContentType = image.mimetype;
  try {
    const uploadedImage = await s3Client.upload(uploadParams).promise();
    // console.log(uploadedImage);
    if (uploadedImage) {
      return {
        status: true,
        uploadedImagePath:
          "https://partibucket.s3.amazonaws.com/" + pathOfImage,
      };
    }
  } catch (err) {
    return next(new HttpError(err, 500));
  }
};

export default uploadS3Image;
