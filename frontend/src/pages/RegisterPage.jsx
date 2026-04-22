import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../App.css";

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setMessage("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError("Could not connect to server.");
    }
  };

  return (
    <div className="container">
      <div className="auth-box">
        <h1>Create Your Account</h1>

        <form onSubmit={handleRegister}>
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            placeholder="Enter Your Full Name"
            value={formData.fullName}
            onChange={handleChange}
          />

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

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Your Password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />

          <button type="submit">Create Account</button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <div className="divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <Link to="/" className="switch-link">
          Already have an account? Sign In →
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;