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
      from: process.env.EMAIL_FROM || "info@partikarte.si",
      subject: subject,
      html: emailTemplate,
      ...(attachments?.length > 0 && { attachments }),
    };

    result = await sgMail.send(data);
    console.log("email sent", { to: receiver, from: data.from, subject });
    return { ok: true, result };
  } catch (e) {
    const details = e?.response?.body || e?.message || e;
    console.error("could not send email", {
      to: receiver,
      from: process.env.EMAIL_FROM || "info@partikarte.si",
      subject,
      details,
    });
    return { ok: false, error: details };
  }
};

export const SendOtpEmail = async (data) => {
  const { email, otp } = data;
  const subject = "Forgot Password - OTP Verification";
  return sendEmail(
    email,
    subject,
    {
      otp,
      subject,
    },
    "forgot-password"
  );
};

export const SendVerifyOtpEmail = async (data) => {
  const { email, otp } = data;
  const subject = "Welcome - Email Verification.";
  return sendEmail(
    email,
    subject,
    {
      otp,
      subject,
    },
    "verify-email"
  );
};

export const SendContactUsEmail = async (data) => {
  const subject = "Contact Us Email";
  return sendEmail(
    process.env.EMAIL_FROM || "info@partikarte.si",
    subject,
    { ...data, subject },
    "contact-us",
    data.attachments
  );
};

export const SendTicketEmail = async (data) => {
  const subject = "Ticket Confirmation - Thank You";
  return sendEmail(
    data?.email,
    subject,
    { ...data, subject },
    "booking-confirmation",
    data.attachments
  );
};

export const SendMemberAdditionEmail = async (data) => {
  const { email } = data;
  const subject = "Welcome to the Team";
  return sendEmail(
    email,
    subject,
    {
      ...data,
      subject,
    },
    "welcome-member"
  );
};

export const SendGuestAddition = async (data) => {
  const { email } = data;
  const subject = "Most Welcome to the Event";
  return sendEmail(
    email,
    subject,
    {
      ...data,
      subject,
    },
    "welcome-guest"
  );
};

export const SendPasswordChangedEmail = async (data) => {
  const { email } = data;
  const subject = "Password Changed Successfully!";
  return sendEmail(
    email,
    subject,
    {
      subject,
    },
    "password-changed"
  );
};
