import { useState, useEffect } from 'react'
import { Bell, LogOut, Volume2, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'
import { liffService } from '@bliss/supabase/auth'
import { isSoundEnabled, setSoundEnabled, NotificationSounds } from '../utils/soundNotification'

// Settings storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS: 'staff_notifications_enabled',
  EMAIL_ALERTS: 'staff_email_alerts',
  SMS_ALERTS: 'staff_sms_alerts',
}

// Helper functions for localStorage
const getStoredBoolean = (key: string, defaultValue: boolean): boolean => {
  const stored = localStorage.getItem(key)
  if (stored === null) return defaultValue
  return stored === 'true'
}

const setStoredBoolean = (key: string, value: boolean): void => {
  localStorage.setItem(key, String(value))
}

function StaffSettings() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [soundEnabled, setSoundEnabledState] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // Load all settings on mount
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled())
    setNotifications(getStoredBoolean(STORAGE_KEYS.NOTIFICATIONS, true))
    setEmailAlerts(getStoredBoolean(STORAGE_KEYS.EMAIL_ALERTS, true))
    setSmsAlerts(getStoredBoolean(STORAGE_KEYS.SMS_ALERTS, false))
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledState(enabled)
    setSoundEnabled(enabled)
    // Play test sound when enabling
    if (enabled) {
      NotificationSounds.notification()
    }
    showSaved()
  }

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotifications(enabled)
    setStoredBoolean(STORAGE_KEYS.NOTIFICATIONS, enabled)
    showSaved()
  }

  const handleEmailAlertsToggle = (enabled: boolean) => {
    setEmailAlerts(enabled)
    setStoredBoolean(STORAGE_KEYS.EMAIL_ALERTS, enabled)
    showSaved()
  }

  const handleSmsAlertsToggle = (enabled: boolean) => {
    setSmsAlerts(enabled)
    setStoredBoolean(STORAGE_KEYS.SMS_ALERTS, enabled)
    showSaved()
  }

  const showSaved = () => {
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  const handleLogout = async () => {
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

  const settings = [
    {
      icon: Bell,
      title: 'การแจ้งเตือน',
      titleEn: 'Notifications',
      description: 'จัดการการแจ้งเตือน',
      items: [
        {
          label: 'เปิดการแจ้งเตือน',
          value: notifications,
          onChange: handleNotificationsToggle,
        },
        {
          label: 'แจ้งเตือนทางอีเมล',
          value: emailAlerts,
          onChange: handleEmailAlertsToggle,
        },
        {
          label: 'แจ้งเตือนทาง SMS',
          value: smsAlerts,
          onChange: handleSmsAlertsToggle,
        },
      ],
    },
    {
      icon: Volume2,
      title: 'เสียงแจ้งเตือน',
      titleEn: 'Sound Notifications',
      description: 'เปิด/ปิดเสียงเมื่อมีงานใหม่หรือเปลี่ยนสถานะ',
      items: [
        {
          label: 'เปิดเสียงแจ้งเตือน',
          value: soundEnabled,
          onChange: handleSoundToggle,
        },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {/* Save Success Toast */}
      {showSaveSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">บันทึกแล้ว</span>
          </div>
        </div>
      )}

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
      <div>
        <h1 className="text-xl font-bold text-stone-900">ตั้งค่า</h1>
        <p className="text-stone-500">Settings</p>
      </div>

      {/* Settings List */}
      <div className="space-y-3">
        {settings.map((setting, index) => {
          const Icon = setting.icon
          return (
            <div key={index} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900">{setting.title}</h3>
                    <p className="text-xs text-stone-500">{setting.titleEn}</p>
                  </div>
                </div>
                <p className="text-sm text-stone-600">{setting.description}</p>

                {/* Toggle Items */}
                {setting.items.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {setting.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="text-sm text-stone-700">{item.label}</span>
                        <button
                          onClick={() => item.onChange(!item.value)}
                          className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${
                            item.value ? 'bg-amber-700' : 'bg-stone-300'
                          }`}
                          style={{ width: '44px', height: '24px', minHeight: 'unset', minWidth: 'unset' }}
                        >
                          <span
                            className="inline-block rounded-full bg-white shadow-sm transition-transform"
                            style={{
                              width: '20px',
                              height: '20px',
                              transform: item.value ? 'translateX(22px)' : 'translateX(2px)',
                            }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Logout Button */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow text-red-600 font-medium hover:bg-red-50 transition"
      >
        <LogOut className="w-5 h-5" />
        ออกจากระบบ
      </button>

    </div>
  )
}

export default StaffSettings
