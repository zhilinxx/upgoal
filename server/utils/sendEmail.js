import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM, // 👈 this gives you "UpGoal Support <yourgmail@gmail.com>"
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};
