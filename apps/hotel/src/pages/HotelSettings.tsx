import { useState } from 'react'
import { Save, Bell, Lock, Loader2, AlertCircle, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useHotelContext } from '../hooks/useHotelContext'
import { createLoadingToast, notifications, showErrorByType } from '../utils/notifications'

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app/api' : 'http://localhost:3000/api')

// Hotel settings interface
interface HotelSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  autoConfirm: boolean
  requireGuestInfo: boolean
  defaultDuration: number
}

// Default settings
const defaultSettings: HotelSettings = {
  emailNotifications: true,
  smsNotifications: false,
  autoConfirm: false,
  requireGuestInfo: true,
  defaultDuration: 60
}

// Fetch hotel settings from localStorage
const fetchHotelSettings = async (hotelId: string): Promise<HotelSettings> => {
  const localStorageKey = `hotel_settings_${hotelId}`
  const savedSettings = localStorage.getItem(localStorageKey)

  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      return { ...defaultSettings, ...parsed }
    } catch (error) {
      console.log('Failed to parse localStorage settings, using defaults')
    }
  }

  return defaultSettings
}

// Save hotel settings to localStorage
const saveHotelSettings = async ({ hotelId, settings }: { hotelId: string, settings: HotelSettings }): Promise<void> => {
  const localStorageKey = `hotel_settings_${hotelId}`
  localStorage.setItem(localStorageKey, JSON.stringify(settings))
}

function HotelSettings() {
  const [activeTab, setActiveTab] = useState('notifications')
  const { hotelId, getHotelName, isValidHotel, isLoading: hotelLoading } = useHotelContext()
  const queryClient = useQueryClient()

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Password validation
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumbers: /\d/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
  }
  const isPasswordValid = currentPassword.length > 0 && Object.values(passwordChecks).every(Boolean)

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/hotels/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด')
      return data
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 5000)
    },
    onError: (error: Error) => {
      setPasswordError(error.message)
      setPasswordSuccess(false)
    },
  })

  // Fetch hotel settings
  const {
    data: settings = defaultSettings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['hotel-settings', hotelId],
    queryFn: () => fetchHotelSettings(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: ({ settings }: { settings: HotelSettings }) =>
      saveHotelSettings({ hotelId: hotelId!, settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-settings', hotelId] })
    },
    onError: (err) => {
      console.error('Failed to save settings:', err)
      showErrorByType(err)
    }
  })

  const tabs = [
    { id: 'notifications', name: 'การแจ้งเตือน', nameEn: 'Notifications', icon: Bell },
    { id: 'security', name: 'ความปลอดภัย', nameEn: 'Security', icon: Lock },
  ]

  const handleSave = () => {
    if (!hotelId) return

    const loadingToast = createLoadingToast(notifications.settings.updateLoading)

    saveSettingsMutation.mutate({ settings }, {
      onSuccess: () => {
        loadingToast.success(notifications.settings.updateSuccess)
      },
      onError: () => {
        loadingToast.error(notifications.settings.updateError)
      }
    })
  }

  const updateSetting = (key: keyof HotelSettings, value: any) => {
    queryClient.setQueryData(['hotel-settings', hotelId], {
      ...settings,
      [key]: value
    })
  }

  // Loading state
  if (hotelLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาดในการโหลดการตั้งค่า</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ตั้งค่า</h1>
          <p className="text-stone-500">Settings - {getHotelName()}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveSettingsMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saveSettingsMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">{tab.name}</p>
                      <p className="text-xs opacity-70">{tab.nameEn}</p>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">การแจ้งเตือน</h2>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                    <div>
                      <p className="font-medium text-stone-900">แจ้งเตือนทางอีเมล</p>
                      <p className="text-sm text-stone-500">รับแจ้งเตือนการจองใหม่ทางอีเมล</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500 bg-white border-stone-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                    <div>
                      <p className="font-medium text-stone-900">แจ้งเตือนทาง SMS</p>
                      <p className="text-sm text-stone-500">รับแจ้งเตือนการจองใหม่ทาง SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => updateSetting('smsNotifications', e.target.checked)}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500 bg-white border-stone-300"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">ความปลอดภัย</h2>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                    <div>
                      <p className="font-medium text-stone-900">ยืนยันการจองอัตโนมัติ</p>
                      <p className="text-sm text-stone-500">การจองจะได้รับการยืนยันโดยอัตโนมัติ</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoConfirm}
                      onChange={(e) => updateSetting('autoConfirm', e.target.checked)}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500 bg-white border-stone-300"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                    <div>
                      <p className="font-medium text-stone-900">บังคับกรอกข้อมูลแขก</p>
                      <p className="text-sm text-stone-500">ต้องกรอกชื่อแขกและเลขห้องทุกครั้ง</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.requireGuestInfo}
                      onChange={(e) => updateSetting('requireGuestInfo', e.target.checked)}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500 bg-white border-stone-300"
                    />
                  </label>
                </div>

                {/* Change Password Section */}
                <div className="border-t border-stone-200 pt-6">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">เปลี่ยนรหัสผ่าน</h3>

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">เปลี่ยนรหัสผ่านสำเร็จแล้ว</p>
                    </div>
                  )}

                  {passwordError && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">{passwordError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">รหัสผ่านปัจจุบัน</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError('') }}
                          placeholder="กรอกรหัสผ่านปัจจุบัน..."
                          className="w-full px-4 py-2 pr-10 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">รหัสผ่านใหม่</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }}
                          placeholder="กรอกรหัสผ่านใหม่..."
                          className="w-full px-4 py-2 pr-10 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password strength indicators */}
                    {newPassword.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center gap-1.5 ${passwordChecks.minLength ? 'text-green-600' : 'text-stone-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> อย่างน้อย 8 ตัวอักษร
                        </div>
                        <div className={`flex items-center gap-1.5 ${passwordChecks.hasUppercase ? 'text-green-600' : 'text-stone-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> ตัวพิมพ์ใหญ่ (A-Z)
                        </div>
                        <div className={`flex items-center gap-1.5 ${passwordChecks.hasLowercase ? 'text-green-600' : 'text-stone-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> ตัวพิมพ์เล็ก (a-z)
                        </div>
                        <div className={`flex items-center gap-1.5 ${passwordChecks.hasNumbers ? 'text-green-600' : 'text-stone-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> ตัวเลข (0-9)
                        </div>
                        <div className={`flex items-center gap-1.5 ${passwordChecks.hasSpecialChar ? 'text-green-600' : 'text-stone-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> อักขระพิเศษ (!@#$...)
                        </div>
                      </div>
                    )}

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
                          placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..."
                          className={`w-full px-4 py-2 pr-10 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900 ${
                            confirmPassword.length > 0 && !passwordChecks.passwordsMatch
                              ? 'border-red-300'
                              : 'border-stone-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && !passwordChecks.passwordsMatch && (
                        <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={() => changePasswordMutation.mutate()}
                      disabled={!isPasswordValid || changePasswordMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          กำลังเปลี่ยนรหัสผ่าน...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          เปลี่ยนรหัสผ่าน
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelSettings
