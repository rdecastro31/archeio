import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Parse the user data so it's ready for child components
  const user = userData ? JSON.parse(userData) : null;

  // Passing 'user' through context makes it available via useOutletContext()
  return <Outlet context={{ user }} />;
}