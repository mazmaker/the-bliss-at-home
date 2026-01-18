import { useState } from 'react'
import { Save, Bell, Lock, CreditCard, Palette, Globe, Users } from 'lucide-react'

function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    siteName: 'The Bliss at Home',
    siteNameTh: 'เดอะ บลิส แอท โฮม',
    supportEmail: 'support@bliss.com',
    supportPhone: '02-123-4567',
    commissionRate: 20,
    taxRate: 7,
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    notifications: true,
    autoAccept: false,
    minBookingHours: 2,
    cancellationHours: 24,
  })

  const tabs = [
    { id: 'general', name: 'ทั่วไป', nameEn: 'General', icon: Globe },
    { id: 'pricing', name: 'ราคา', nameEn: 'Pricing', icon: CreditCard },
    { id: 'notifications', name: 'การแจ้งเตือน', nameEn: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'การแสดงผล', nameEn: 'Appearance', icon: Palette },
    { id: 'security', name: 'ความปลอดภัย', nameEn: 'Security', icon: Lock },
  ]

  const handleSave = () => {
    // Save settings
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อเว็บไซต์ (ไทย)</label>
                    <input
                      type="text"
                      value={settings.siteNameTh}
                      onChange={(e) => setSettings({ ...settings, siteNameTh: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อเว็บไซต์ (อังกฤษ)</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">อีเมลติดต่อ</label>
                    <input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      value={settings.supportPhone}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">สกุลเงิน</label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="THB">THB - บาทไทย</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">เขตเวลา</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                      <option value="Asia/Phuket">Asia/Phuket (GMT+7)</option>
                      <option value="Asia/Chiang_Mai">Asia/Chiang Mai (GMT+7)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">ตั้งค่าราคา</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">อัตราค่าคอมมิชชั่นโรงแรม (%)</label>
                    <input
                      type="number"
                      value={settings.commissionRate}
                      onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-stone-500 mt-1">ส่วนลดที่โรงแรมได้รับจากราคาปกติ</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">อัตราภาษีมูลค้าได้ (%)</label>
                    <input
                      type="number"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h3 className="font-medium text-stone-900 mb-2">ตัวอย่างการคำนวณ</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-600">ราคาบริการ: ฿1,000</span>
                      <span className="text-stone-900">฿1,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">ส่วนลดโรงแรม ({settings.commissionRate}%):</span>
                      <span className="text-amber-700">-฿{settings.commissionRate * 10}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">ราคาขายโรงแรม:</span>
                      <span className="font-medium text-stone-900">฿{1000 - settings.commissionRate * 10}</span>
                    </div>
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
                      <p className="font-medium text-stone-900">แจ้งเตือนการจองใหม่</p>
                      <p className="text-sm text-stone-500">รับแจ้งเตือนเมื่อมีการจองใหม่</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                      className="w-5 h-5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                    <div>
                      <p className="font-medium text-stone-900">อนุมัติพนักงานอัตโนมี</p>
                      <p className="text-sm text-stone-500">อนุมัติพนักงานใหม่โดยอัตโนมี</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoAccept}
                      onChange={(e) => setSettings({ ...settings, autoAccept: e.target.checked })}
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
                    <label className="block text-sm font-medium text-stone-700 mb-2">สีหลัก</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-700 rounded-xl"></div>
                      <span className="text-stone-600">Amber (ปัจจุบัน)</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ธีม</label>
                    <div className="p-4 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 rounded-xl">
                      <p className="text-stone-900 font-medium">สวัสดีแบบมินิมอล</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">ความปลอดภัย</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">รหัสผ่านผ่าน</label>
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

export default Settings
