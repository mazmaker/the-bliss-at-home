import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Users,
  FileText,
  Building,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'ภาพรวม', nameEn: 'Dashboard', href: '/hotel', icon: LayoutDashboard },
  { name: 'บริการ', nameEn: 'Services', href: '/hotel/services', icon: Calendar },
  { name: 'จองให้แขก', nameEn: 'Book for Guest', href: '/hotel/book', icon: CreditCard },
  { name: 'การจองของแขก', nameEn: 'Guest Bookings', href: '/hotel/guests', icon: Users },
  { name: 'ประวัติการจอง', nameEn: 'History', href: '/hotel/history', icon: FileText },
  { name: 'บิลรายเดือน', nameEn: 'Monthly Bill', href: '/hotel/bill', icon: CreditCard },
  { name: 'ข้อมูลโรงแรม', nameEn: 'Hotel Profile', href: '/hotel/profile', icon: Building },
  { name: 'ตั้งค่า', nameEn: 'Settings', href: '/hotel/settings', icon: Settings },
]

function HotelLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-stone-900 to-stone-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-stone-700">
            <div>
              <h1 className="text-xl font-bold text-white">Bliss Hotel</h1>
              <p className="text-xs text-stone-400">Hotel Partner Portal</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs opacity-70">{item.nameEn}</p>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-stone-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                ฮ
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">โรงแรมฮิลตัน</p>
                <p className="text-xs text-stone-400 truncate">Hilton Bangkok</p>
              </div>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">ออกจากระบบ</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-stone-900">โรงแรมฮิลตัน อยุธยา</p>
                <p className="text-xs text-stone-500">Hilton Bangkok</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                ฮ
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default HotelLayout
