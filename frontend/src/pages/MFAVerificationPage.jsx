import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

const readStoredMfaState = () => {
  try {
    return JSON.parse(sessionStorage.getItem("pendingMfa") || "{}");
  } catch {
    return {};
  }
};

function MFAVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedState = useMemo(() => readStoredMfaState(), []);
  const email = location.state?.email || storedState.email || "";
  const mfaToken = location.state?.mfaToken || storedState.mfaToken || "";
  const fromPath = location.state?.fromPath || storedState.fromPath || "/dashboard";

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleCodeChange = (event) => {
    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!mfaToken) {
      setError("MFA session missing. Please sign in again.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit authenticator code.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/mfa/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mfaToken,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "MFA verification failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.removeItem("pendingMfa");
      setMessage("MFA verified. Redirecting...");

      navigate(fromPath, { replace: true });
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsSubmitting(false);
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
          <h1>Confirm it is really you with your authenticator app.</h1>
          <p>
            Open Okta Verify, Google Authenticator, Microsoft Authenticator, or
            Authy and enter the current IPSimulator code.
          </p>
        </div>
      </section>

      <section className="login-card-section">
        <div className="login-card auth-step-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              <KeyRound size={22} />
            </div>

            <div>
              <h1>Authenticator code</h1>
              <p>{email ? `Final sign-in step for ${email}` : "Final sign-in step"}</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleVerify}>
            <div className="login-field">
              <label>6-digit code</label>
              <div className="login-input-wrap otp-input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={handleCodeChange}
                />
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <button className="login-submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Complete Login"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-trust-row single-trust">
            <div>
              <ShieldCheck size={17} />
              <span>Authenticator app required</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MFAVerificationPage;
