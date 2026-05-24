import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  UserRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

function RegisterPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (recaptchaSiteKey && !captchaToken) {
      setError("Please complete the CAPTCHA challenge.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        recaptchaRef.current?.reset();
        setCaptchaToken("");
        setIsSubmitting(false);
        return;
      }

      const otpState = {
        email: data.email || formData.email,
        purpose: data.purpose || "register",
        challengeToken: data.challengeToken,
      };

      sessionStorage.setItem("pendingOtp", JSON.stringify(otpState));
      setMessage(data.message || "Verification code sent.");

      navigate(
        `/verify-otp?email=${encodeURIComponent(otpState.email)}&purpose=${otpState.purpose}`,
        { state: otpState }
      );
    } catch {
      setError("Could not connect to server.");
      recaptchaRef.current?.reset();
      setCaptchaToken("");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-bg-glow login-bg-glow-one"></div>
      <div className="login-bg-glow login-bg-glow-two"></div>

      <section className="login-left-panel">
        <Link to="/" className="login-brand">
          <img src={logo} alt="IPSimulator logo" />
          <span>IPSimulator</span>
        </Link>

        <div className="login-hero-copy">
          
          <h1>Create your virtual trading account today.</h1>
          <p className="login-hero-description">
            Get access to your personal dashboard, practise buying and selling
            stocks, track portfolio performance, and learn investing safely with
            virtual funds.
          </p>

          <div className="register-benefits">
            <div>
              <CheckCircle2 size={18} />
              <span>$100,000 virtual balance</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Live stock market practice</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Portfolio and trade tracking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-card-section">
        <div className="login-card register-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              <TrendingUp size={22} />
            </div>

            <div>
              <h1>Create account</h1>
              <p>Register to start your trading simulation.</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="login-form">
            <div className="login-field">
              <label>Full Name</label>
              <div className="login-input-wrap">
                <UserRound className="login-input-icon" size={18} />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
            </div>

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

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label>Confirm Password</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
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

            <div className="captcha-wrap">
              {recaptchaSiteKey ? (
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaSiteKey}
                  theme="dark"
                  onChange={(token) => setCaptchaToken(token || "")}
                  onExpired={() => setCaptchaToken("")}
                />
              ) : (
                <p className="captcha-missing">
                  CAPTCHA site key missing. Backend verification will decide this request.
                </p>
              )}
            </div>

            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-divider-new">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <p className="login-register-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <div className="login-trust-row single-trust">
            <div>
              <ShieldCheck size={17} />
              <span>Secure account setup</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
