import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  FiGrid,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiFileText,
  FiShield,
  FiLogOut,
  FiServer,
  FiPaperclip,
  FiDatabase,
  FiFolder,
  FiTag,
  FiLayers,
  FiChevronDown,
  FiBriefcase
} from 'react-icons/fi'
import '../styles/sidebar.css'
import archeioLogo from '../assets/archeiologo.png'

export default function Sidebar({ isOpen, onClose, logo }) {
  const [masterOpen, setMasterOpen] = useState(false)
  const currentLogo = logo || archeioLogo

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userlevel = user?.userlevel

  const canAccessMasterData =
    userlevel === 'Super Admin' ||
    userlevel === 'Administrator' ||
    userlevel === 'Admin'

  const canAccessUsers = userlevel === 'Super Admin'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        {currentLogo ? (
          <img src={currentLogo} alt="Company Logo" className="brand-logo-large" />
        ) : (
          <div className="brand-logo-fallback">D</div>
        )}
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="nav-item" onClick={onClose}>
          <FiGrid />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/workspace" className="nav-item" onClick={onClose}>
          <FiServer />
          <span>Workspace</span>
        </NavLink>

        <NavLink to="/documents" className="nav-item" onClick={onClose}>
          <FiFileText />
          <span>Documents</span>
        </NavLink>

        <NavLink to="/transactions" className="nav-item" onClick={onClose}>
          <FiPaperclip />
          <span>Transactions</span>
        </NavLink>

        <NavLink to="/storage" className="nav-item" onClick={onClose}>
          <FiFolder />
          <span>Storage</span>
        </NavLink>

        <div className="nav-group">
          <button
            type="button"
            className={`nav-item nav-parent ${masterOpen ? 'nav-parent-open' : ''}`}
            onClick={() => setMasterOpen((prev) => !prev)}
          >
            <FiDatabase />
            <span>Master Data</span>
            <FiChevronDown className="nav-chevron" />
          </button>

          {masterOpen && (
            <div className="nav-submenu">
              <NavLink to="/categories" className="nav-subitem" onClick={onClose}>
                <FiFolder />
                <span>Categories</span>
              </NavLink>

              <NavLink to="/types" className="nav-subitem" onClick={onClose}>
                <FiTag />
                <span>Types</span>
              </NavLink>

              <NavLink to="/classification" className="nav-subitem" onClick={onClose}>
                <FiLayers />
                <span>Classification</span>
              </NavLink>

              <NavLink to="/departments" className="nav-subitem" onClick={onClose}>
                <FiBriefcase />
                <span>Departments</span>
              </NavLink>

              <NavLink to="/instructions" className="nav-subitem" onClick={onClose}>
                <FiBriefcase />
                <span>Instructions</span>
              </NavLink>
            </div>
          )}
        </div>

        {canAccessUsers && (
          <NavLink to="/users" className="nav-item" onClick={onClose}>
            <FiUsers />
            <span>Users</span>
          </NavLink>
        )}

        <NavLink to="/reports" className="nav-item" onClick={onClose}>
          <FiBarChart2 />
          <span>Reports</span>
        </NavLink>

        <NavLink to="/security" className="nav-item" onClick={onClose}>
          <FiShield />
          <span>Security</span>
        </NavLink>

        <NavLink to="/settings" className="nav-item" onClick={onClose}>
          <FiSettings />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-divider" />

      <div className="sidebar-bottom">
        <button className="logout-btn" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}