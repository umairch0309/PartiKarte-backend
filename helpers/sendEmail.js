import nodemailer from "nodemailer";
import HttpError from "./HttpError.js";

const sendEmail = async (email, emailContent, next) => {
  // Create a nodemailer transporter with your email service provider settings

  const transporter = nodemailer.createTransport({
    host: "mcp-5.controlpanel.si",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
    };

    await transporter.sendMail(mailOptions);
    return true; // Email sent successfully
  } catch (error) {
    console.error(error);
    return next(new HttpError("Couldn't sent email", 500));
  }
};

export default sendEmail;
