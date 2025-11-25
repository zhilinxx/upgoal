import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: "UpGoal <upgoals@upgoalsupport.xyz>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Send Email Error:", err);
    throw err;
  }
};
