import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiAlertCircle,
  FiX
} from "react-icons/fi";
import "../styles/login.css";
import archeioLogo from "../assets/archeiologo.png";
import { API_URL } from "../shared/constants";

export default function Login({ logo }) {
  const navigate = useNavigate();
  const currentLogo = logo || archeioLogo;

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (error) setError("");

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openResetModal = () => {
    setResetEmail(form.email || "");
    setResetMessage("");
    setResetError("");
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    if (resetLoading) return;

    setShowResetModal(false);
    setResetEmail("");
    setResetMessage("");
    setResetError("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setResetMessage("");
    setResetError("");

    if (!resetEmail) {
      setResetError("Please enter your registered email address.");
      return;
    }

    setResetLoading(true);

    try {
      const formData = new FormData();
      formData.append("tag", "reset_password");
      formData.append("email", resetEmail);

      const response = await fetch(`${API_URL}/users.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success === 1) {
        setResetMessage(
          result.message ||
            "Password reset successful. Please check your email for your temporary password."
        );
        setResetEmail("");
      } else {
        setResetError(result.message || "Unable to reset password.");
      }
    } catch (err) {
      console.error("Reset Password Error:", err);
      setResetError("Unable to connect to the server. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("tag", "login");
      formData.append("email", form.email);
      formData.append("password", form.password);

      const response = await fetch(`${API_URL}/users.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success === 1) {
        localStorage.setItem("token", result.data.email);
        localStorage.setItem("user", JSON.stringify(result.data));

       const loggedUser = result.data || {};

const roleName = String(
  loggedUser.role_name || loggedUser.userlevel || ""
).trim();

const permissions = Array.isArray(loggedUser.permissions)
  ? loggedUser.permissions
  : [];

const isSuperAdmin =
  roleName === "Super Admin" ||
  roleName === "SuperAdmin" ||
  permissions.includes("DashboardAdmin.View");

if (isSuperAdmin) {
  navigate("/admin-dashboard");
} else {
  navigate("/dashboard");
}
      } else {
        setError(result.message || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-brand-panel">
          <div className="brand-overlay"></div>

          <div className="brand-content">
            <img
              src={currentLogo}
              alt="ArcheIO Logo"
              style={{ width: "100%", height: "auto" }}
            />

            <div className="brand-badge">ArcheIO Smart Document Control</div>

            <h1>Welcome Back</h1>

            <p>
              Simplify document management with OCR-powered search, AI document review, secure workflow routing, and centralized archiving—helping organizations work faster, smarter, and more efficiently
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
                Efficient workflow tracking
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

            {error && (
              <div className="error-message-box">
                <FiAlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>

                <div className={`input-wrapper ${error ? "input-error" : ""}`}>
                  <FiMail className="input-icon" />

                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>

                <div className={`input-wrapper ${error ? "input-error" : ""}`}>
                  <FiLock className="input-icon" />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
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

                <button
                  type="button"
                  className="forgot-btn"
                  onClick={openResetModal}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  "Verifying..."
                ) : (
                  <>
                    <FiLogIn />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>Protected system access. Authorized users only.</p>
            </div>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="reset-modal-backdrop">
          <div className="reset-modal">
            <button
              type="button"
              className="reset-modal-close"
              onClick={closeResetModal}
              disabled={resetLoading}
            >
              <FiX />
            </button>

            <div className="reset-modal-header">
              <h3>Reset Password</h3>
              <p>
                Enter your registered email address. A temporary password will
                be sent to your email.
              </p>
            </div>

            {resetError && (
              <div className="error-message-box">
                <FiAlertCircle className="error-icon" />
                <span>{resetError}</span>
              </div>
            )}

            {resetMessage && (
              <div className="success-message-box">
                <span>{resetMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="reset-form">
              <div className="input-group">
                <label>Registered Email Address</label>

                <div className={`input-wrapper ${resetError ? "input-error" : ""}`}>
                  <FiMail className="input-icon" />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetError("");
                      setResetMessage("");
                    }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={resetLoading}
              >
                {resetLoading ? "Sending..." : "Send Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}