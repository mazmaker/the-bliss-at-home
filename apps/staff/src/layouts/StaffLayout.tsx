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
import { NotificationPanel, type Notification } from '../components'

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
  const [showNotifications, setShowNotifications] = useState(false)

  // Mock notifications - replace with actual data from database later
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'new_job',
      title: 'งานใหม่เข้ามา!',
      message: 'คุณมีงาน "นวดแผนไทย 2 ชั่วโมง" ที่ Grande Centre Point Terminal 21',
      read: false,
      created_at: new Date(Date.now() - 10 * 60000).toISOString(), // 10 minutes ago
    },
    {
      id: '2',
      type: 'payment_received',
      title: 'รับเงินเรียบร้อย',
      message: 'คุณได้รับเงิน ฿770 จากงาน "นวดน้ำมันหอมระเหย" พร้อมทิป ฿100',
      read: false,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    },
    {
      id: '3',
      type: 'job_updated',
      title: 'งานได้รับการอัพเดท',
      message: 'งาน "นวดหินร้อน" เวลาเปลี่ยนเป็น 20:00 น.',
      read: true,
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    },
  ])

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = async () => {
    // Close modal first
    setShowLogoutConfirm(false)

    try {
      // Check if user logged in via LIFF
      const loggedInViaLiff = localStorage.getItem('staff_logged_in_via_liff') === 'true'

      if (loggedInViaLiff) {
        console.log('[Logout] User logged in via LIFF, initializing LIFF for logout...')

        // Get LIFF ID from environment
        const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

        if (LIFF_ID) {
          // Initialize LIFF if not already initialized
          if (!liffService.isInitialized()) {
            await liffService.initialize(LIFF_ID)
          }

          // Logout from LIFF
          if (liffService.isLoggedIn()) {
            console.log('[Logout] Logging out from LIFF...')
            liffService.logout()
            // Wait for LIFF logout to complete
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        // Clear the flag
        localStorage.removeItem('staff_logged_in_via_liff')
      }
    } catch (error) {
      console.error('LIFF logout error:', error)
    }

    try {
      // Then logout from Supabase
      console.log('[Logout] Logging out from Supabase...')
      await logout()
    } catch (error) {
      console.error('Supabase logout error:', error)
    }

    // Force full page reload to login page (clears all state)
    console.log('[Logout] Redirecting to login page...')
    window.location.href = '/staff/login'
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
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">The Bliss at Home</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNotifications(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition relative"
              title="การแจ้งเตือน"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

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
