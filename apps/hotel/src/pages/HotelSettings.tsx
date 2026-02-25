import { useState } from 'react'
import { Save, Bell, Lock, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useHotelContext } from '../hooks/useHotelContext'
import { createLoadingToast, notifications, showErrorByType } from '../utils/notifications'

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
    onError: (error) => {
      console.error('Failed to save settings:', error)
      showErrorByType(error)
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
      onError: (error) => {
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

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">เปลี่ยนรหัสผ่าน</label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านใหม่..."
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..."
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-stone-900"
                    />
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
