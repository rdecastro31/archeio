import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  FiBell,
  FiCheck,
  FiCheckCircle
} from "react-icons/fi";
import Swal from "sweetalert2";
import "../styles/header.css";
import { API_URL } from "../shared/constants";

export default function Header({ onToggleSidebar, user, onLogout, notifications: livePusherNotifications = [] }) {
  const navigate = useNavigate();
  const username = user?.fullname || "Liham User";
  const userlevel = user?.userlevel || "";
  const email = user?.email || "";

  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false); // Notifications dropdown state

  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    retype_password: "",
  });

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // 1. Fetch unread count on initial load
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
    }
  }, [user?.id]);

  // 2. Increment unread count when real-time Pusher notification arrives
  useEffect(() => {
    if (livePusherNotifications.length > 0) {
      setUnreadCount((prev) => prev + 1);
      // If dropdown is currently open, refresh the list
      if (showNotifDropdown) {
        fetchNotifications();
      }
    }
  }, [livePusherNotifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // API Call: Get Unread Count
  const fetchUnreadCount = async () => {
    try {
      const fd = new FormData();
      fd.append("tag", "getunreadcount");
      fd.append("userid", user.id);

      const res = await fetch(`${API_URL}/notification.php`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success === 1) {
        setUnreadCount(data.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  // API Call: Get All Notifications for User
  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoadingNotifs(true);
    try {
      const fd = new FormData();
      fd.append("tag", "getbyuser");
      fd.append("userid", user.id);
      fd.append("limit", 20);

      const res = await fetch(`${API_URL}/notification.php`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success === 1) {
        setNotificationsList(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Toggle Notification Dropdown
  const handleToggleNotifications = () => {
    if (!showNotifDropdown) {
      fetchNotifications();
    }
    setShowNotifDropdown((prev) => !prev);
    setShowDropdown(false); // Close profile dropdown if open
  };

  // API Call: Mark single notification as read and navigate
  const handleNotifClick = async (notif) => {
    if (notif.is_read == 0) {
      try {
        const fd = new FormData();
        fd.append("tag", "markasread");
        fd.append("id", notif.id);
        fd.append("userid", user.id);

        await fetch(`${API_URL}/notification.php`, { method: "POST", body: fd });

        // Update local state UI
        setNotificationsList((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, is_read: 1 } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    }

    setShowNotifDropdown(false);
    navigate("/transactions");
  };

  // API Call: Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const fd = new FormData();
      fd.append("tag", "markallasread");
      fd.append("userid", user.id);

      const res = await fetch(`${API_URL}/notification.php`, { method: "POST", body: fd });
      const data = await res.json();

      if (data.success === 1) {
        setNotificationsList((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
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
          {/* NOTIFICATION BELL BUTTON */}
          <div className="notification-container" ref={notifRef}>
            <button
              type="button"
              className={`icon-btn notif-btn ${showNotifDropdown ? "active" : ""}`}
              onClick={handleToggleNotifications}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN MENU */}
            {showNotifDropdown && (
              <div className="notif-dropdown-menu">
                <div className="notif-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                      <FiCheckCircle /> Mark all as read
                    </button>
                  )}
                </div>

                <div className="notif-body">
                  {loadingNotifs ? (
                    <div className="notif-state">Loading notifications...</div>
                  ) : notificationsList.length === 0 ? (
                    <div className="notif-state">No notifications yet</div>
                  ) : (
                    notificationsList.map((item) => (
                      <div
                        key={item.id}
                        className={`notif-item ${item.is_read == 0 ? "unread" : ""}`}
                        onClick={() => handleNotifClick(item)}
                      >
                        <div className="notif-content">
                          <strong>{item.title || "Notification"}</strong>
                          <p>{item.message}</p>
                          <small>{new Date(item.date_created).toLocaleString()}</small>
                        </div>
                        {item.is_read == 0 && <span className="unread-dot"></span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PROFILE DROPDOWN */}
          <div className="profile-container" ref={dropdownRef}>
            <div
              className={`profile-box ${showDropdown ? "active" : ""}`}
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifDropdown(false);
              }}
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

      {/* CHANGE PASSWORD MODAL */}
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