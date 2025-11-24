import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,   // supports HTML or plain text
    });

    console.log("Email sent to:", to);
  } catch (error) {
    console.error("Email send failed:", error);
    throw error;
  }
};
