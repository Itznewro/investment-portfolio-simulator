import { Link } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import "../App.css";

function LandingPage() {
  const [showCookies, setShowCookies] = useState(true);
const [darkMode, setDarkMode] = useState(
  localStorage.getItem("landingTheme") === "dark"
);

const toggleTheme = () => {
  const newTheme = !darkMode;
  setDarkMode(newTheme);
  localStorage.setItem("landingTheme", newTheme ? "dark" : "light");
};

  return (
    <div className={`landing-page ${darkMode ? "landing-dark" : ""}`}>
      <nav className="landing-navbar">
        <div className="landing-logo">
          <img src={logo} alt="IPSimulator logo" />
          <span>IPSimulator</span>
        </div>

        <div className="landing-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#benefits">Benefits</a>
        </div>

        <div className="landing-actions">
          <button className="theme-toggle" onClick={toggleTheme}>
               {darkMode ? "Light" : "Dark"}
           </button>
          <Link to="/login" className="landing-signin">Sign In</Link>
          <Link to="/register" className="landing-primary">Get Started</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-text">
          <h1>Learn stock investing without risking real money</h1>
          <p>
            Practice buying and selling stocks with virtual funds, live market
            prices, portfolio analytics, and economic event insights.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="hero-primary">Create Free Account</Link>
            <Link to="/login" className="hero-secondary">Sign In</Link>
          </div>
        </div>

        <div className="hero-preview">
          <div className="preview-card">
            <p className="preview-label">Portfolio Value</p>
            <h2>$100,000.00</h2>
            <span className="preview-green">Virtual trading balance</span>

            <div className="preview-chart"></div>

            <div className="preview-row">
              <span>AAPL</span>
              <strong>$212.45</strong>
            </div>
            <div className="preview-row">
              <span>TSLA</span>
              <strong>$171.88</strong>
            </div>
            <button>Buy / Sell</button>
          </div>
        </div>
      </section>

      <section className="landing-section light" id="features">
        <div className="section-image-card">
          <div className="mini-dashboard">
            <h3>Live simulator</h3>
            <p>$100,000 virtual starting balance</p>
            <div className="mini-bars">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div className="section-text">
          <h2>Built for beginner investors</h2>
          <ul>
            <li>Start with $100,000 in virtual funds</li>
            <li>Search real stocks and view live prices</li>
            <li>Track portfolio value and unrealized profit/loss</li>
            <li>Use economic events to understand market movement</li>
          </ul>
        </div>
      </section>

      <section className="landing-section white" id="how">
        <h2 className="center-title">Get started in 3 easy steps</h2>

        <div className="steps-grid">
          <div className="step-card">
            <h3>1. Create your account</h3>
            <p>Register securely and access your own portfolio dashboard.</p>
          </div>

          <div className="step-card">
            <h3>2. Trade with virtual funds</h3>
            <p>Search stocks, enter quantity or amount, and simulate orders.</p>
          </div>

          <div className="step-card">
            <h3>3. Track performance</h3>
            <p>Review portfolio value, holdings, transactions, and market data.</p>
          </div>
        </div>
      </section>

      <section className="landing-section dark" id="benefits">
        <div>
          <h2>Practice. Learn. Improve.</h2>
          <p>
            IPSimulator is designed for safe learning, not financial advice.
            It helps users understand stock trading decisions before using real money.
          </p>
          <Link to="/register" className="dark-btn">Try it now</Link>
        </div>

        <div className="benefits-list">
          <p>✓ Risk-free investing practice</p>
          <p>✓ Live stock market integration</p>
          <p>✓ Buy and sell simulation</p>
          <p>✓ Portfolio analytics dashboard</p>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <h3>IPSimulator</h3>
          <p>Educational stock market simulator for beginner investors.</p>
        </div>

        <div>
          <h4>Links</h4>
          <p>Features</p>
          <p>How it works</p>
          <p>Dashboard</p>
        </div>

        <div>
          <h4>Contact</h4>
          <p>Email: support@ipsimulator.com</p>
          <p>GitHub: investment-portfolio-simulator</p>
        </div>

        <div>
          <h4>Disclaimer</h4>
          <p>This project is for educational purposes only and is not financial advice.</p>
        </div>
      </footer>

      {showCookies && (
        <div className="cookie-popup">
          <button className="cookie-close" onClick={() => setShowCookies(false)}>×</button>
          <p>
            We use cookies to improve your experience and remember your preferences.
          </p>
          <div>
            <button onClick={() => setShowCookies(false)}>Reject</button>
            <button onClick={() => setShowCookies(false)}>Accept</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;