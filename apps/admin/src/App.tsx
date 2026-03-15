import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminProtectedRoute } from './components/AdminProtectedRoute'
import { useAdminAuth } from './hooks/useAdminAuth'
import { SessionDebugger } from './components/SessionDebugger'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Staff from './pages/Staff'
import StaffDetail from './pages/StaffDetail'
import Customers from './pages/Customers'
import SOSAlerts from './pages/SOSAlerts'
import Hotels from './pages/Hotels'
import HotelDetail from './pages/HotelDetail'
import HotelBilling from './pages/HotelBilling'
import HotelPayments from './pages/HotelPayments'
import HotelBookings from './pages/HotelBookings'
import Bookings from './pages/Bookings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Promotions from './pages/Promotions'
import Reviews from './pages/Reviews'
import { AdminLoginPage } from './pages/auth'

function App() {
  const { isLoading, isAuthenticated, error } = useAdminAuth()

  // Show loading screen when initializing authentication
  const showLoadingScreen = isLoading

  if (showLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังเชื่อมต่อระบบ...</p>
        </div>
      </div>
    )
  }

  // Show error with refresh button if auth initialization failed
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-2 -ml-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                รีเฟรชหน้าเว็บ
              </button>
              <a
                href="https://app.supabase.com/projects"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ตรวจสอบ Supabase
              </a>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-left">
              <p className="font-medium mb-1">วิธีแก้ไขเบื้องต้น:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</li>
                <li>ลองรีเฟรชหน้าเว็บอีกครั้ง</li>
                <li>ตรวจสอบว่า Supabase project ยังทำงานอยู่</li>
                <li>ถ้ายังไม่ได้ ติดต่อผู้ดูแลระบบ</li>
              </ul>
            </div>
          </div>
        </div>
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

      {/* Protected admin routes - require ADMIN role */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute redirectTo="/admin/login">
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="staff" element={<Staff />} />
        <Route path="staff/:id" element={<StaffDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sos-alerts" element={<SOSAlerts />} />
        <Route path="hotels" element={<Hotels />} />
        <Route path="hotels/:id" element={<HotelDetail />} />
        <Route path="hotels/:id/billing" element={<HotelBilling />} />
        <Route path="hotels/:id/payments" element={<HotelPayments />} />
        <Route path="hotels/:id/bookings" element={<HotelBookings />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="*" element={<Dashboard />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
