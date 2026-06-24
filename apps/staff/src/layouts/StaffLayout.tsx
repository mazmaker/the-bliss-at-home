import { useState, useMemo, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Clock,
  Wallet,
  User,
  Settings,
  LogOut,
  Bell,
  Navigation,
  Power,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@bliss/supabase/auth'
import { liffService } from '@bliss/supabase/auth'
import { useStaffNotifications } from '@bliss/supabase/notifications'
import { getAvailability, updateAvailability } from '@bliss/supabase'
import { NotificationPanel, ConfirmDialog, type Notification } from '../components'

const navigation = [
  { name: 'หน้าแรก', nameEn: 'Home', href: '/staff', icon: Home },
  { name: 'ติดตาม GPS', nameEn: 'GPS Tracking', href: '/staff/tracking', icon: Navigation },
  { name: 'ตารางงาน', nameEn: 'Schedule', href: '/staff/schedule', icon: Clock },
  { name: 'รายได้', nameEn: 'Earnings', href: '/staff/earnings', icon: Wallet },
  { name: 'โปรไฟล์', nameEn: 'Profile', href: '/staff/profile', icon: User },
  { name: 'ตั้งค่า', nameEn: 'Settings', href: '/staff/settings', icon: Settings },
]

function StaffLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [showAvailabilityConfirm, setShowAvailabilityConfirm] = useState(false)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  // Clean up deep link redirect after successfully reaching a protected page.
  // This is the ONLY place where staff_redirect_after_login should be removed
  // (not in App.tsx IIFE or Login.tsx auto-login, because liff.init() may cause
  // intermediate redirects that lose the value).
  useEffect(() => {
    localStorage.removeItem('staff_redirect_after_login')
  }, [])

  // Load current availability (พร้อมรับงาน) for the header toggle. useAuth().user
  // is a profiles row and does NOT carry is_available, so fetch it from the staff
  // table by profile_id (user.id).
  useEffect(() => {
    if (!user?.id) return
    let active = true
    getAvailability(user.id)
      .then((value) => { if (active) setIsAvailable(value) })
      .catch(() => { /* keep default; the toggle surfaces write errors via toast */ })
    return () => { active = false }
  }, [user?.id])

  const {
    notifications: dbNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useStaffNotifications()

  // Map DB notifications to NotificationPanel format
  const validTypes = ['new_job', 'job_cancelled', 'job_updated', 'payment_received', 'job_no_staff', 'job_accepted', 'new_review'] as const
  const notifications: Notification[] = useMemo(() =>
    dbNotifications.map((n) => ({
      id: n.id,
      type: (validTypes.includes(n.type as any) ? n.type : 'new_job') as Notification['type'],
      title: n.title,
      message: n.message,
      read: n.is_read ?? false,
      created_at: n.created_at || new Date().toISOString(),
      data: n.data as Record<string, any> | undefined,
    })),
    [dbNotifications]
  )

  const handleToggleAvailability = async () => {
    if (!user?.id) return
    const next = !isAvailable
    setAvailabilitySaving(true)
    try {
      const saved = await updateAvailability(user.id, next)
      setIsAvailable(saved)
      setShowAvailabilityConfirm(false)
      toast.success(
        saved
          ? 'กลับมาพร้อมรับงานแล้ว ✓ คุณจะได้รับงานใหม่อีกครั้ง'
          : 'หยุดรับงานแล้ว — จะไม่ได้รับงานใหม่ชั่วคราว (งานที่รับไว้แล้วยังต้องทำตามปกติ)'
      )
    } catch (error) {
      console.error('[Availability] toggle failed:', error)
      toast.error('ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่')
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const handleLogout = async () => {
    // Close modal first
    setShowLogoutConfirm(false)

    // Set flags BEFORE logout to prevent Login page from auto-login
    localStorage.setItem('staff_just_logged_out', 'true')
    // Set skip timestamp in localStorage (survives new LINE in-app browser contexts, 2 min TTL)
    localStorage.setItem('staff_skip_auto_login_until', String(Date.now() + 120_000))
    // Clear deep link redirect — user explicitly logged out, don't auto-redirect back
    localStorage.removeItem('staff_redirect_after_login')

    try {
      // Logout from Supabase first (invalidate session)
      console.log('[Logout] Logging out from Supabase...')
      await logout()
    } catch (error) {
      console.error('Supabase logout error:', error)
    }

    // Clear session data
    localStorage.removeItem('bliss-customer-auth')
    // Don't call liff.logout() — it forces LIFF SDK to re-authenticate on next
    // LIFF URL open, which loses liff.state (deep link path). Auto-login guards
    // prevent unwanted auto-re-login without needing to destroy the LIFF session.
    localStorage.removeItem('staff_logged_in_via_liff')

    // Force full page reload to login page (clears all state)
    console.log('[Logout] Redirecting to login page...')
    window.location.href = '/staff/login'
  }

  return (
    <div className="min-h-screen bg-bliss-50 pb-20">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-bliss-900 mb-2">ออกจากระบบ</h3>
              <p className="text-sm text-bliss-500 mb-6">
                คุณต้องการออกจากระบบใช่หรือไม่?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-bliss-300 rounded-xl text-bliss-700 font-medium hover:bg-bliss-50 transition"
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

      {/* Availability Confirmation Modal (พร้อมรับงาน / หยุดรับงาน) */}
      <ConfirmDialog
        isOpen={showAvailabilityConfirm}
        variant={isAvailable ? 'danger' : 'primary'}
        icon={<Power className="w-6 h-6" />}
        title={isAvailable ? 'หยุดรับงาน?' : 'กลับมาพร้อมรับงาน?'}
        message={
          isAvailable
            ? 'คุณจะไม่ได้รับงานใหม่จนกว่าจะกลับมาเปิด "พร้อมรับงาน" (งานที่รับไว้แล้วยังต้องทำตามปกติ)'
            : 'คุณจะเริ่มได้รับงานใหม่อีกครั้ง'
        }
        confirmText={isAvailable ? 'หยุดรับงาน' : 'พร้อมรับงาน'}
        isLoading={availabilitySaving}
        onConfirm={handleToggleAvailability}
        onCancel={() => setShowAvailabilityConfirm(false)}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-bliss-700 to-bliss-800 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/logo.jpg"
              alt="The Bliss Massage at Home"
              className="h-12 w-12 object-contain rounded-full bg-white/95 p-0.5 shadow-sm flex-shrink-0"
            />
            <span className="text-xs font-semibold leading-tight">The Bliss Massage<br />at Home</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAvailabilityConfirm(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isAvailable
                  ? 'bg-green-500/90 text-white hover:bg-green-500'
                  : 'bg-white/15 text-bliss-100 hover:bg-white/25'
              }`}
              title={
                isAvailable
                  ? 'กำลังพร้อมรับงาน — แตะเพื่อหยุดรับงาน'
                  : 'กำลังหยุดรับงาน — แตะเพื่อกลับมาพร้อมรับงาน'
              }
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white' : 'bg-bliss-300'}`} />
              {isAvailable ? 'พร้อมรับงาน' : 'หยุดรับงาน'}
            </button>
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
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Main content */}
      <main className="px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-bliss-200 z-50">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition min-w-0 ${
                  isActive ? 'text-bliss-700' : 'text-bliss-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-bliss-700' : ''}`} />
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
