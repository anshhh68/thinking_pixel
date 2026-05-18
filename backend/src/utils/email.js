const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "false" ? false : true, // Use true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an invite email to a new team member.
 * Best-effort — logs errors but does not throw.
 */
async function sendInviteEmail({ to, inviterName, role, inviteUrl, expiresIn }) {
  const rolePretty = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const exp = expiresIn || "72 hours";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0E0E10;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
      <div style="width:36px;height:36px;border-radius:9px;background:#7C7FF5;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9"/>
          <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white"/>
          <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5"/>
        </svg>
      </div>
      <span style="font-size:16px;font-weight:700;color:#FAFAFA;">thinking pixel</span>
    </div>

    <!-- Card -->
    <div style="background:#18181B;border:1px solid #27272A;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="font-size:22px;font-weight:700;color:#FAFAFA;margin:0 0 8px;">You're invited!</h1>
      <p style="font-size:14px;color:#A1A1AA;margin:0 0 24px;line-height:1.6;">
        <strong style="color:#FAFAFA;">${inviterName}</strong> has invited you to join
        <strong style="color:#FAFAFA;">Thinking Pixel IMS</strong> as:
      </p>

      <!-- Role badge -->
      <div style="display:inline-block;background:#7C7FF520;border:1px solid #7C7FF540;border-radius:8px;padding:8px 16px;margin-bottom:28px;">
        <span style="font-size:13px;font-weight:600;color:#7C7FF5;letter-spacing:0.03em;">${rolePretty}</span>
      </div>

      <!-- CTA -->
      <div style="margin-bottom:20px;">
        <a href="${inviteUrl}"
           style="display:block;text-align:center;background:#7C7FF5;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;padding:14px 24px;">
          Accept Invitation &amp; Create Account
        </a>
      </div>

      <!-- Fallback link -->
      <div style="margin-bottom:0;">
        <p style="font-size:12px;color:#52525B;margin:0 0 6px;">Or copy this link into your browser:</p>
        <p style="font-size:12px;color:#A1A1AA;word-break:break-all;margin:0;background:#0E0E10;border-radius:6px;padding:10px 12px;">
          ${inviteUrl}
        </p>
      </div>
    </div>

    <!-- Expiry notice -->
    <p style="font-size:12px;color:#52525B;text-align:center;margin:0 0 8px;">
      ⏳ This invitation expires in <strong style="color:#A1A1AA;">${exp}</strong>
    </p>
    <p style="font-size:11px;color:#3F3F46;text-align:center;margin:0;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>

  </div>
</body>
</html>`.trim();

  const text = [
    `You're invited to join Thinking Pixel IMS!`,
    ``,
    `${inviterName} has invited you as ${rolePretty}.`,
    ``,
    `Accept your invitation here: ${inviteUrl}`,
    ``,
    `This link expires in ${exp}.`,
    `If you didn't expect this, ignore this email.`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: `"Thinking Pixel IMS" <${process.env.SMTP_USER || "noreply@thinkingpixel.com"}>`,
      to,
      subject: `You're invited to Thinking Pixel IMS — ${rolePretty}`,
      text,
      html,
    });
    console.log(`Invite email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`Failed to send invite email to ${to}:`, err.message);
    return false;
  }
}

module.exports = { sendInviteEmail };
