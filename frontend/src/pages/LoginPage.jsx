import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  ShieldCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful! Redirecting...");

      setTimeout(() => {
        navigate("/dashboard");
      }, 900);
    } catch (err) {
      setError("Could not connect to server.");
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
          
          <h1>Trade smarter with a risk-free virtual portfolio.</h1>
          <p>
            Sign in to monitor your balance, practise stock trades, track market
            movement, and improve your investing decisions without risking real money.
          </p>
        </div>

        
      </section>

      <section className="login-card-section">
        <div className="login-card">
          <div className="login-card-top">
            <div className="login-icon-badge">
              <TrendingUp size={22} />
            </div>

            <div>
              <h1>Welcome back</h1>
              <p>Sign in to continue your trading simulation.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
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
                  placeholder="Enter your password"
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

            {error && <p className="login-error">{error}</p>}
            {message && <p className="login-success">{message}</p>}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Continue"}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-divider-new">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <p className="login-register-text">
            New to IPSimulator?{" "}
            <Link to="/register">Create an account</Link>
          </p>

          <div className="login-trust-row">
            <div>
              <ShieldCheck size={17} />
              <span>Secure login</span>
            </div>

            <div>
              <Activity size={17} />
              <span>Live market practice</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;