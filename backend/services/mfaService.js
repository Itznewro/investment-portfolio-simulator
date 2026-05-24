const crypto = require("crypto");
const qrcode = require("qrcode");
const speakeasy = require("speakeasy");

const MFA_ISSUER = "IPSimulator";

const getEncryptionKey = () => {
  const keyMaterial = process.env.MFA_SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!keyMaterial) {
    throw new Error("MFA_SECRET_ENCRYPTION_KEY or JWT_SECRET must be configured.");
  }

  return crypto.createHash("sha256").update(keyMaterial).digest();
};

const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

const decryptSecret = (encryptedSecret) => {
  if (!encryptedSecret) {
    throw new Error("MFA secret is missing.");
  }

  const parts = encryptedSecret.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("MFA secret format is invalid.");
  }

  const [, ivValue, tagValue, encryptedValue] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64")
  );

  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const generateMfaSetup = async ({ email }) => {
  const secret = speakeasy.generateSecret({
    issuer: MFA_ISSUER,
    name: `${MFA_ISSUER}:${email}`,
    length: 20,
  });

  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: `${MFA_ISSUER}:${email}`,
    issuer: MFA_ISSUER,
    encoding: "base32",
  });

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });

  return {
    encryptedSecret: encryptSecret(secret.base32),
    qrCodeDataUrl,
  };
};

const verifyTotpCode = ({ encryptedSecret, code }) => {
  if (!/^\d{6}$/.test(String(code || ""))) {
    return false;
  }

  const secret = decryptSecret(encryptedSecret);

  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(code),
    window: 1,
  });
};

module.exports = {
  generateMfaSetup,
  verifyTotpCode,
};
