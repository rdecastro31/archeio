import { useState, useEffect } from 'react'
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom'
import Pusher from 'pusher-js'
import Swal from 'sweetalert2'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'
import '../styles/layout.css'
import { PUSH_KEY } from '../shared/constants'

// Base Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: true, // 1. Set to true to show the action button
  confirmButtonText: 'View', // Text inside the button
  confirmButtonColor: 'var(--primary)', // Theme gold color
  timer: 5000,
  timerProgressBar: true,
  background: 'var(--card)',
  color: 'var(--text-primary)',
  iconColor: 'var(--primary)',
  customClass: {
    popup: 'custom-gold-toast',
    confirmButton: 'custom-toast-btn',
    timerProgressBar: 'custom-toast-progress'
  }
});

export default function Layout({ logo }) {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const baseUrl = import.meta.env.BASE_URL || "/";

  useEffect(() => {
    if (!user?.id) return;

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const pusher = new Pusher(PUSH_KEY, {
      cluster: 'ap1',
    });

    const channel = pusher.subscribe(`archeio-user-${user.id}`);

    channel.bind('new-transaction', (data) => {
      console.log('Real-time notification received:', data);

      // Update state
      setNotifications((prev) => [data, ...prev]);

      // 🚀 Fire Custom Toast with direct Click Event
      Toast.fire({
        icon: 'info',
        title: 'New Transaction Received',
        text: data.message,
        didOpen: (toast) => {
          // Pause/resume timer on hover
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);

          // ⚡ Direct event listener: clicking ANYWHERE on the toast redirects and closes it
          toast.addEventListener('click', () => {
            Swal.close();              // Close the toast
            navigate('/transactions');  // Navigate to transactions page
          });
        }
      });

      // Desktop OS Notification fallback (Clickable)
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const desktopNote = new Notification("New Document Transaction", {
          body: data.message,
        });

        desktopNote.onclick = () => {
          window.focus();
          navigate('/transactions');
        };
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`archeio-user-${user.id}`);
      pusher.disconnect();
    };
  }, [user?.id, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = baseUrl
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} logo={logo} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <div className="main-section">
        <Header
          onToggleSidebar={toggleSidebar}
          user={user}
          onLogout={handleLogout}
          notifications={notifications}
        />

        <main className="page-content">
          <Outlet context={{ user, notifications }} />
        </main>

        <Footer />
      </div>
    </div>
  )
}