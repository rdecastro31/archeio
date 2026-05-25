import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle } from "react-icons/fi"; // Added Alert Icon
import "../styles/login.css";
import archeioLogo from '../assets/archeiologo.png';
import { API_URL } from "../shared/constants";

export default function Login({ logo }) {
  const navigate = useNavigate();
  const currentLogo = logo || archeioLogo;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // Track error messages
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Clear error when user starts typing again
    if (error) setError("");

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error on new attempt

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
      console.log(JSON.stringify(result.data));

      if (result.success === 1) {
        localStorage.setItem("token", result.data.email);
        localStorage.setItem("user", JSON.stringify(result.data));

          const userLevel = result.data.userlevel?.trim();

if (userLevel === "Super Admin" || userLevel === "SuperAdmin"){
  navigate("/admin-dashboard");
} 
else{

        navigate("/dashboard");
}
      } else {
        // Use the message from your PHP backend
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
            <img src={currentLogo} alt="ArcheIO Logo" style={{ width: '100%', height: 'auto' }} />
            <div className="brand-badge">ArcheIO Smart Document Control</div>
            <h1>Welcome Back</h1>
            <p>
              Manage, organize, and retrieve your documents with ease.
              Leverage OCR technology to digitize files and streamline
              your document workflows.
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

            {/* ERROR MESSAGE COMPONENT */}
            {error && (
              <div className="error-message-box">
                <FiAlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className={`input-wrapper ${error ? 'input-error' : ''}`}>
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
                <div className={`input-wrapper ${error ? 'input-error' : ''}`}>
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
                <button type="button" className="forgot-btn">Forgot password?</button>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Verifying..." : (
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
    </div>
  );
}