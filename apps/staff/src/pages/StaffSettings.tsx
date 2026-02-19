import { useState, useEffect } from 'react'
import { Bell, LogOut, Volume2, Check, Clock, Loader2 } from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { liffService } from '@bliss/supabase/auth'
import { useStaffNotifications } from '@bliss/supabase/notifications'
import { isSoundEnabled, setSoundEnabled, NotificationSounds } from '../utils/soundNotification'
import { REMINDER_OPTIONS } from '../utils/jobReminder'

function StaffSettings() {
  const { logout, user } = useAuth()
  const { enabled: notificationsEnabled, setNotificationsEnabled } = useStaffNotifications()
  const [soundEnabled, setSoundEnabledState] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // Reminder settings state
  const [reminderSettings, setReminderSettings] = useState({ enabled: true, times: [60, 120] })
  const [isLoadingReminder, setIsLoadingReminder] = useState(true)
  const [isSavingReminder, setIsSavingReminder] = useState(false)
  const [reminderError, setReminderError] = useState<string | null>(null)

  // Load sound setting on mount
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled())
  }, [])

  // Fetch reminder settings from server on mount
  useEffect(() => {
    if (!user?.id) return
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
    fetch(`${serverUrl}/api/notifications/reminder-settings?profile_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.enabled !== undefined) {
          setReminderSettings({ enabled: data.enabled, times: data.minutes || [60, 120] })
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingReminder(false))
  }, [user?.id])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledState(enabled)
    setSoundEnabled(enabled)
    if (enabled) {
      NotificationSounds.notification()
    }
    showSaved()
  }

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    showSaved()
  }

  const handleReminderTimeToggle = (minutes: number) => {
    const newTimes = reminderSettings.times.includes(minutes)
      ? reminderSettings.times.filter((t) => t !== minutes)
      : [...reminderSettings.times, minutes]
    setReminderSettings({ ...reminderSettings, times: newTimes })
  }

  const handleSaveReminderSettings = async () => {
    if (!user?.id) return
    setIsSavingReminder(true)
    setReminderError(null)
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
      const res = await fetch(`${serverUrl}/api/notifications/reminder-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: user.id,
          enabled: reminderSettings.enabled,
          minutes: reminderSettings.times,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showSaved()
    } catch (err: any) {
      console.error('Failed to save reminder settings:', err)
      setReminderError(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้')
    } finally {
      setIsSavingReminder(false)
    }
  }

  const showSaved = () => {
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)

    try {
      const loggedInViaLiff = localStorage.getItem('staff_logged_in_via_liff') === 'true'

      if (loggedInViaLiff) {
        console.log('[Logout] User logged in via LIFF, initializing LIFF for logout...')
        const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

        if (LIFF_ID) {
          if (!liffService.isInitialized()) {
            await liffService.initialize(LIFF_ID)
          }
          if (liffService.isLoggedIn()) {
            console.log('[Logout] Logging out from LIFF...')
            liffService.logout()
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        localStorage.removeItem('staff_logged_in_via_liff')
      }
    } catch (error) {
      console.error('LIFF logout error:', error)
    }

    try {
      console.log('[Logout] Logging out from Supabase...')
      await logout()
    } catch (error) {
      console.error('Supabase logout error:', error)
    }

    // Set flag to prevent auto-login on login page
    localStorage.setItem('staff_just_logged_out', 'true')

    console.log('[Logout] Redirecting to login page...')
    window.location.href = '/staff/login'
  }

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

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">การแจ้งเตือน</h3>
              <p className="text-xs text-stone-500">Notifications</p>
            </div>
          </div>
          <p className="text-sm text-stone-600">จัดการการแจ้งเตือนในแอป</p>

          <div className="mt-4 space-y-3">
            {/* Notification Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-stone-700">เปิดการแจ้งเตือน</span>
                <p className="text-xs text-stone-400 mt-0.5">แสดงการแจ้งเตือนงานใหม่ การยกเลิก และอื่นๆ</p>
              </div>
              <button
                onClick={() => handleNotificationsToggle(!notificationsEnabled)}
                className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-amber-700' : 'bg-stone-300'
                }`}
                style={{ width: '44px', height: '24px', minHeight: 'unset', minWidth: 'unset' }}
              >
                <span
                  className="inline-block rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    width: '20px',
                    height: '20px',
                    transform: notificationsEnabled ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">เสียงแจ้งเตือน</h3>
              <p className="text-xs text-stone-500">Sound Notifications</p>
            </div>
          </div>
          <p className="text-sm text-stone-600">เปิด/ปิดเสียงเมื่อมีงานใหม่หรือเปลี่ยนสถานะ</p>

          <div className="mt-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-stone-700">เปิดเสียงแจ้งเตือน</span>
              <button
                onClick={() => handleSoundToggle(!soundEnabled)}
                className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-amber-700' : 'bg-stone-300'
                }`}
                style={{ width: '44px', height: '24px', minHeight: 'unset', minWidth: 'unset' }}
              >
                <span
                  className="inline-block rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    width: '20px',
                    height: '20px',
                    transform: soundEnabled ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">เตือนก่อนเริ่มงาน</h3>
              <p className="text-xs text-stone-500">Job Reminders</p>
            </div>
          </div>
          <p className="text-sm text-stone-600">ระบบจะแจ้งเตือนผ่าน LINE ก่อนเริ่มงานตามเวลาที่เลือก</p>

          {isLoadingReminder ? (
            <div className="mt-4 flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-stone-700">เปิดการเตือนก่อนงาน</span>
                <button
                  onClick={() =>
                    setReminderSettings({ ...reminderSettings, enabled: !reminderSettings.enabled })
                  }
                  className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${
                    reminderSettings.enabled ? 'bg-amber-700' : 'bg-stone-300'
                  }`}
                  style={{ width: '44px', height: '24px', minHeight: 'unset', minWidth: 'unset' }}
                >
                  <span
                    className="inline-block rounded-full bg-white shadow-sm transition-transform"
                    style={{
                      width: '20px',
                      height: '20px',
                      transform: reminderSettings.enabled ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>

              {/* Reminder Time Options */}
              <div className="space-y-2">
                {REMINDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleReminderTimeToggle(option.value)}
                    disabled={!reminderSettings.enabled}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                      !reminderSettings.enabled
                        ? 'bg-stone-100 opacity-50 cursor-not-allowed'
                        : reminderSettings.times.includes(option.value)
                        ? 'bg-amber-50 border-2 border-amber-500'
                        : 'bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-stone-700 text-sm">{option.label}ก่อน</span>
                    {reminderSettings.times.includes(option.value) && (
                      <Check className="w-5 h-5 text-amber-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveReminderSettings}
                disabled={isSavingReminder}
                className="w-full py-2.5 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSavingReminder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึกการเตือน'
                )}
              </button>

              {/* Error */}
              {reminderError && (
                <p className="text-xs text-red-600">{reminderError}</p>
              )}
            </div>
          )}
        </div>
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
