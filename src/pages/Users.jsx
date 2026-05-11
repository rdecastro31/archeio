import React, { useState, useEffect, useCallback } from "react";
import {
    FiUserPlus, FiSearch, FiEdit2, FiTrash2,
    FiUser, FiMail, FiBriefcase, FiLayers
} from "react-icons/fi";
import Swal from "sweetalert2";
import { API_URL } from "../shared/constants";
import UserFormModal from "../modals/UserFormModal";
import "../styles/users.css";
import { useOutletContext } from "react-router-dom";

export default function Users() {
    const { user: ownUser } = useOutletContext();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const callApi = async (url, formData) => {
        try {
            const response = await fetch(url, {
                method: "POST",
                body: formData,
            });
            return await response.json();
        } catch (error) {
            return { success: 0, message: "Network error" };
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);

        // Fetch Users
        const userFd = new FormData();
        userFd.append("tag", "getall");
        const userData = await callApi(`${API_URL}/users.php`, userFd);

        // Fetch Departments for the Modal and Mapping
        const deptFd = new FormData();
        deptFd.append("tag", "getall");
        const deptData = await callApi(`${API_URL}/department.php`, deptFd);

        if (userData.success) setUsers(userData.data);
        if (deptData.success) setDepartments(deptData.data);

        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (user) => {
        const res = await Swal.fire({
            title: 'Delete User?',
            text: `Remove ${user.fullname} from the system?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#820d0d',
            confirmButtonText: 'Yes, delete'
        });

        if (res.isConfirmed) {
            const fd = new FormData();
            fd.append("tag", "delete");
            fd.append("id", user.id);
            const data = await callApi(`${API_URL}/users.php`, fd);
            if (data.success) {
                fetchData();
                Swal.fire("Deleted!", data.message, "success");
            }
        }
    };

    const getDeptName = (id) => {
        const dept = departments.find(d => d.id == id);
        return dept ? dept.department_name : "General";
    };

    const filteredUsers = users.filter(u =>
        u.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="users-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Accounts</h1>
                </div>
                <button className="primary-btn" onClick={() => { setSelectedUser(null); setShowModal(true); }}>
                    <FiUserPlus /><span>Add User</span>
                </button>
            </div>

            <div className="table-card">
                <div className="table-toolbar">
                    <div className="search-box">
                        <FiSearch className="search-icon-main" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User Details</th>
                                <th>Role</th>
                                <th>Position & Dept</th>
                                <th>Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center">Loading...</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="user-avatar-circle">
                                                <FiUser />
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{user.fullname}</span>
                                                <span className="user-email">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`role-badge ${`role-` + user.userlevel.replace(/\s+/g, '-').toLowerCase()}`}>
                                            {user.userlevel}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="dept-pos-cell">
                                            <span className="pos-text">{user.position}</span>
                                            <div className="dept-subtext">
                                                <FiLayers size={11} />
                                                <span>{getDeptName(user.department_id)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="status-container">
                                            <span className={`status-dot ${user.status.toLowerCase()}`}></span>
                                            <span className="status-text">{user.status}</span>
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <div className="actions-wrapper">
                                            <button className="icon-btn edit" title="Edit" onClick={() => { setSelectedUser(user); setShowModal(true); }}>
                                                <FiEdit2 />
                                            </button>
                                            {ownUser?.id !== user.id && (
                                                <button className="icon-btn delete" title="Delete" onClick={() => handleDelete(user)}>
                                                    <FiTrash2 />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserFormModal
                show={showModal}
                onClose={() => setShowModal(false)}
                user={selectedUser}
                departments={departments}
                onSuccess={fetchData}
            />
        </div>
    );
}