import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Clock,
  DollarSign,
  User,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react'

const navigation = [
  { name: 'วันนี้', nameEn: 'Today', href: '/staff', icon: Calendar },
  { name: 'ประวัติ', nameEn: 'History', href: '/staff/history', icon: Clock },
  { name: 'รายได้', nameEn: 'Earnings', href: '/staff/earnings', icon: DollarSign },
  { name: 'โปรไฟล์', nameEn: 'Profile', href: '/staff/profile', icon: User },
  { name: 'ตั้งค่า', nameEn: 'Settings', href: '/staff/settings', icon: Settings },
]

function StaffLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-amber-800 text-white sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold">Bliss Provider</h1>
            <p className="text-xs opacity-90">พนักงานให้บริการ</p>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-lg transition">
            <Bell className="w-5 h-5" />
          </button>
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
