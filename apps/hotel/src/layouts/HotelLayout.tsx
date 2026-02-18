import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
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
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { useHotelContext } from '../hooks/useHotelContext'
import { useAuth } from '@bliss/supabase/auth'

function HotelLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { hotelId, hotelSlug, hotelData, isValidHotel, isLoading, getHotelName, getHotelNameEn, getHotelSlug } = useHotelContext()
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      // The app will automatically redirect to login due to ProtectedRoute
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดข้อมูลโรงแรม...</p>
        </div>
      </div>
    )
  }

  // Invalid hotel ID
  if (!isValidHotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-900 mb-2">โรงแรมไม่พบ</h1>
          <p className="text-stone-600 mb-6">
            ไม่พบข้อมูลโรงแรมที่ระบุ: {hotelSlug}
          </p>
          <Link
            to="/hotel/resort-chiang-mai"
            className="inline-flex items-center px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition"
          >
            ไปยังโรงแรมเริ่มต้น
          </Link>
        </div>
      </div>
    )
  }

  // ✅ Dynamic navigation with hotel slug
  const currentSlug = getHotelSlug()
  const navigation = [
    { name: 'ภาพรวม', nameEn: 'Dashboard', href: `/hotel/${currentSlug}`, icon: LayoutDashboard },
    { name: 'บริการ', nameEn: 'Services', href: `/hotel/${currentSlug}/services`, icon: Calendar },
    { name: 'ประวัติการจอง', nameEn: 'Booking History', href: `/hotel/${currentSlug}/history`, icon: FileText },
    { name: 'บิลรายเดือน', nameEn: 'Monthly Bill', href: `/hotel/${currentSlug}/bill`, icon: CreditCard },
    { name: 'ข้อมูลโรงแรม', nameEn: 'Hotel Profile', href: `/hotel/${currentSlug}/profile`, icon: Building },
    { name: 'ตั้งค่า', nameEn: 'Settings', href: `/hotel/${currentSlug}/settings`, icon: Settings },
  ]

  // ✅ Get hotel avatar (first letter of Thai name)
  const hotelAvatar = getHotelName().charAt(0) || 'H'

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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl border-r border-stone-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-stone-200">
            <div>
              <h1 className="text-xl font-bold text-stone-900">{getHotelName()}</h1>
              <p className="text-xs text-stone-500">{getHotelNameEn()}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-stone-500 hover:text-stone-700"
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
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
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
          <div className="p-4 border-t border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                {hotelAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{getHotelName()}</p>
                <p className="text-xs text-stone-500 truncate">{getHotelNameEn()}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition w-full"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">ออกจากระบบ</span>
            </button>
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
                <p className="text-sm font-medium text-stone-900">{getHotelName()}</p>
                <p className="text-xs text-stone-500">{getHotelNameEn()}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                {hotelAvatar}
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
