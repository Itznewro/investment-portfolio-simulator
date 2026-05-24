const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
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
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.get("/mfa/status", protect, getMfaStatus);
router.get("/mfa/setup", protect, generateMfaSetupQr);
router.post("/mfa/setup/verify", protect, verifyAndEnableMfa);
router.post("/mfa/login/verify", verifyMfaDuringLogin);

module.exports = router;
