import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowRight, MailCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

const readStoredOtpState = () => {
  try {
    return JSON.parse(sessionStorage.getItem("pendingOtp") || "{}");
  } catch {
    return {};
  }
};

function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storedState = useMemo(() => readStoredOtpState(), []);

  const email =
    location.state?.email || storedState.email || searchParams.get("email") || "";
  const purpose =
    location.state?.purpose || storedState.purpose || searchParams.get("purpose") || "login";
  const challengeToken =
    location.state?.challengeToken || storedState.challengeToken || "";
  const fromPath = location.state?.fromPath || storedState.fromPath || "/dashboard";
  const isLoginOtp = purpose === "login";

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleOtpChange = (event) => {
    const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(nextValue);
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Verification session missing. Please start again.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          purpose,
          challengeToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Verification failed.");
        return;
      }

      if (isLoginOtp && data.mfaRequired) {
        const mfaState = {
          email,
          mfaToken: data.mfaToken,
          fromPath,
        };

        sessionStorage.removeItem("pendingOtp");
        sessionStorage.setItem("pendingMfa", JSON.stringify(mfaState));
        navigate("/verify-mfa", { state: mfaState });
        return;
      }

      if (isLoginOtp && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        sessionStorage.removeItem("pendingOtp");
        navigate(fromPath, { replace: true });
        return;
      }

      sessionStorage.removeItem("pendingOtp");
      setMessage(data.message || "Email verified. Redirecting to login...");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1100);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Verification session missing. Please start again.");
      return;
    }

    try {
      setIsResending(true);

      const response = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          purpose,
          challengeToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not resend code.");
        return;
      }

      setMessage(data.message || "Verification code sent.");
      setOtp("");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsResending(false);
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
          <h1>One more secure step before your portfolio opens.</h1>
          <p>
            We sent a short-lived verification code to protect your simulator
            account before issuing a session token.
          </p>
        </div>
      </section>

      <section className="login-card-section">
        <div className="login-card auth-step-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              <MailCheck size={22} />
            </div>

            <div>
              <h1>Verify your identity</h1>
              <p>{email ? `Code sent to ${email}` : "Enter your email verification code."}</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleVerify}>
            <div className="login-field">
              <label>Verification Code</label>
              <div className="login-input-wrap otp-input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={handleOtpChange}
                />
              </div>
            </div>

            <p className="auth-step-note">
              This code expires after 10 minutes and can only be used once.
            </p>

            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <button className="login-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Code"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <button
            className="auth-secondary-btn"
            type="button"
            onClick={handleResend}
            disabled={isResending}
          >
            <RefreshCcw size={16} />
            {isResending ? "Sending..." : "Resend code"}
          </button>

          <div className="login-trust-row single-trust">
            <div>
              <ShieldCheck size={17} />
              <span>JWT issued after verification</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OTPVerificationPage;
