import React, { useState, useEffect } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";

export default function UserFormModal({
  show,
  onClose,
  user,
  departments,
  roles = [],
  onSuccess,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const getDefaultRole = () => {
    const staffRole = roles.find((role) => role.role_name === "Staff");
    return staffRole?.id || roles[0]?.id || "";
  };

  const getRoleNameById = (roleId) => {
    const role = roles.find((item) => String(item.id) === String(roleId));
    return role ? role.role_name : "";
  };

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    mobile_number: "",
    password: "",
    role_id: "",
    userlevel: "",
    department_id: "",
    position: "",
    status: "Active",
  });

  useEffect(() => {
    if (user) {
      const roleId = user.role_id || getDefaultRole();

      setFormData({
        ...user,
        mobile_number: user.mobile_number || "",
        password: "",
        role_id: roleId,
        userlevel: user.role_name || user.userlevel || getRoleNameById(roleId),
      });
    } else {
      const defaultRoleId = getDefaultRole();

      setFormData({
        fullname: "",
        email: "",
        mobile_number: "",
        password: "",
        role_id: defaultRoleId,
        userlevel: getRoleNameById(defaultRoleId),
        department_id: departments[0]?.id || "",
        position: "",
        status: "Active",
      });
    }
  }, [user, show, departments, roles]);

  if (!show) return null;

  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!";
    let generated = "";

    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setFormData((prev) => ({
      ...prev,
      password: generated,
    }));

    setShowPassword(true);
  };

  const handleRoleChange = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      role_id: roleId,
      userlevel: getRoleNameById(roleId),
    }));
  };

  const handleMobileChange = (value) => {
    const cleaned = value.replace(/[^\d+]/g, "").slice(0, 13);

    setFormData((prev) => ({
      ...prev,
      mobile_number: cleaned,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.role_id) {
      Swal.fire("Required", "Please select a user role.", "warning");
      return;
    }

    if (!user && formData.password.length < 6) {
      Swal.fire(
        "Invalid Password",
        "Password must be at least 6 characters.",
        "warning"
      );
      return;
    }

    if (user && formData.password && formData.password.length < 6) {
      Swal.fire(
        "Invalid Password",
        "New password must be at least 6 characters.",
        "warning"
      );
      return;
    }

    const fd = new FormData();
    fd.append("tag", user ? "update" : "insert");

    Object.keys(formData).forEach((key) => {
      if (key !== "password") {
        fd.append(key, formData[key]);
      }
    });

    if (user) {
      fd.append("id", user.id);
    }

    if (!user) {
      fd.append("password", formData.password);
    }

    try {
      const response = await fetch(`${API_URL}/users.php`, {
        method: "POST",
        body: fd,
      });

      const data = await response.json();

      if (data.success) {
        if (user && formData.password) {
          const passFd = new FormData();
          passFd.append("tag", "update_password");
          passFd.append("email", formData.email);
          passFd.append("password", formData.password);

          const passResponse = await fetch(`${API_URL}/users.php`, {
            method: "POST",
            body: passFd,
          });

          const passData = await passResponse.json();

          if (!passData.success) {
            Swal.fire(
              "Partial Success",
              "Profile updated, but password change failed.",
              "warning"
            );
            return;
          }
        }

        Swal.fire("Success", "User details saved successfully.", "success");
        onSuccess();
        onClose();
      } else {
        Swal.fire("Error", data.message || "Failed to save user.", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Connection failed", "error");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="category-modal" style={{ maxWidth: "620px" }}>
        <div className="modal-header">
          <div>
            <h2>{user ? "Edit User Account" : "Add New User"}</h2>
            <p>Manage credentials, mobile OTP, role, and departmental access.</p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="category-form">
          <div className="user-form-grid">
            <div className="form-group full-width">
              <label>Full Name</label>
              <input
                className="form-input-styled"
                type="text"
                required
                value={formData.fullname}
                onChange={(e) =>
                  setFormData({ ...formData, fullname: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                className="form-input-styled"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <input
                className="form-input-styled"
                type="text"
                required
                placeholder="e.g. 09171234567"
                value={formData.mobile_number}
                onChange={(e) => handleMobileChange(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>{user ? "Change Password (Optional)" : "Password"}</label>

              <div className="password-input-wrapper">
                <input
                  className="form-input-styled"
                  type={showPassword ? "text" : "password"}
                  required={!user}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />

                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <button
                type="button"
                className="secondary-btn"
                style={{ marginTop: "8px" }}
                onClick={generatePassword}
              >
                Generate Password
              </button>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                className="form-input-styled form-select-styled"
                required
                value={formData.role_id}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="" disabled>
                  Select Role
                </option>

                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select
                className="form-input-styled form-select-styled"
                required
                value={formData.department_id}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
              >
                <option value="" disabled>
                  Select Department
                </option>

                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Position</label>
              <input
                className="form-input-styled"
                type="text"
                required
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                className="form-input-styled form-select-styled"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="" disabled>
                  Select Status
                </option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>

            <button type="submit" className="primary-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}