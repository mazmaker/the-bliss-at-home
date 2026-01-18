import { useState } from 'react'
import { Bell, Lock, Globe, LogOut, Info, ChevronRight } from 'lucide-react'

function StaffSettings() {
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)

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
          onChange: setNotifications,
        },
        {
          label: 'แจ้งเตือนทางอีเมล',
          value: emailAlerts,
          onChange: setEmailAlerts,
        },
        {
          label: 'แจ้งเตือนทาง SMS',
          value: smsAlerts,
          onChange: setSmsAlerts,
        },
      ],
    },
    {
      icon: Globe,
      title: 'ภาษา',
      titleEn: 'Language',
      description: 'เลือกภาษาที่ต้องการ',
      items: [],
    },
    {
      icon: Lock,
      title: 'ความปลอดภัย',
      titleEn: 'Security',
      description: 'เปลี่ยนรหัสผ่าน',
      items: [],
    },
    {
      icon: Info,
      title: 'เกี่ยวกับ',
      titleEn: 'About',
      description: 'ข้อมูลแอปพลิเคชัน',
      items: [],
    },
  ]

  return (
    <div className="space-y-4">
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
                  <ChevronRight className="w-5 h-5 text-stone-400" />
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
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            item.value ? 'bg-amber-700' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              item.value ? 'left-7' : 'left-1'
                            }`}
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

      {/* Language Selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-stone-900 mb-3">ภาษา / Language</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-amber-700 text-white rounded-xl font-medium">
            ไทย
          </button>
          <button className="p-3 bg-stone-100 text-stone-700 rounded-xl font-medium">
            English
          </button>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-stone-900 mb-3">เปลี่ยนรหัสผ่าน</h3>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="รหัสผ่านปัจจุบัน"
            className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="password"
            placeholder="รหัสผ่านใหม่"
            className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่านใหม่"
            className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
          />
          <button className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium">
            บันทึกรหัสผ่าน
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-stone-900 mb-3">เกี่ยวกับแอป</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">เวอร์ชัน</span>
            <span className="text-stone-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">บริษัท</span>
            <span className="text-stone-900">The Bliss at Home</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow text-red-600 font-medium hover:bg-red-50 transition">
        <LogOut className="w-5 h-5" />
        ออกจากระบบ
      </button>
    </div>
  )
}

export default StaffSettings
