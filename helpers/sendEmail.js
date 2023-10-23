import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.EMAIL_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendEmail = async (
  receiver,
  subject,
  config,
  template,
  attachments = []
) => {
  let result;
  try {
    const emailTemplate = await ejs.renderFile(
      __dirname + `/email_templates/${template}.ejs`,
      { ...config }
    );

    const data = {
      to: receiver,
      from: process.env.EMAIL_FROM,
      subject: subject,
      html: emailTemplate,
      ...(attachments?.length > 0 && { attachments }),
    };

    result = await sgMail.send(data);
    console.log("email sent");
  } catch (e) {
    result = e;
    console.log("could not send email", e);
  }

  return result;
};

export const SendOtpEmail = async (data) => {
  const { email, otp } = data;
  const subject = "Forgot Password - OTP Verification";
  const result = sendEmail(
    email,
    subject,
    {
      otp,
      subject,
    },
    "forgot-password"
  );
  return result;
};

export const SendVerifyOtpEmail = async (data) => {
  const { email, otp } = data;
  const subject = "Welcome - Email Verification.";
  const result = sendEmail(
    email,
    subject,
    {
      otp,
      subject,
    },
    "verify-email"
  );
  return result;
};

export const SendContactUsEmail = async (data) => {
  const subject = "Contact Us Email";
  const result = sendEmail(
    process.env.EMAIL_FROM,
    subject,
    { ...data, subject },
    "contact-us",
    data.attachments
  );
  return result;
};

export const SendTicketEmail = async (data) => {
  const subject = "Ticket Confirmation - Thank You";
  const result = sendEmail(
    data?.email,
    subject,
    { ...data, subject },
    "booking-confirmation",
    data.attachments
  );
  return result;
};

export const SendMemberAdditionEmail = async (data) => {
  const { email } = data;
  const subject = "Welcome to the Team";
  const result = sendEmail(
    email,
    subject,
    {
      ...data,
      subject,
    },
    "welcome-member"
  );
  return result;
};

export const SendGuestAddition = async (data) => {
  const { email } = data;
  const subject = "Most Welcome to the Event";
  const result = sendEmail(
    email,
    subject,
    {
      ...data,
      subject,
    },
    "welcome-guest"
  );
  return result;
};

export const SendPasswordChangedEmail = async (data) => {
  const { email } = data;
  const subject = "Password Changed Successfully!";
  const result = sendEmail(
    email,
    subject,
    {
      subject,
    },
    "password-changed"
  );
  return result;
};
