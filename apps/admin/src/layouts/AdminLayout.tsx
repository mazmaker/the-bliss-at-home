import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import {
  LayoutDashboard,
  Package,
  Users,
  Building,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'

const navigation = [
  { name: 'ภาพรวม', nameEn: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'จัดการบริการ', nameEn: 'Services', href: '/admin/services', icon: Package },
  { name: 'พนักงาน', nameEn: 'Staff', href: '/admin/staff', icon: Users },
  { name: 'ลูกค้า', nameEn: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'แจ้งเตือน SOS', nameEn: 'SOS Alerts', href: '/admin/sos-alerts', icon: ShieldAlert },
  { name: 'โรงแรม', nameEn: 'Hotels', href: '/admin/hotels', icon: Building },
  { name: 'การจอง', nameEn: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'รายงาน', nameEn: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'ตั้งค่า', nameEn: 'Settings', href: '/admin/settings', icon: Settings },
]

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user, isLoading } = useAdminAuth()

  // Handle logout
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      // Navigate immediately for instant feedback
      navigate('/admin/login', { replace: true })
      // Then clean up auth state
      await logout()
    } catch (error) {
      console.error("Logout failed", error)
      // Still navigate even if logout fails
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-stone-200 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200">
            <div>
              <h1 className="text-xl font-bold text-stone-900">The Bliss at Home</h1>
              <p className="text-xs text-stone-500">Admin Panel</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-stone-200">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">
                  {user?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-stone-500">
                  {user?.email || 'admin@theblissathome.com'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-stone-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  className="pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-stone-100 rounded-lg transition">
                <Bell className="w-5 h-5 text-stone-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {isLoading ? 'กำลังออก...' : 'ออกจากระบบ'}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout