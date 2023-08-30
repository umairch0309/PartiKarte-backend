import ejs from "ejs";
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.EMAIL_API_KEY);

const sendEmail = async (receiver, subject, config, template) => {
  const emailTemplate = await ejs.renderFile(
    __dirname + `/email_templates/${template}.ejs`,
    { ...config }
  );

  const data = {
    to: receiver,
    from: process.env.EMAIL_FROM,
    subject: subject,
    html: emailTemplate,
  };

  const result = await sgMail
    .send(data)
    .then((res) => {
      console.log("Email Sent");
      return res;
    })
    .catch((err) => {
      console.log("Couldn't send email", err);
      return err;
    });

  return result;
};

const SEND_SIGNUP_EMAIL = async (data) => {};
