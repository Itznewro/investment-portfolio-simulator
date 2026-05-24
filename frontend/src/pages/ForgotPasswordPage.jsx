import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [stage, setStage] = useState("request");
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleOtpChange = (event) => {
    setFormData({
      ...formData,
      otp: event.target.value.replace(/\D/g, "").slice(0, 6),
    });
  };

  const handleSendCode = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.email) {
      setError("Enter your email address.");
      return;
    }

    try {
      setIsSendingCode(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not send reset code.");
        return;
      }

      setMessage(
        data.message || "If an account exists, a reset code has been sent."
      );
      setStage("reset");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.email) {
      setError("Reset session missing. Please request a new code.");
      setStage("request");
      return;
    }

    if (!/^\d{6}$/.test(formData.otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsResetting(true);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not reset password.");
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          message: data.message || "Password reset successful. You can now sign in.",
        },
      });
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="login-page-shell auth-step-shell">
      <div className="login-bg-glow login-bg-glow-one"></div>
      <div className="login-bg-glow login-bg-glow-two"></div>

      <section className="login-left-panel">
        <Link to="/" className="login-brand">
          <img src={logo} alt="IPSimulator logo" />
          <span>IPSimulator</span>
        </Link>

        <div className="login-hero-copy">
          <h1>Recover your account without weakening your security.</h1>
          <p>
            Reset your password with a short-lived email code before returning
            to the normal sign-in flow.
          </p>
        </div>
      </section>

      <section className="login-card-section">
        <div className="login-card auth-step-card forgot-password-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              <KeyRound size={22} />
            </div>

            <div>
              <h1>{stage === "request" ? "Forgot password" : "Reset password"}</h1>
              <p>
                {stage === "request"
                  ? "Enter your account email to receive a reset code."
                  : `Code sent to ${formData.email}`}
              </p>
            </div>
          </div>

          {stage === "request" ? (
            <form className="login-form" onSubmit={handleSendCode}>
              <div className="login-field">
                <label>Email Address</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={18} />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}
              {message && <p className="login-success">{message}</p>}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isSendingCode}
              >
                {isSendingCode ? "Sending..." : "Send reset code"}
                {!isSendingCode && <ArrowRight size={18} />}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="login-field">
                <label>Verification Code</label>
                <div className="login-input-wrap otp-input-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={formData.otp}
                    onChange={handleOtpChange}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>New Password</label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={18} />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="Create a new password"
                    value={formData.newPassword}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label>Confirm New Password</label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <p className="auth-step-note">
                This code expires after 10 minutes and can only be used once.
              </p>

              {error && <p className="login-error">{error}</p>}
              {message && <p className="login-success">{message}</p>}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Reset Password"}
                {!isResetting && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {stage === "reset" && (
            <button
              type="button"
              className="auth-secondary-btn"
              onClick={() => {
                setStage("request");
                setError("");
                setMessage("");
              }}
              disabled={isResetting}
            >
              <Mail size={16} />
              Use a different email
            </button>
          )}

          <div className="login-divider-new">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <p className="login-register-text">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>

          <div className="login-trust-row single-trust">
            <div>
              <ShieldCheck size={17} />
              <span>Email code required</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
