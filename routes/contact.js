import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import uploadS3Image from "../utils/uploadS3Image.js";
import Contact from "../models/contact.js";
import { SendContactUsEmail } from "../helpers/sendEmail.js";

dotenv.config();

const router = express.Router();
router.use(cors());

router.post(
  "/contact-us",

  async (req, res, next) => {
    const { files } = req;

    try {
      const { firstName, lastName, email, object, description, phoneNumber } =
        req.body;

      const attachments =
        req?.files?.map((file) => ({
          content: file.buffer.toString("base64"),
          filename: file.originalname,
          type: file.mimetype,
          disposition: "attachment",
        })) || [];

      const uploadedFiles = [];

      if (files?.length > 0) {
        for (const file of files) {
          const uploadedImage = await uploadS3Image(file, "contact_us/", next);

          if (uploadedImage.uploadedImagePath && uploadedImage.status) {
            uploadedFiles.push(uploadedImage.uploadedImagePath);
          }
        }
      }

      const contactUs = new Contact({
        firstName,
        lastName,
        email,
        object,
        description,
        phoneNumber,
        files: uploadedFiles,
      });
      await contactUs.save();

      await SendContactUsEmail({
        firstName,
        lastName,
        email,
        object,
        description,
        phoneNumber,
        attachments,
      });

      return res.status(200).json({
        message:
          "Your concern has been noticed. We'll get back to you ASAP. Thank you!",
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Error sending contact us email" });
    }
  }
);

export { router as contact };
