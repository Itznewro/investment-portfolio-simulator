import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../App.css";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful! Redirecting...");

      setTimeout(() => {
        navigate("/intro");
      }, 1000);
    } catch (err) {
      setError("Could not connect to server.");
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <h1>Sign In to Simulator</h1>

        <form onSubmit={handleLogin}>
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="Enter Your Email Address"
            value={formData.email}
            onChange={handleChange}
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter Your Password"
            value={formData.password}
            onChange={handleChange}
          />

          <button type="submit">Continue</button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <div className="divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <Link to="/register" className="switch-link">
          Register Now →
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;