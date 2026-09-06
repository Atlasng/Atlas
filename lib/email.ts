import nodemailer from "nodemailer";

// Reuses the same Gmail account concept as your Supabase Auth SMTP setup,
// but this is a separate credential path: Supabase's own SMTP settings
// only send Supabase's own auth emails (OTP, password reset). This sends
// arbitrary app emails (like expiry reminders) directly from your server.
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set to send app emails."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `Atlas <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
