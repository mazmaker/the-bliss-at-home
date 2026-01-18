import { useState } from 'react'
import { Save, Bell, Lock, Palette, Globe } from 'lucide-react'

function HotelSettings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    language: 'th',
    emailNotifications: true,
    smsNotifications: false,
    autoConfirm: false,
    requireGuestInfo: true,
    defaultDuration: 60,
  })

  const tabs = [
    { id: 'general', name: 'ทั่วไป', nameEn: 'General', icon: Globe },
    { id: 'notifications', name: 'การแจ้งเตือน', nameEn: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'การแสดงผล', nameEn: 'Appearance', icon: Palette },
    { id: 'security', name: 'ความปลอดภัย', nameEn: 'Security', icon: Lock },
  ]

  const handleSave = () => {
    console.log('Saving settings:', settings)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ตั้งค่า</h1>
          <p className="text-stone-500">Settings</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
        >
          <Save className="w-5 h-5" />
          บันทึก
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
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">ตั้งค่าทั่วไป</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ภาษา</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="th">ไทย</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ระยะเวลาบริการเริ่มต้น (นาที)</label>
                    <input
                      type="number"
                      value={settings.defaultDuration}
                      onChange={(e) => setSettings({ ...settings, defaultDuration: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

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
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
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
                      onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">การแสดงผล</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ธีม</label>
                    <div className="p-4 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 rounded-xl">
                      <p className="text-stone-900 font-medium">สวัสดีแบบมินิมอล</p>
                      <p className="text-sm text-stone-500">ธีมปัจจุบัน</p>
                    </div>
                  </div>
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
                      onChange={(e) => setSettings({ ...settings, autoConfirm: e.target.checked })}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
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
                      onChange={(e) => setSettings({ ...settings, requireGuestInfo: e.target.checked })}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
                    />
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">เปลี่ยนรหัสผ่าน</label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านใหม่..."
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง..."
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
