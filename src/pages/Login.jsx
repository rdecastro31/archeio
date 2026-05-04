import React, { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi";
import "../styles/login.css";
import logoUrl from '../assets/archeiologo.png';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Login Data:", form);

    // Sample only
    // Replace this with your API call
    if (!form.email || !form.password) {
      alert("Please enter your email and password.");
      return;
    }

    alert("Login submitted!");
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-brand-panel">
          <div className="brand-overlay">
          </div>
          <div className="brand-content">
            <img src={logoUrl} alt="ArcheIO Logo" style={{ width: '100% ', height: 'auto' }} />
            <div className="brand-badge">ArcheIO Smart Document Control</div>
            <h1>Welcome Back</h1>
            <p>
              Manage, organize, and retrieve your documents with ease.
              Leverage OCR technology to digitize files and streamline
              your document workflows in one centralized platform.
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-dot"></span>
                Intelligent OCR for searchable documents
              </div>
              <div className="feature-item">
                <span className="feature-dot"></span>
                Secure and structured document archiving
              </div>
              <div className="feature-item">
                <span className="feature-dot"></span>
                Efficient workflow and approval tracking
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-box">
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Please enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>

                <button type="button" className="forgot-btn">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-btn">
                <FiLogIn />
                <span>Sign In</span>
              </button>
            </form>

            <div className="login-footer">
              <p>
                Protected system access. Authorized users only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}