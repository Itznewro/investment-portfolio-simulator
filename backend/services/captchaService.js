const axios = require("axios");

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const isCaptchaEnabled = () => {
  return process.env.RECAPTCHA_ENABLED === "true";
};

const verifyCaptcha = async (captchaToken, remoteIp) => {
  // If RECAPTCHA_ENABLED is not exactly "true", skip CAPTCHA completely
  if (!isCaptchaEnabled()) {
    return { ok: true };
  }

  if (!captchaToken) {
    return { ok: false, message: "Please complete the CAPTCHA challenge." };
  }

  if (!process.env.RECAPTCHA_SECRET_KEY) {
    return {
      ok: false,
      message: "CAPTCHA is not configured on the server.",
    };
  }

  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: captchaToken,
    });

    if (remoteIp) {
      params.append("remoteip", remoteIp);
    }

    const { data } = await axios.post(RECAPTCHA_VERIFY_URL, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 8000,
    });

    if (!data?.success) {
      console.log("reCAPTCHA failed:", data);
      return { ok: false, message: "CAPTCHA verification failed." };
    }

    return { ok: true };
  } catch (error) {
    console.error("CAPTCHA verification error:", error.message);
    return {
      ok: false,
      message: "Could not verify CAPTCHA. Please try again.",
    };
  }
};

module.exports = {
  verifyCaptcha,
  isCaptchaEnabled,
};