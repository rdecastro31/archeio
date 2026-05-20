import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

import Dashboard from './pages/Dashboard'
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

function App() {
  const [systemSettings, setSystemSettings] = useState({
    logo: logoImage, //default logo
    primaryColor: '#820d0d'
  });

  useEffect(() => {
    fetch(`${API_URL}/settings.php`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const newLogo = result.data.logo_url ? `${API_URL}/${result.data.logo_url}` : logoUrl;
          setSystemSettings({
            logo: newLogo,
            primaryColor: result.data.primary_color || '#820d0d'
          });

          // Apply the theme color globally to CSS variables
          // document.documentElement.style.setProperty('--primary-color', result.data.primary_color);
        }
      });
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
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App 