const nodemailer = require("nodemailer");
const path = require("path");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatOtpCode = (otpCode) => String(otpCode).replace(/\D/g, "");

const getTransporter = () => {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is not configured.");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const auth =
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth,
  });
};

const getOtpEmailContent = (purpose) => {
  if (purpose === "reset_password") {
    return {
      subject: "Reset your IPSimulator password",
      title: "Reset your password",
      intro:
        "use this one-time code to reset your IPSimulator password.",
      label: "Reset Code",
      reason:
        "You&rsquo;re receiving this email because a password reset code was requested for your IPSimulator account.",
      textReason:
        "You're receiving this email because a password reset code was requested for your IPSimulator account.",
    };
  }

  if (purpose === "login") {
    return {
      subject: "Your IPSimulator login code",
      title: "Verify your identity",
      intro:
        "use this one-time code to continue signing in to your IPSimulator account.",
      label: "Verification Code",
      reason:
        "You&rsquo;re receiving this email because a login verification code was requested for your IPSimulator account.",
      textReason:
        "You're receiving this email because a login verification code was requested for your IPSimulator account.",
    };
  }

  return {
    subject: "Verify your IPSimulator account",
    title: "Verify your email",
    intro:
      "use this one-time code to verify your IPSimulator account.",
    label: "Verification Code",
    reason:
      "You&rsquo;re receiving this email because a verification code was requested for your IPSimulator account.",
    textReason:
      "You're receiving this email because a verification code was requested for your IPSimulator account.",
  };
};

const buildOtpEmailHtml = ({ fullName, otpCode, purpose }) => {
  const safeName = escapeHtml(fullName || "there");
  const code = escapeHtml(formatOtpCode(otpCode));
  const content = getOtpEmailContent(purpose);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>IPSimulator verification code</title>
  </head>

  <body bgcolor="#050505" style="margin:0;padding:0;background-color:#050505;color:#ffffff;font-family:Arial,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050505" style="width:100%;background-color:#050505;margin:0;padding:0;">
      <tr>
        <td align="center" bgcolor="#050505" style="padding:42px 18px;background-color:#050505;">
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b0b0f" style="width:100%;max-width:620px;background-color:#0b0b0f;border:1px solid #2c2342;border-radius:22px;overflow:hidden;">
            
            <tr>
              <td bgcolor="#0b0b0f" style="padding:42px 34px 22px 34px;text-align:center;background-color:#0b0b0f;">
                <img
                  src="cid:ipsimulator-logo"
                  alt="IPSimulator"
                  width="58"
                  height="58"
                  style="display:inline-block;width:58px;height:58px;object-fit:contain;border-radius:18px;margin-bottom:16px;background-color:#11111a;"
                />

                <div style="font-size:21px;font-weight:900;color:#ffffff;">
                  IPSimulator
                </div>
              </td>
            </tr>

            <tr>
              <td bgcolor="#0b0b0f" style="padding:12px 36px 0 36px;text-align:center;background-color:#0b0b0f;">
                <h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.18;font-weight:900;letter-spacing:-0.4px;">
                  ${content.title}
                </h1>

                <p style="margin:16px 0 0 0;color:#b6b6c6;font-size:16px;line-height:1.65;">
                  Hi ${safeName}, ${content.intro}
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#0b0b0f" style="padding:36px 36px 0 36px;background-color:#0b0b0f;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#11111a" style="width:100%;background-color:#11111a;border:1px solid #3a2b57;border-radius:18px;">
                  <tr>
                    <td bgcolor="#11111a" style="padding:34px 16px;text-align:center;background-color:#11111a;">
                      <div style="color:#9b95ad;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:18px;">
                        ${content.label}
                      </div>

                      <div style="font-family:'Courier New',Courier,monospace;font-size:38px;line-height:1.1;font-weight:900;letter-spacing:5px;color:#ffffff;margin:0 auto;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;">
                        ${code}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td bgcolor="#0b0b0f" style="padding:34px 36px 0 36px;background-color:#0b0b0f;">
                <p style="margin:0;color:#ffffff;font-size:16px;line-height:1.7;">
                  This code is valid for <strong style="color:#ffffff;">10 minutes</strong> and can only be used once.
                </p>

                <p style="margin:18px 0 0 0;color:#ffffff;font-size:16px;line-height:1.7;">
                  <strong style="color:#ffffff;">Do not share this code with anyone.</strong>
                  IPSimulator will never ask for this code by phone or email.
                </p>
              </td>
            </tr>

            <tr>
              <td bgcolor="#0b0b0f" style="padding:34px 36px 42px 36px;background-color:#0b0b0f;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#11111a" style="width:100%;background-color:#11111a;border-left:4px solid #6741BF;border-radius:14px;">
                  <tr>
                    <td bgcolor="#11111a" style="padding:18px 20px;color:#b6b6c6;font-size:14px;line-height:1.65;background-color:#11111a;">
                      ${content.reason}
                      If this wasn&rsquo;t you, you can ignore this email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050505" style="width:100%;max-width:620px;background-color:#050505;">
            <tr>
              <td bgcolor="#050505" style="padding:20px 12px 0 12px;text-align:center;color:#777784;font-size:12px;line-height:1.6;background-color:#050505;">
                IPSimulator account security
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildOtpEmailText = ({ fullName, otpCode, purpose }) => {
  const name = fullName || "there";
  const code = formatOtpCode(otpCode);
  const content = getOtpEmailContent(purpose);

  return [
    "IPSimulator",
    "",
    content.title,
    "",
    `Hi ${name}, ${content.intro}`,
    "",
    code,
    "",
    "This code is valid for 10 minutes and can only be used once.",
    "Do not share this code with anyone. IPSimulator will never ask for this code by phone or email.",
    "",
    `${content.textReason} If this wasn't you, you can ignore this email.`,
  ].join("\n");
};

const sendOtpEmail = async (email, fullName, otpCode, purpose) => {
  const transporter = getTransporter();
  const content = getOtpEmailContent(purpose);

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      `"IPSimulator" <${process.env.SMTP_USER || "no-reply@ipsimulator.local"}>`,
    to: email,
    subject: content.subject,
    html: buildOtpEmailHtml({ fullName, otpCode, purpose }),
    text: buildOtpEmailText({ fullName, otpCode, purpose }),
    attachments: [
      {
        filename: "logo.png",
        path: path.join(__dirname, "../../frontend/src/assets/logo.png"),
        cid: "ipsimulator-logo",
      },
    ],
  });
};

module.exports = {
  sendOtpEmail,
};
