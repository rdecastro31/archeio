import { useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'
import '../styles/layout.css'

export default function Layout({ logo }) {
  const { user } = useOutletContext();
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} logo={logo} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <div className="main-section">
        <Header onToggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />

        <main className="page-content">
          <Outlet context={{ user }} />
        </main>

        <Footer />
      </div>
    </div>
  )
}