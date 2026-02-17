import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useSOSNotifications } from '../hooks/useSOSNotifications'
import { useBookingNotifications } from '../hooks/useBookingNotifications'
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
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  ArrowRight,
  TrendingUp,
  CalendarCheck,
  CheckCheck,
} from 'lucide-react'

const navigation = [
  { name: 'ภาพรวม', nameEn: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'จัดการบริการ', nameEn: 'Services', href: '/admin/services', icon: Package },
  { name: 'พนักงาน', nameEn: 'Staff', href: '/admin/staff', icon: Users },
  { name: 'ลูกค้า', nameEn: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'แจ้งเตือน SOS', nameEn: 'SOS Alerts', href: '/admin/sos-alerts', icon: ShieldAlert },
  { name: 'โรงแรม', nameEn: 'Hotels', href: '/admin/hotels', icon: Building },
  { name: 'การจอง', nameEn: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'โปรโมชั่น', nameEn: 'Promotions', href: '/admin/promotions', icon: TrendingUp },
  { name: 'รายงาน', nameEn: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'ตั้งค้า', nameEn: 'Settings', href: '/admin/settings', icon: Settings },
]

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [bookingNotifOpen, setBookingNotifOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const bookingNotifRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user, isLoading } = useAdminAuth()
  const {
    pendingCount,
    pendingAlerts,
    hasCriticalAlerts,
    soundEnabled,
    audioContextReady,
    toggleSound,
    enableAudio
  } = useSOSNotifications()
  const {
    notifications: bookingNotifications,
    unreadCount: bookingUnreadCount,
    markAsRead: markBookingAsRead,
    markAllAsRead: markAllBookingAsRead,
  } = useBookingNotifications()

  // Handle click outside notification dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
      if (bookingNotifRef.current && !bookingNotifRef.current.contains(event.target as Node)) {
        setBookingNotifOpen(false)
      }
    }

    if (notificationOpen || bookingNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationOpen, bookingNotifOpen])

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

  // Get time ago helper
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} วินาทีที่แล้ว`
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} วันที่แล้ว`
  }

  // Get top 5 most recent alerts
  const topAlerts = pendingAlerts
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 5)

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
              <h1 className="text-xl font-bold text-stone-900">The Bliss Massage at Home</h1>
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
                const isSOSMenu = item.href === '/admin/sos-alerts'
                const showBadge = isSOSMenu && pendingCount > 0

                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                          : 'text-stone-600 hover:bg-stone-100'
                      } ${showBadge && hasCriticalAlerts ? 'animate-pulse' : ''}`}
                    >
                      <Icon className={`w-5 h-5 ${showBadge ? 'animate-bounce' : ''}`} />
                      <span className="font-medium">{item.name}</span>

                      {/* SOS Badge */}
                      {showBadge && (
                        <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                          hasCriticalAlerts
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-red-500 text-white'
                        }`}>
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}

                      {isActive && !showBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Sound Control */}
            {pendingCount > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-2 w-full text-sm font-medium text-red-800 hover:text-red-900"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>เสียงแจ้งเตือน: เปิด</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>เสียงแจ้งเตือน: ปิด</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-stone-200">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {user?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-stone-500 truncate">
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
              {/* Booking Notification Dropdown */}
              <div className="relative" ref={bookingNotifRef}>
                <button
                  onClick={() => { setBookingNotifOpen(!bookingNotifOpen); setNotificationOpen(false) }}
                  className="relative p-2 hover:bg-stone-100 rounded-lg transition"
                >
                  <CalendarCheck className={`w-5 h-5 ${
                    bookingUnreadCount > 0 ? 'text-amber-600' : 'text-stone-600'
                  }`} />
                  {bookingUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-amber-600 rounded-full">
                      {bookingUnreadCount > 99 ? '99+' : bookingUnreadCount}
                    </span>
                  )}
                </button>

                {bookingNotifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white">การจองใหม่</h3>
                          <p className="text-xs text-white/90">New Bookings</p>
                        </div>
                        {bookingUnreadCount > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={markAllBookingAsRead}
                              className="text-xs text-white/80 hover:text-white flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              อ่านทั้งหมด
                            </button>
                            <div className="text-2xl font-bold text-white">{bookingUnreadCount}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {bookingNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                          <p className="text-stone-500 font-medium">ไม่มีการแจ้งเตือน</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-stone-100">
                          {bookingNotifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 hover:bg-stone-50 cursor-pointer transition ${
                                !notif.is_read ? 'bg-amber-50/50 border-l-4 border-l-amber-500' : ''
                              }`}
                              onClick={() => {
                                if (!notif.is_read) markBookingAsRead(notif.id)
                                navigate('/admin/bookings')
                                setBookingNotifOpen(false)
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">📋</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className={`font-semibold truncate ${
                                      !notif.is_read ? 'text-stone-900' : 'text-stone-600'
                                    }`}>
                                      {notif.title}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-stone-500 whitespace-nowrap">
                                      <Clock className="w-3 h-3" />
                                      <span>{getTimeAgo(notif.created_at)}</span>
                                    </div>
                                  </div>
                                  <p className={`text-sm line-clamp-2 ${
                                    !notif.is_read ? 'text-stone-700' : 'text-stone-500'
                                  }`}>
                                    {notif.message}
                                  </p>
                                  {notif.data?.booking_number && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      เลขที่จอง: {notif.data.booking_number}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {bookingNotifications.length > 0 && (
                      <div className="p-3 bg-stone-50 border-t border-stone-200">
                        <Link
                          to="/admin/bookings"
                          onClick={() => setBookingNotifOpen(false)}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl font-semibold text-white transition"
                        >
                          <span>ดูการจองทั้งหมด</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SOS Notification Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => { setNotificationOpen(!notificationOpen); setBookingNotifOpen(false) }}
                  className={`relative p-2 hover:bg-stone-100 rounded-lg transition ${
                    pendingCount > 0 && hasCriticalAlerts ? 'animate-pulse' : ''
                  }`}
                >
                  <Bell className={`w-5 h-5 ${
                    pendingCount > 0 ? 'text-red-600' : 'text-stone-600'
                  }`} />
                  {pendingCount > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white rounded-full ${
                      hasCriticalAlerts ? 'bg-red-600 animate-pulse' : 'bg-red-500'
                    }`}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className={`p-4 ${
                      pendingCount > 0 && hasCriticalAlerts
                        ? 'bg-gradient-to-r from-red-600 to-red-700'
                        : pendingCount > 0
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700'
                        : 'bg-gradient-to-r from-stone-600 to-stone-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white">การแจ้งเตือนฉุกเฉิน SOS</h3>
                          <p className="text-xs text-white/90">Emergency Alerts</p>
                        </div>
                        {pendingCount > 0 && (
                          <div className="text-2xl font-bold text-white">{pendingCount}</div>
                        )}
                      </div>
                    </div>

                    {/* Alerts List */}
                    <div className="max-h-96 overflow-y-auto">
                      {pendingCount === 0 ? (
                        <div className="p-8 text-center">
                          <ShieldAlert className="w-12 h-12 text-green-500 mx-auto mb-3" />
                          <p className="text-green-600 font-medium">ไม่มีการแจ้งเตือนฉุกเฉิน</p>
                          <p className="text-sm text-stone-500 mt-1">ระบบทำงานปกติ</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-stone-100">
                          {topAlerts.map((alert) => {
                            const priorityColors = {
                              critical: 'bg-red-50 border-l-4 border-l-red-600',
                              high: 'bg-orange-50 border-l-4 border-l-orange-500',
                              medium: 'bg-yellow-50 border-l-4 border-l-yellow-500',
                              low: 'bg-blue-50 border-l-4 border-l-blue-500',
                            }

                            const priorityIcons = {
                              critical: '🚨',
                              high: '⚠️',
                              medium: '⚡',
                              low: 'ℹ️',
                            }

                            return (
                              <div
                                key={alert.id}
                                className={`p-4 hover:bg-stone-50 cursor-pointer transition ${priorityColors[alert.priority]}`}
                                onClick={() => {
                                  navigate('/admin/sos-alerts')
                                  setNotificationOpen(false)
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">{priorityIcons[alert.priority]}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="font-semibold text-stone-900 truncate">
                                        {alert.source_name || 'Unknown'}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-stone-500 whitespace-nowrap">
                                        <Clock className="w-3 h-3" />
                                        <span>{getTimeAgo(alert.created_at)}</span>
                                      </div>
                                    </div>
                                    <div className="text-xs text-stone-600 mb-1">
                                      {alert.source_type === 'customer' ? '👤 ลูกค้า' : '👨‍💼 พนักงาน'}
                                    </div>
                                    {alert.message && (
                                      <p className="text-sm text-stone-700 line-clamp-2 mb-1">
                                        {alert.message}
                                      </p>
                                    )}
                                    {alert.latitude && alert.longitude && (
                                      <div className="flex items-center gap-1 text-xs text-stone-500">
                                        <MapPin className="w-3 h-3" />
                                        <span>มีข้อมูลพิกัด GPS</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {pendingCount > 0 && (
                      <div className="p-3 bg-stone-50 border-t border-stone-200">
                        <Link
                          to="/admin/sos-alerts"
                          onClick={() => setNotificationOpen(false)}
                          className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl font-semibold text-white transition ${
                            hasCriticalAlerts
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-orange-600 hover:bg-orange-700'
                          }`}
                        >
                          <span>ดูการแจ้งเตือนทั้งหมด</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

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

        {/* Enable Sound Banner */}
        {pendingCount > 0 && soundEnabled && !audioContextReady && (
          <div className="mx-4 lg:mx-6 mt-4">
            <div className={`rounded-2xl border-2 overflow-hidden ${
              hasCriticalAlerts
                ? 'bg-red-50 border-red-500'
                : 'bg-orange-50 border-orange-400'
            }`}>
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    hasCriticalAlerts ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    <Volume2 className={`w-6 h-6 ${
                      hasCriticalAlerts ? 'text-red-600' : 'text-orange-600'
                    } animate-bounce`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${
                      hasCriticalAlerts ? 'text-red-900' : 'text-orange-900'
                    }`}>
                      🔇 เสียงแจ้งเตือนยังไม่ทำงาน
                    </h3>
                    <p className={`text-sm ${
                      hasCriticalAlerts ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      คลิกปุ่มด้านล่างเพื่อเปิดใช้งานเสียงแจ้งเตือนฉุกเฉิน ({pendingCount} รายการรอดำเนินการ)
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const success = await enableAudio()
                    if (success) {
                      console.log('Audio enabled successfully')
                    }
                  }}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition transform hover:scale-105 active:scale-95 ${
                    hasCriticalAlerts
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  🔊 เปิดเสียงแจ้งเตือน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout