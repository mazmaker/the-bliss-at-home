import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { useAdminAuth } from './hooks/useAdminAuth'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Staff from './pages/Staff'
import Customers from './pages/Customers'
import Hotels from './pages/Hotels'
import Bookings from './pages/Bookings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { AdminLoginPage } from './pages/auth'

function App() {
  const { isLoading, isAuthenticated } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login route */}
      <Route
        path="/admin/login"
        element={
          isAuthenticated ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLoginPage />
          )
        }
      />

      {/* Protected admin routes */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute
            redirectTo="/admin/login"
          >
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="staff" element={<Staff />} />
        <Route path="customers" element={<Customers />} />
        <Route path="hotels" element={<Hotels />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
