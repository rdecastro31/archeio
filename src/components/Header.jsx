import { FiMenu, FiSearch, FiBell, FiUser } from 'react-icons/fi'
import '../styles/header.css'

export default function Header({ onToggleSidebar, user }) {
  const username = user?.fullname
  const userlevel = user?.userlevel

  return (
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
        <div className="search-box">
          <FiSearch />
          <input type="text" placeholder="Search..." />
        </div>

        <button className="icon-btn">
          <FiBell />
        </button>

        <div className="profile-box">
          <div className="profile-avatar">
            <FiUser />
          </div>
          <div className="profile-text">
            <strong>{username}</strong>
            <span>{userlevel}</span>
          </div>
        </div>
      </div>
    </header>
  )
}