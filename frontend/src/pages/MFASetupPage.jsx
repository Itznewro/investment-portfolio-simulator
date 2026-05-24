import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

const readJsonSafely = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Server returned an invalid response." };
  }
};

function MFASetupPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(Boolean(storedUser?.mfaEnabled));
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  const fetchSetupQr = useCallback(async ({ showSpinner = false } = {}) => {
    if (!token) {
      handleUnauthorized();
      return;
    }

    setError("");
    setMessage("");

    if (showSpinner) {
      setIsRegenerating(true);
    }

    try {
      const response = await fetch("/api/auth/mfa/setup", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readJsonSafely(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.message || "Could not load MFA setup.");
        return;
      }

      if (data.mfaEnabled) {
        setMfaEnabled(true);
        setQrCodeDataUrl("");
        setMessage(data.message || "Authenticator app MFA is already enabled.");
        return;
      }

      setQrCodeDataUrl(data.qrCodeDataUrl || "");
      setMfaEnabled(false);
      setMessage(data.message || "Scan the QR code with your authenticator app.");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsRegenerating(false);
    }
  }, [handleUnauthorized, token]);

  useEffect(() => {
    const loadMfaSetup = async () => {
      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        setIsLoading(true);

        const statusResponse = await fetch("/api/auth/mfa/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const statusData = await readJsonSafely(statusResponse);

        if (statusResponse.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!statusResponse.ok) {
          setError(statusData.message || "Could not load MFA status.");
          return;
        }

        if (statusData.mfaEnabled) {
          setMfaEnabled(true);
          setMessage("Authenticator app MFA is enabled for this account.");
          return;
        }

        await fetchSetupQr();
      } finally {
        setIsLoading(false);
      }
    };

    loadMfaSetup();
  }, [fetchSetupQr, handleUnauthorized, token]);

  const handleCodeChange = (event) => {
    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleVerifySetup = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch("/api/auth/mfa/setup/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await readJsonSafely(response);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.message || "Could not enable MFA.");
        return;
      }

      const nextUser = {
        ...storedUser,
        ...(data.user || {}),
        mfaEnabled: true,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
      setMfaEnabled(true);
      setQrCodeDataUrl("");
      setCode("");
      setMessage(data.message || "Authenticator app MFA enabled.");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="login-page-shell auth-step-shell">
      <div className="login-bg-glow login-bg-glow-one"></div>
      <div className="login-bg-glow login-bg-glow-two"></div>

      <section className="login-left-panel">
        <Link to="/dashboard" className="login-brand">
          <img src={logo} alt="IPSimulator logo" />
          <span>IPSimulator</span>
        </Link>

        <div className="login-hero-copy">
          <h1>Secure your portfolio with authenticator app MFA.</h1>
          <p>
            Scan the QR code with Okta Verify, Google Authenticator, Microsoft
            Authenticator, or Authy, then enter one code to enable protection.
          </p>
        </div>
      </section>

      <section className="login-card-section">
        <div className="login-card mfa-setup-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              {mfaEnabled ? <CheckCircle2 size={22} /> : <KeyRound size={22} />}
            </div>

            <div>
              <h1>Authenticator MFA</h1>
              <p>
                {mfaEnabled
                  ? "Your account requires authenticator codes during login."
                  : "Scan the QR code and confirm a current 6-digit code."}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="auth-step-note">Loading MFA setup...</p>
          ) : mfaEnabled ? (
            <div className="mfa-enabled-panel">
              <CheckCircle2 size={34} />
              <div>
                <h2>MFA is enabled</h2>
                <p>Your future logins will require email OTP plus your authenticator code.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mfa-qr-panel">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="IPSimulator MFA QR code" />
                ) : (
                  <p>QR code unavailable.</p>
                )}
              </div>

              <form className="login-form" onSubmit={handleVerifySetup}>
                <div className="login-field">
                  <label>Authenticator Code</label>
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

                <button
                  className="login-submit-btn"
                  type="submit"
                  disabled={isVerifying || !qrCodeDataUrl}
                >
                  {isVerifying ? "Enabling..." : "Enable MFA"}
                  {!isVerifying && <ArrowRight size={18} />}
                </button>
              </form>

              <button
                type="button"
                className="auth-secondary-btn"
                onClick={() => fetchSetupQr({ showSpinner: true })}
                disabled={isRegenerating}
              >
                <RefreshCcw size={16} />
                {isRegenerating ? "Generating..." : "Generate new QR"}
              </button>
            </>
          )}

          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-success">{message}</p>}

          <div className="login-trust-row single-trust">
            <div>
              <ShieldCheck size={17} />
              <span>Works with Okta Verify and standard TOTP apps</span>
            </div>
          </div>

          <p className="login-register-text mfa-settings-link">
            <Link to="/settings">Back to settings</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default MFASetupPage;
