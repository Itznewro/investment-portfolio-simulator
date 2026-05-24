const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../db");
const { sendOtpEmail } = require("./emailService");

const OTP_EXPIRY_MINUTES = 10;
const OTP_PURPOSES = new Set(["register", "login", "reset_password"]);

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const isValidOtpPurpose = (purpose) => OTP_PURPOSES.has(purpose);

const generateOtpCode = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const createAndSendOtp = async ({ userId, email, fullName, purpose }) => {
  if (!userId || !email || !isValidOtpPurpose(purpose)) {
    throw new Error("Invalid OTP request.");
  }

  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE otp_codes
       SET used_at = COALESCE(used_at, NOW()), updated_at = NOW()
       WHERE user_id = $1
         AND purpose = $2
         AND used_at IS NULL`,
      [userId, purpose]
    );

    await client.query(
      `INSERT INTO otp_codes (user_id, email, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval)`,
      [userId, normalizeEmail(email), otpHash, purpose, OTP_EXPIRY_MINUTES]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await sendOtpEmail(email, fullName, otpCode, purpose);
};

const verifyOtp = async ({ userId, purpose, otp }) => {
  if (!userId || !isValidOtpPurpose(purpose) || !/^\d{6}$/.test(String(otp || ""))) {
    return { ok: false, message: "Invalid or expired verification code." };
  }

  const result = await pool.query(
    `SELECT id, otp_hash
     FROM otp_codes
     WHERE user_id = $1
       AND purpose = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId, purpose]
  );

  for (const otpRecord of result.rows) {
    const isMatch = await bcrypt.compare(String(otp), otpRecord.otp_hash);

    if (isMatch) {
      const usedResult = await pool.query(
        `UPDATE otp_codes
         SET used_at = NOW(), updated_at = NOW()
         WHERE id = $1
           AND used_at IS NULL
         RETURNING id`,
        [otpRecord.id]
      );

      if (usedResult.rows.length === 0) {
        return { ok: false, message: "Verification code has already been used." };
      }

      return { ok: true };
    }
  }

  return { ok: false, message: "Invalid or expired verification code." };
};

module.exports = {
  createAndSendOtp,
  isValidOtpPurpose,
  normalizeEmail,
  verifyOtp,
};
