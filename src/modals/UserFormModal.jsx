import React, { useState, useEffect } from "react";
import { FiEye, FiEyeOff, FiX } from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";

export default function UserFormModal({ show, onClose, user, departments, onSuccess }) {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullname: "",
        email: "",
        password: "",
        userlevel: "Staff",
        department_id: "",
        position: "",
        status: "Active"
    });

    useEffect(() => {
        if (user) {
            setFormData({ ...user, password: "" });
        } else {
            setFormData({
                fullname: "", email: "", password: "",
                userlevel: "Staff", department_id: departments[0]?.id || "",
                position: "", status: "Active"
            });
        }
    }, [user, show, departments]);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        const fd = new FormData();
        fd.append("tag", user ? "update" : "insert");
        if (user) fd.append("id", user.id);

        // Append all fields except password for the general update
        Object.keys(formData).forEach(key => {
            if (key !== 'password') {
                fd.append(key, formData[key]);
            }
        });

        // If inserting a new user, we need the password immediately
        if (!user) {
            fd.append("password", formData.password);
        }

        try {
            // Update/Insert General Profile
            const response = await fetch(`${API_URL}/users.php`, {
                method: "POST",
                body: fd,
            });
            const data = await response.json();

            if (data.success) {
                // Check if we need to update the password separately
                // Only runs if we are in "edit" mode and the password field is not empty
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
                        Swal.fire("Partial Success", "Profile updated, but password change failed.", "warning");
                        return;
                    }
                }

                Swal.fire("Success", "User details updated successfully", "success");
                onSuccess();
                onClose();
            } else {
                Swal.fire("Error", data.message, "error");
            }
        } catch (error) {
            Swal.fire("Error", "Connection failed", "error");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="category-modal" style={{ maxWidth: '550px' }}>
                <div className="modal-header">
                    <div>
                        <h2>{user ? "Edit User Account" : "Add New User"}</h2>
                        <p>Manage credentials and departmental access.</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={handleSubmit} className="category-form">
                    <div className="user-form-grid">
                        <div className="form-group full-width">
                            <label>Full Name</label>
                            <input className="form-input-styled" type="text" required
                                value={formData.fullname}
                                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Email Address</label>
                            <input className="form-input-styled" type="email" required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>{user ? "Change Password (Optional)" : "Password"}</label>
                            <div className="password-input-wrapper">
                                <input
                                    className="form-input-styled"
                                    type={showPassword ? "text" : "password"}
                                    required={!user}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Access Level</label>
                            <select className="form-input-styled form-select-styled"
                                value={formData.userlevel}
                                onChange={(e) => setFormData({ ...formData, userlevel: e.target.value })}>
                                <option value="" disabled>Select Access Level</option>
                                <option value="Administrator">Administrator</option>
                                <option value="Records Officer">Records Officer</option>
                                <option value="Approver">Approver</option>
                                <option value="Staff">Staff</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Department</label>
                            <select className="form-input-styled form-select-styled" required
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}>
                                <option value="" disabled>Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Position</label>
                            <input className="form-input-styled" type="text" required
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select className="form-input-styled form-select-styled"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                <option value="" disabled>Select Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}