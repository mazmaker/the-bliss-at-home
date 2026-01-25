import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { liffService } from '@bliss/supabase/auth'

const navigation = [
  { name: 'วันนี้', nameEn: 'Today', href: '/staff', icon: Calendar },
  { name: 'ตารางงาน', nameEn: 'Schedule', href: '/staff/schedule', icon: Clock },
  { name: 'รายได้', nameEn: 'Earnings', href: '/staff/earnings', icon: DollarSign },
  { name: 'โปรไฟล์', nameEn: 'Profile', href: '/staff/profile', icon: User },
  { name: 'ตั้งค่า', nameEn: 'Settings', href: '/staff/settings', icon: Settings },
]

function StaffLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    // Close modal first
    setShowLogoutConfirm(false)

    try {
      // Logout from Supabase
      await logout()
    } catch (error) {
      console.error('Supabase logout error:', error)
    }

    try {
      // Also logout from LIFF if initialized
      if (liffService.isInitialized()) {
        liffService.logout()
      }
    } catch (error) {
      console.error('LIFF logout error:', error)
    }

    // Navigate to login page (always navigate even if logout fails)
    navigate('/staff/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ออกจากระบบ</h3>
              <p className="text-sm text-gray-500 mb-6">
                คุณต้องการออกจากระบบใช่หรือไม่?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-amber-800 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'Profile'}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-base font-bold">{user?.full_name || 'Bliss Provider'}</h1>
              <p className="text-xs opacity-90">พนักงานให้บริการ</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-white/10 rounded-lg transition">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition min-w-0 ${
                  isActive ? 'text-amber-700' : 'text-stone-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-amber-700' : ''}`} />
                <span className="text-xs font-medium truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default StaffLayout
