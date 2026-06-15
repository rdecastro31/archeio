import { useState, useEffect, useRef } from "react";
import {
  FiMenu,
  FiSearch,
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiX,
  FiLogOut,
  FiChevronDown,
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/header.css";
import { API_URL } from "../shared/constants";

export default function Header({ onToggleSidebar, user, onLogout }) {
  const username = user?.fullname || "ArcheIO User";
  const userlevel = user?.userlevel || "";
  const email = user?.email || "";

  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false); // Dropdown visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    retype_password: "",
  });

  const dropdownRef = useRef(null); // Reference to detect outside clicks

  // Close dropdown if the user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.password || !passwordForm.retype_password) {
      Swal.fire("Validation Error", "Please fill out both password fields.", "warning");
      return;
    }

    if (passwordForm.password.length < 6) {
      Swal.fire("Validation Error", "Password must be at least 6 characters.", "warning");
      return;
    }

    if (passwordForm.password !== passwordForm.retype_password) {
      Swal.fire("Validation Error", "Passwords do not match.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("tag", "change_password");
    formData.append("email", email);
    formData.append("password", passwordForm.password);

    try {
      const response = await fetch(`${API_URL}/users.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success === 1) {
        Swal.fire("Success", result.message || "Password updated successfully.", "success");
        setPasswordForm({ password: "", retype_password: "" });
        setShowModal(false);
      } else {
        Swal.fire("Error", result.message || "Failed to update password.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server connection failed.", "error");
    }
  };

  const handleLogoutClick = () => {
    setShowDropdown(false);
    if (onLogout) {
      onLogout();
    } else {
      Swal.fire("Logout", "Logout functionality triggered.", "info");
    }
  };

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <button className="menu-toggle-btn" onClick={onToggleSidebar}>
            <FiMenu />
          </button>

          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, {username}</p>
          </div>
        </div>

        <div className="header-right">
          {/* <div className="search-box">
            <FiSearch />
            <input type="text" placeholder="Search..." />
          </div> */}

          {/* Profile Dropdown Container */}
          <div className="profile-container" ref={dropdownRef}>
            <div
              className={`profile-box ${showDropdown ? "active" : ""}`}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="profile-avatar">
                <FiUser />
              </div>
              <div className="profile-text">
                <strong>{username}</strong>
                <span>{userlevel}</span>
              </div>
              <FiChevronDown className={`dropdown-arrow ${showDropdown ? "open" : ""}`} />
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="profile-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setShowModal(true);
                    setShowDropdown(false);
                  }}
                >
                  <FiLock />
                  <span>Change Password</span>
                </button>

                <hr className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item logout"
                  onClick={handleLogoutClick}
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <div className="change-password-backdrop">
          <div className="change-password-modal">
            <button
              type="button"
              className="change-password-close"
              onClick={() => setShowModal(false)}
            >
              <FiX />
            </button>

            <div className="change-password-header">
              <h3>Change Password</h3>
              <p>Enter your new password. Minimum of 6 characters.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="change-password-form">
              <div className="change-password-group">
                <label>New Password</label>
                <div className="change-password-input">
                  <FiLock />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={passwordForm.password}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="change-password-group">
                <label>Retype Password</label>
                <div className="change-password-input">
                  <FiLock />
                  <input
                    type={showRetypePassword ? "text" : "password"}
                    name="retype_password"
                    value={passwordForm.retype_password}
                    onChange={handlePasswordChange}
                    placeholder="Retype new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRetypePassword(!showRetypePassword)}
                  >
                    {showRetypePassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="change-password-submit">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}