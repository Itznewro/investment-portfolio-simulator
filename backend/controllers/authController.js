const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { verifyCaptcha } = require("../services/captchaService");
const {
  createAndSendOtp,
  isValidOtpPurpose,
  normalizeEmail,
  verifyOtp,
} = require("../services/otpService");
const { generateMfaSetup, verifyTotpCode } = require("../services/mfaService");

const PASSWORD_MIN_LENGTH = 6;
const FORGOT_PASSWORD_RESPONSE =
  "If an account exists, a reset code has been sent.";

const EMAIL_OTP_TRUST_COOKIE = "ips_email_otp_trust";
const EMAIL_OTP_TRUST_HOURS = 12;

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (!rawName) return cookies;

    cookies[rawName] = decodeURIComponent(rawValueParts.join("=") || "");
    return cookies;
  }, {});
};

const getTrustedDeviceCookie = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[EMAIL_OTP_TRUST_COOKIE] || "";
};

const hashTrustedDeviceToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createTrustedEmailOtpDevice = async (req, res, userId) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashTrustedDeviceToken(rawToken);

  await pool.query(
    `INSERT INTO trusted_email_otp_devices
     (user_id, device_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval)
     ON CONFLICT (device_token_hash)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       user_agent = EXCLUDED.user_agent,
       ip_address = EXCLUDED.ip_address,
       expires_at = EXCLUDED.expires_at,
       last_used_at = NOW()`,
    [
      userId,
      tokenHash,
      req.headers["user-agent"] || null,
      req.ip || null,
      EMAIL_OTP_TRUST_HOURS,
    ]
  );

  res.cookie(EMAIL_OTP_TRUST_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EMAIL_OTP_TRUST_HOURS * 60 * 60 * 1000,
    path: "/",
  });
};

const isTrustedEmailOtpDevice = async (req, userId) => {
  const rawToken = getTrustedDeviceCookie(req);

  if (!rawToken) {
    return false;
  }

  const tokenHash = hashTrustedDeviceToken(rawToken);

  const result = await pool.query(
    `UPDATE trusted_email_otp_devices
     SET last_used_at = NOW()
     WHERE user_id = $1
       AND device_token_hash = $2
       AND expires_at > NOW()
     RETURNING id`,
    [userId, tokenHash]
  );

  return result.rows.length > 0;
};

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  emailVerified: Boolean(user.email_verified),
  mfaEnabled: Boolean(user.mfa_enabled),
});

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_verified),
      mfaEnabled: Boolean(user.mfa_enabled),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

const signChallengeToken = (user, stage, expiresIn = "10m") =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "auth_challenge",
      stage,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );

const verifyChallengeToken = (challengeToken, expectedStage) => {
  if (!challengeToken) {
    return null;
  }

  try {
    const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);

    if (
      decoded?.type !== "auth_challenge" ||
      decoded?.stage !== expectedStage ||
      !decoded?.id
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

const getUserByEmail = async (email) => {
  const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);

  return userResult.rows[0] || null;
};

const getUserById = async (id) => {
  const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return userResult.rows[0] || null;
};

const ensurePortfolioExists = async (userId) => {
  const existingPortfolio = await pool.query(
    "SELECT id FROM portfolios WHERE user_id = $1 LIMIT 1",
    [userId]
  );

  if (existingPortfolio.rows.length === 0) {
    await pool.query(
      "INSERT INTO portfolios (user_id, cash_balance) VALUES ($1, $2)",
      [userId, 100000.0]
    );
  }
};

const completeLogin = (res, user, message = "Login successful") => {
  const token = signAccessToken(user);

  return res.status(200).json({
    message,
    token,
    user: sanitizeUser(user),
  });
};

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, captchaToken } = req.body;
    const cleanEmail = normalizeEmail(email || "");
    const cleanFullName = String(fullName || "").trim();

    if (!cleanFullName || !cleanEmail || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      });
    }

    const captchaResult = await verifyCaptcha(captchaToken, req.ip);

    if (!captchaResult.ok) {
      return res.status(400).json({ message: captchaResult.message });
    }

    const existingUser = await getUserByEmail(cleanEmail);

    if (existingUser?.email_verified) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;

    if (existingUser) {
      const updatedUserResult = await pool.query(
        `UPDATE users
         SET full_name = $1,
             password_hash = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [cleanFullName, hashedPassword, existingUser.id]
      );

      user = updatedUserResult.rows[0];
    } else {
      const newUserResult = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, email_verified, mfa_enabled)
         VALUES ($1, $2, $3, false, false)
         RETURNING *`,
        [cleanFullName, cleanEmail, hashedPassword]
      );

      user = newUserResult.rows[0];
    }

    await ensurePortfolioExists(user.id);

    await createAndSendOtp({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      purpose: "register",
    });

    res.status(201).json({
      message: "Account created. Check your email for the verification code.",
      email: user.email,
      otpRequired: true,
      purpose: "register",
      challengeToken: signChallengeToken(user, "register_pending", "15m"),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    const cleanEmail = normalizeEmail(email || "");

    if (!cleanEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const captchaResult = await verifyCaptcha(captchaToken, req.ip);

    if (!captchaResult.ok) {
      return res.status(400).json({ message: captchaResult.message });
    }

    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (!user.email_verified) {
      await createAndSendOtp({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        purpose: "register",
      });

      return res.status(200).json({
        message:
          "Please verify your email before signing in. We sent a new code.",
        email: user.email,
        otpRequired: true,
        emailVerificationRequired: true,
        purpose: "register",
        challengeToken: signChallengeToken(user, "register_pending", "15m"),
      });
    }

    const trustedEmailOtpDevice = await isTrustedEmailOtpDevice(req, user.id);

    if (trustedEmailOtpDevice) {
      if (user.mfa_enabled) {
        return res.status(200).json({
          message: "Trusted device recognized. Enter your authenticator code.",
          email: user.email,
          otpRequired: false,
          emailOtpSkipped: true,
          mfaRequired: true,
          mfaToken: signChallengeToken(user, "otp_verified", "5m"),
        });
      }

      return completeLogin(res, user, "Login successful.");
    }

    await createAndSendOtp({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      purpose: "login",
    });

    return res.status(200).json({
      message: "Verification code sent to your email.",
      email: user.email,
      otpRequired: true,
      purpose: "login",
      mfaRequired: Boolean(user.mfa_enabled),
      challengeToken: signChallengeToken(user, "password_verified"),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = normalizeEmail(email || "");

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const user = await getUserByEmail(cleanEmail);

      if (user) {
        await createAndSendOtp({
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          purpose: "reset_password",
        });
      }
    }

    return res.status(200).json({ message: FORGOT_PASSWORD_RESPONSE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(200).json({ message: FORGOT_PASSWORD_RESPONSE });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const newPassword = req.body.newPassword || req.body.password;
    const cleanEmail = normalizeEmail(email || "");

    if (!cleanEmail || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, verification code, and new password are required.",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res
        .status(400)
        .json({ message: "Enter the 6-digit verification code." });
    }

    if (String(newPassword).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      });
    }

    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code." });
    }

    const otpResult = await verifyOtp({
      userId: user.id,
      purpose: "reset_password",
      otp,
    });

    if (!otpResult.ok) {
      return res.status(400).json({ message: otpResult.message });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    return res.status(200).json({
      message: "Password reset successful. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Could not reset password." });
  }
};

const sendEmailOtp = async (req, res) => {
  try {
    const { email, purpose, captchaToken, challengeToken } = req.body;

    if (!isValidOtpPurpose(purpose)) {
      return res.status(400).json({ message: "Invalid verification purpose." });
    }

    if (purpose === "reset_password") {
      const user = await getUserByEmail(email || "");

      try {
        if (user) {
          await createAndSendOtp({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            purpose: "reset_password",
          });
        }
      } catch (error) {
        console.error("Send reset password OTP error:", error);
      }

      return res.status(200).json({ message: FORGOT_PASSWORD_RESPONSE });
    }

    let user = null;

    if (purpose === "login") {
      const decoded = verifyChallengeToken(challengeToken, "password_verified");

      if (!decoded) {
        return res
          .status(401)
          .json({ message: "Login challenge expired. Please sign in again." });
      }

      user = await getUserById(decoded.id);
    } else {
      const decoded = verifyChallengeToken(challengeToken, "register_pending");

      if (decoded) {
        user = await getUserById(decoded.id);
      } else {
        const captchaResult = await verifyCaptcha(captchaToken, req.ip);

        if (!captchaResult.ok) {
          return res.status(400).json({ message: captchaResult.message });
        }

        user = await getUserByEmail(email || "");
      }
    }

    if (!user || (purpose === "register" && user.email_verified)) {
      return res
        .status(400)
        .json({ message: "Unable to send verification code." });
    }

    await createAndSendOtp({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      purpose,
    });

    res.status(200).json({
      message: "Verification code sent.",
      email: user.email,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ message: "Could not send verification code." });
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp, purpose, challengeToken } = req.body;

    if (!isValidOtpPurpose(purpose)) {
      return res.status(400).json({ message: "Invalid verification purpose." });
    }

    if (purpose === "reset_password") {
      return res
        .status(400)
        .json({ message: "Use the password reset form to verify this code." });
    }

    if (purpose === "login") {
      const decoded = verifyChallengeToken(challengeToken, "password_verified");

      if (!decoded) {
        return res
          .status(401)
          .json({ message: "Login challenge expired. Please sign in again." });
      }

      const user = await getUserById(decoded.id);

      if (!user || !user.email_verified) {
        return res
          .status(401)
          .json({ message: "Login challenge is no longer valid." });
      }

      const otpResult = await verifyOtp({
        userId: user.id,
        purpose: "login",
        otp,
      });

      if (!otpResult.ok) {
        return res.status(400).json({ message: otpResult.message });
      }

      await createTrustedEmailOtpDevice(req, res, user.id);

      if (user.mfa_enabled) {
        return res.status(200).json({
          message: "Email code verified. Enter your authenticator code.",
          mfaRequired: true,
          mfaToken: signChallengeToken(user, "otp_verified", "5m"),
        });
      }

      return completeLogin(res, user);
    }

    const decoded = verifyChallengeToken(challengeToken, "register_pending");
    const user = decoded
      ? await getUserById(decoded.id)
      : await getUserByEmail(email || "");

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code." });
    }

    const otpResult = await verifyOtp({
      userId: user.id,
      purpose: "register",
      otp,
    });

    if (!otpResult.ok) {
      return res.status(400).json({ message: otpResult.message });
    }

    const verifiedUserResult = await pool.query(
      `UPDATE users
       SET email_verified = true,
           email_verified_at = COALESCE(email_verified_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id]
    );

    await ensurePortfolioExists(user.id);
    await createTrustedEmailOtpDevice(req, res, user.id);

    res.status(200).json({
      message: "Email verified successfully. You can now sign in.",
      user: sanitizeUser(verifiedUserResult.rows[0]),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Could not verify code." });
  }
};

const getMfaStatus = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      emailVerified: Boolean(user.email_verified),
      mfaEnabled: Boolean(user.mfa_enabled),
    });
  } catch (error) {
    console.error("MFA status error:", error);
    res.status(500).json({ message: "Could not load MFA status." });
  }
};

const generateMfaSetupQr = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.email_verified) {
      return res
        .status(403)
        .json({ message: "Verify your email before enabling MFA." });
    }

    if (user.mfa_enabled) {
      return res.status(200).json({
        message: "Authenticator app MFA is already enabled.",
        mfaEnabled: true,
      });
    }

    const setup = await generateMfaSetup({ email: user.email });

    await pool.query(
      `UPDATE users
       SET mfa_pending_secret = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [setup.encryptedSecret, user.id]
    );

    res.status(200).json({
      message: "Scan this QR code with your authenticator app.",
      qrCodeDataUrl: setup.qrCodeDataUrl,
      mfaEnabled: false,
    });
  } catch (error) {
    console.error("Generate MFA setup error:", error);
    res.status(500).json({ message: "Could not generate MFA setup." });
  }
};

const verifyAndEnableMfa = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.mfa_pending_secret) {
      return res
        .status(400)
        .json({ message: "Start MFA setup before verifying a code." });
    }

    const isValidCode = verifyTotpCode({
      encryptedSecret: user.mfa_pending_secret,
      code,
    });

    if (!isValidCode) {
      return res.status(400).json({ message: "Invalid authenticator code." });
    }

    const updatedUserResult = await pool.query(
      `UPDATE users
       SET mfa_enabled = true,
           mfa_secret = mfa_pending_secret,
           mfa_pending_secret = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id]
    );

    res.status(200).json({
      message: "Authenticator app MFA enabled.",
      user: sanitizeUser(updatedUserResult.rows[0]),
    });
  } catch (error) {
    console.error("Verify MFA setup error:", error);
    res.status(500).json({ message: "Could not enable MFA." });
  }
};

const verifyMfaDuringLogin = async (req, res) => {
  try {
    const { mfaToken, code } = req.body;
    const decoded = verifyChallengeToken(mfaToken, "otp_verified");

    if (!decoded) {
      return res
        .status(401)
        .json({ message: "MFA challenge expired. Please sign in again." });
    }

    const user = await getUserById(decoded.id);

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return res
        .status(401)
        .json({ message: "MFA challenge is no longer valid." });
    }

    const isValidCode = verifyTotpCode({
      encryptedSecret: user.mfa_secret,
      code,
    });

    if (!isValidCode) {
      return res.status(400).json({ message: "Invalid authenticator code." });
    }

    return completeLogin(res, user);
  } catch (error) {
    console.error("Verify MFA login error:", error);
    res.status(500).json({ message: "Could not verify MFA code." });
  }
};

const logoutUser = async (req, res) => {
  res.status(200).json({
    message: "Logout successful.",
  });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  getMfaStatus,
  generateMfaSetupQr,
  verifyAndEnableMfa,
  verifyMfaDuringLogin,
};
