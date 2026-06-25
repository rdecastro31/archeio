import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiUsers,
  FiSettings,
  FiFileText,
  FiServer,
  FiPaperclip,
  FiDatabase,
  FiFolder,
  FiTag,
  FiLayers,
  FiChevronDown,
  FiArchive,
  FiCheckSquare,
  FiHome,
  FiMapPin,
  FiCheckCircle,
} from "react-icons/fi";

import "../styles/sidebar.css";
import archeioLogo from "../assets/archeiologo.png";

export default function Sidebar({ isOpen, onClose, logo }) {
  const [masterOpen, setMasterOpen] = useState(false);

  const currentLogo = logo || archeioLogo;
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const userlevel = user?.userlevel || "";
  const roleName = user?.role_name || userlevel || "";
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const isSuperAdmin =
    roleName === "Super Admin" ||
    roleName === "SuperAdmin" ||
    userlevel === "Super Admin";

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const canAccessMasterData =
    isSuperAdmin || hasPermission("MasterData.View");

  const canManageUsers =
    isSuperAdmin ||
    hasPermission("Users.Manage") ||
    hasPermission("Users.View");

  const canManageRoles =
    isSuperAdmin ||
    hasPermission("Roles.Manage") ||
    hasPermission("Roles.View");

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-top">
        {currentLogo ? (
          <img
            src={currentLogo}
            alt="Company Logo"
            className="brand-logo-large"
          />
        ) : (
          <div className="brand-logo-fallback">D</div>
        )}
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        {isSuperAdmin && (
          <NavLink to="/admin-dashboard" className="nav-item" onClick={onClose}>
            <FiGrid />
            <span>Admin Dashboard</span>
          </NavLink>
        )}

        <NavLink to="/dashboard" className="nav-item" onClick={onClose}>
          <FiGrid />
          <span>{isSuperAdmin ? "Document Dashboard" : "Dashboard"}</span>
        </NavLink>

        <NavLink to="/workspace" className="nav-item" onClick={onClose}>
          <FiFileText />
          <span>Drive</span>
        </NavLink>

        <NavLink to="/documents" className="nav-item" onClick={onClose}>
          <FiServer />
          <span>Workspace</span>
        </NavLink>

        <NavLink to="/transactions" className="nav-item" onClick={onClose}>
          <FiPaperclip />
          <span>Workflow</span>
        </NavLink>

        <NavLink to="/archive" className="nav-item" onClick={onClose}>
          <FiArchive />
          <span>Archive</span>
        </NavLink>

        <NavLink
          to="/ai-document-checker"
          className="nav-item"
          onClick={onClose}
        >
          <FiCheckSquare />
          <span>Document Checker</span>
        </NavLink>

        {canAccessMasterData && (
          <div className="nav-group">
            <button
              type="button"
              className={`nav-item nav-parent ${masterOpen ? "nav-parent-open" : ""
                }`}
              onClick={() => setMasterOpen((prev) => !prev)}
            >
              <FiDatabase />
              <span>Master Data</span>
              <FiChevronDown className="nav-chevron" />
            </button>

            {masterOpen && (
              <div className="nav-submenu">
                <NavLink
                  to="/categories"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiFolder />
                  <span>Categories</span>
                </NavLink>

                <NavLink
                  to="/classification"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiLayers />
                  <span>Classification</span>
                </NavLink>

                <NavLink
                  to="/types"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiTag />
                  <span>Types</span>
                </NavLink>

                <NavLink
                  to="/document_statuses"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiCheckCircle />
                  <span>Statuses</span>
                </NavLink>

                <NavLink
                  to="/departments"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiHome />
                  <span>Departments</span>
                </NavLink>

                <NavLink
                  to="/instructions"
                  className="nav-subitem"
                  onClick={onClose}
                >
                  <FiMapPin />
                  <span>Instructions</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {canManageUsers && (
          <NavLink to="/users" className="nav-item" onClick={onClose}>
            <FiUsers />
            <span>Users</span>
          </NavLink>
        )}

        {canManageRoles && (
          <NavLink to="/roles" className="nav-item" onClick={onClose}>
            <FiUsers />
            <span>Roles</span>
          </NavLink>
        )}

        <NavLink to="/settings" className="nav-item" onClick={onClose}>
          <FiSettings />
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
}