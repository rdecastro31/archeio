import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import Categories from './pages/Categories'
import Classification from './pages/Classification'
import Departments from './pages/Departments'
import Types from './pages/Types'
import Home from './pages/Home'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import Layout from './components/Layout'
import Workspace from './pages/Workspace'
import Storage from './pages/Storage'
import Users from './pages/Users'
import Settings from './pages/Settings'
import logoImage from './assets/archeiologo.png';
import { useEffect, useState } from 'react'
import { API_URL } from './shared/constants'
import Instructions from './pages/Instructions'
import Documents from './pages/Documents'
import Transactions from './pages/Transactions'
import DocumentStatuses from './pages/DocumentStatuses'
import Archive from './pages/Archive'
import AIDocumentChecker from './pages/AIDocumentChecker'
import AIDetection from './pages/AIDetection'
import PlagiarismChecker from './pages/PlagiarismChecker'
import Roles from './pages/Roles'
import StorageAuditLogs from './pages/StorageAuditLogs'

function App() {
  // Sync default state with your luxury gold theme tokens and default theme
  const [systemSettings, setSystemSettings] = useState({
    logo: logoImage,
    primaryColor: '#820d0d', // Matches var(--primary)
    theme: 'dark'            // Default theme fallback
  });

  useEffect(() => {
    fetch(`${API_URL}/settings.php`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          // Fallback values if database doesn't have them yet
          const fetchedColor = result.data.primary_color || '#d4af37';
          const newLogo = result.data.logo_url ? `${API_URL}/${result.data.logo_url}` : logoImage;
          const fetchedTheme = result.data.theme || 'dark';

          setSystemSettings({
            logo: newLogo,
            primaryColor: fetchedColor,
            theme: fetchedTheme
          });

          const root = document.documentElement;

          // Set the data-theme attribute on root element for CSS light/dark variables
          root.setAttribute('data-theme', fetchedTheme);

          // Dynamically overwrite layout.css variables with the DB values
          root.style.setProperty('--primary', fetchedColor);

          // Automatically derive hover, active, gradient, and focus tokens based on the DB color
          root.style.setProperty('--primary-hover', `color-mix(in srgb, ${fetchedColor} 85%, black)`);
          root.style.setProperty('--primary-active', `color-mix(in srgb, ${fetchedColor} 70%, black)`);
          root.style.setProperty('--focus-ring', `color-mix(in srgb, ${fetchedColor} 45%, transparent)`);

          root.style.setProperty(
            '--gradient-primary',
            `linear-gradient(135deg, color-mix(in srgb, ${fetchedColor} 80%, white) 0%, ${fetchedColor} 45%, color-mix(in srgb, ${fetchedColor} 70%, black) 100%)`
          );
        }
      })
      .catch(err => console.error("Error loading system settings:", err));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home logo={systemSettings.logo} />} />
        <Route path="/login" element={<Login logo={systemSettings.logo} />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout logo={systemSettings.logo} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin-dashboard" element={<DashboardAdmin />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/instructions" element={<Instructions />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/classification" element={<Classification />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/types" element={<Types />} />
            <Route path="/document_statuses" element={<DocumentStatuses />} />
            <Route path="/users" element={<Users />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ai-document-checker" element={<AIDocumentChecker />} />
            <Route path="/ai-detection" element={<AIDetection />} />
            <Route path="/plagiarism-checker" element={<PlagiarismChecker />} />
            <Route path="/storage-audit-logs" element={<StorageAuditLogs />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;