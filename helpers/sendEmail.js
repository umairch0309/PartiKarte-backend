import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import sgMail from "@sendgrid/mail";
import {
  getBrandLogoCidUrl,
  getBrandLogoInlineAttachment,
} from "./brandAssets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Partikarte <info@partikarte.si>"
  );
}

function serializeEmailError(error) {
  if (error?.response?.body) {
    try {
      return JSON.parse(JSON.stringify(error.response.body));
    } catch {
      return error.response.body;
    }
  }
  if (error?.message) return error.message;
  return String(error);
}

function toResendAttachments(attachments = []) {
  return attachments
    .filter((attachment) => attachment?.filename && attachment?.content)
    .map((attachment) => {
      const content =
        typeof attachment.content === "string"
          ? attachment.content
          : Buffer.from(attachment.content).toString("base64");
      return {
        filename: attachment.filename,
        content,
        contentType:
          attachment.contentType ||
          attachment.type ||
          (attachment.filename?.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : undefined),
        // Resend Node SDK uses contentId for inline CID images only
        ...(attachment.contentId && { contentId: attachment.contentId }),
        ...(attachment.content_id &&
          !attachment.contentId && { contentId: attachment.content_id }),
      };
    });
}

function withInlineLogo(attachments = []) {
  const logo = getBrandLogoInlineAttachment();
  if (!logo) return attachments || [];
  const rest = (attachments || []).filter(
    (a) => a?.contentId !== logo.contentId && a?.content_id !== logo.contentId
  );
  return [logo, ...rest];
}

async function sendWithResend(data) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const payload = {
    from: data.from,
    to: [data.to],
    subject: data.subject,
    html: data.html,
  };

  if (data.attachments?.length) {
    payload.attachments = toResendAttachments(data.attachments);
  }

  const { data: result, error } = await resend.emails.send(payload);
  if (error) {
    const err = new Error(error.message || "Resend failed to send email");
    err.response = { body: error };
    throw err;
  }
  return result;
}

async function sendWithSendGrid(data) {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("EMAIL_API_KEY is not configured");
  }

  sgMail.setApiKey(apiKey);
  return sgMail.send({
    ...data,
    attachments: (data.attachments || []).map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      type: attachment.type || "application/octet-stream",
      disposition: attachment.disposition || "attachment",
      ...(attachment.contentId || attachment.content_id
        ? { content_id: attachment.contentId || attachment.content_id }
        : {}),
    })),
  });
}

const sendEmail = async (
  receiver,
  subject,
  config,
  template,
  attachments = []
) => {
  const from = getFromAddress();

  try {
    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "email_templates", `${template}.ejs`),
      { logoUrl: getBrandLogoCidUrl(), ...config }
    );

    const finalAttachments = withInlineLogo(attachments);
    const data = {
      to: receiver,
      from,
      subject,
      html: emailTemplate,
      attachments: finalAttachments,
    };

    // Prefer Resend (SendGrid account is out of credits).
    let provider = "resend";
    let result;
    if (process.env.RESEND_API_KEY) {
      result = await sendWithResend(data);
    } else if (process.env.EMAIL_API_KEY) {
      provider = "sendgrid";
      result = await sendWithSendGrid(data);
    } else {
      throw new Error(
        "No email provider configured. Set RESEND_API_KEY or EMAIL_API_KEY."
      );
    }

    console.log("email sent", {
      provider,
      to: receiver,
      from,
      subject,
      id: result?.id || null,
      attachments: finalAttachments.map((a) => ({
        filename: a.filename,
        bytes:
          typeof a.content === "string"
            ? Math.round((a.content.length * 3) / 4)
            : a.content?.length || 0,
        inline: Boolean(a.contentId || a.content_id),
      })),
    });
    return { ok: true, result, provider };
  } catch (e) {
    const details = serializeEmailError(e);
    console.error("could not send email", {
      to: receiver,
      from,
      subject,
      details,
    });
    return { ok: false, error: details };
  }
};

function formatOtpExpiry(expiry) {
  const date = expiry ? new Date(expiry) : new Date(Date.now() + 5 * 60 * 1000);
  if (Number.isNaN(date.getTime())) {
    return "5 minutes";
  }
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export const SendOtpEmail = async (data) => {
  const { email, otp, otpExpiry } = data;
  const subject = "Forgot Password - OTP Verification";
  return sendEmail(
    email,
    subject,
    {
      otp,
      subject,
      otpExpiryFormatted: formatOtpExpiry(otpExpiry),
    },
    "forgot-password"
  );
};

export const SendVerifyOtpEmail = async (data) => {
  const { email, otp, otpExpiry } = data;
  const subject = "Welcome - Email Verification.";
  return sendEmail(
    email,
    subject,
    {
      otp,
      subject,
      otpExpiryFormatted: formatOtpExpiry(otpExpiry),
    },
    "verify-email"
  );
};

export const SendContactUsEmail = async (data) => {
  const subject = "Contact Us Email";
  return sendEmail(
    process.env.CONTACT_TO_EMAIL ||
      process.env.EMAIL_FROM ||
      "info@partikarte.si",
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
