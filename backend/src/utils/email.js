const nodemailer = require('nodemailer');

// In-memory OTP store: { email -> { otp, expiresAt, verified } }
const otpStore = new Map();

const createTransporter = () => {
  // Use Gmail SMTP (works with App Password)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Gmail App Password
      }
    });
  }
  // Fallback: Ethereal (dev/testing — logs URL to console)
  return null;
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (email, name) => {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

  otpStore.set(email.toLowerCase(), { otp, expiresAt, verified: false });

  const transporter = createTransporter();

  if (!transporter) {
    // Dev mode: create ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    const devTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const info = await devTransporter.sendMail({
      from: '"PeersQ" <no-reply@peersq.app>',
      to: email,
      subject: `${otp} — Your PeersQ verification code`,
      html: buildEmailHTML(name, otp)
    });

    console.log('📧 Dev OTP email preview:', nodemailer.getTestMessageUrl(info));
    console.log(`🔐 OTP for ${email}: ${otp}`); // visible in Render logs for testing
    return { success: true, preview: nodemailer.getTestMessageUrl(info) };
  }

  await transporter.sendMail({
    from: `"PeersQ" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${otp} — Your PeersQ verification code`,
    html: buildEmailHTML(name, otp)
  });

  return { success: true };
};

const verifyOTP = (email, otp) => {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return { valid: false, reason: 'No OTP sent to this email' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, reason: 'OTP expired. Please request a new one.' };
  }
  if (record.otp !== otp) return { valid: false, reason: 'Incorrect OTP' };

  // Mark verified
  otpStore.set(email.toLowerCase(), { ...record, verified: true });
  return { valid: true };
};

const isVerified = (email) => {
  const record = otpStore.get(email.toLowerCase());
  return record?.verified === true;
};

const clearOTP = (email) => {
  otpStore.delete(email.toLowerCase());
};

const buildEmailHTML = (name, otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,87,255,0.1);">
    <div style="background:linear-gradient(135deg,#0057FF,#003ABF);padding:40px;text-align:center;">
      <div style="width:50px;height:50px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:28px;">⚡</span>
      </div>
      <h1 style="color:white;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">PeersQ</h1>
      <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:15px;">Verify your email address</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#0A0F1E;font-size:17px;margin:0 0 8px;">Hi ${name || 'there'} 👋</p>
      <p style="color:#64748B;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Use the code below to verify your email and start hosting live quizzes. This code expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#F4F6FB;border-radius:16px;padding:32px;text-align:center;border:2px dashed rgba(0,87,255,0.15);margin-bottom:32px;">
        <p style="color:#64748B;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;">Your verification code</p>
        <div style="font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:700;color:#0057FF;letter-spacing:12px;">${otp}</div>
      </div>
      <p style="color:#94A3B8;font-size:13px;text-align:center;margin:0;">
        Didn't request this? You can safely ignore this email.
      </p>
    </div>
    <div style="background:#F4F6FB;padding:20px;text-align:center;">
      <p style="color:#94A3B8;font-size:12px;margin:0;">© 2025 PeersQ — Real-time Quiz Platform</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { sendOTP, verifyOTP, isVerified, clearOTP };
