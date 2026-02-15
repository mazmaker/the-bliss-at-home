import { useState, useEffect } from 'react'
import { Save, Globe, CreditCard, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LogoUpload } from '../components/LogoUpload'


interface SettingsState {
  // General Settings
  website_name_en: string
  company_logo_url: string
  company_email: string
  company_address: string
  company_phone: string

  // Payment Settings
  omise_public_key: string
  omise_secret_key: string
  google_maps_api_key: string
  email_provider_api_key: string
  email_provider_domain: string
}

function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SettingsState>({
    website_name_en: '',
    company_logo_url: '',
    company_email: '',
    company_address: '',
    company_phone: '',
    omise_public_key: '',
    omise_secret_key: '',
    google_maps_api_key: '',
    email_provider_api_key: '',
    email_provider_domain: '',
  })


  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const tabs = [
    { id: 'general', name: 'ทั่วไป', nameEn: 'General Settings', icon: Globe },
    { id: 'payment', name: 'การชำระเงิน', nameEn: 'Payment Settings', icon: CreditCard },
  ]

  // Load settings from database
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')

      if (error) {
        console.error('Supabase error:', error)
        setError(`Database error: ${error.message}`)
        return
      }

      if (!data) {
        setError('No settings data returned from database')
        return
      }

      console.log('Settings data from DB:', data)

      // Parse settings from database (handle JSONB values)
      const settingsMap: {[key: string]: string} = {}
      data.forEach((setting: any) => {
        try {
          const key = setting.key
          const value = setting.value

          if (!key) {
            console.warn('Setting row missing key:', setting)
            return
          }

          // Handle JSONB value - extract as simple string
          if (value && typeof value === 'object') {
            // If it's an object, try to get the main value
            settingsMap[key] = value.value || value.url || value.key || value.domain || value.rate?.toString() || JSON.stringify(value)
          } else if (value && typeof value === 'string') {
            // If it's already a string, use it directly
            settingsMap[key] = value
          } else {
            settingsMap[key] = ''
          }
        } catch (e) {
          console.warn(`Failed to parse setting:`, setting, e)
          settingsMap[setting.key] = ''
        }
      })

      console.log('Parsed settings:', settingsMap)

      setSettings({
        website_name_en: settingsMap.website_name_en || '',
        company_logo_url: settingsMap.company_logo_url || '',
        company_email: settingsMap.company_email || '',
        company_address: settingsMap.company_address || '',
        company_phone: settingsMap.company_phone || '',
        omise_public_key: settingsMap.omise_public_key || '',
        omise_secret_key: settingsMap.omise_secret_key || '',
        google_maps_api_key: settingsMap.google_maps_api_key || '',
        email_provider_api_key: settingsMap.email_provider_api_key || '',
        email_provider_domain: settingsMap.email_provider_domain || '',
      })

    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(`Failed to load settings: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      // Prepare settings for update (store as JSONB objects)
      const settingsToUpdate = [
        { key: 'website_name_en', value: { value: settings.website_name_en || '' }, description: 'Website name in English' },
        { key: 'company_logo_url', value: { url: settings.company_logo_url || '' }, description: 'Company logo URL' },
        { key: 'company_email', value: { value: settings.company_email || '' }, description: 'Company email address' },
        { key: 'company_address', value: { value: settings.company_address || '' }, description: 'Company address' },
        { key: 'company_phone', value: { value: settings.company_phone || '' }, description: 'Company phone number' },
        { key: 'omise_public_key', value: { key: settings.omise_public_key || '' }, description: 'Omise public key' },
        { key: 'omise_secret_key', value: { key: settings.omise_secret_key || '' }, description: 'Omise secret key' },
        { key: 'google_maps_api_key', value: { key: settings.google_maps_api_key || '' }, description: 'Google Maps API key' },
        { key: 'email_provider_api_key', value: { key: settings.email_provider_api_key || '' }, description: 'Email provider API key' },
        { key: 'email_provider_domain', value: { domain: settings.email_provider_domain || '' }, description: 'Email provider domain' },
      ]

      // Update each setting (using correct column names)
      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          })

        if (error) {
          console.error(`Error updating ${setting.key}:`, error)
          throw error
        }
      }

      setMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)

    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(`Failed to save settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }


  const handleLogoUploadComplete = (url: string) => {
    setSettings({ ...settings, company_logo_url: url })
    setError('')
    setMessage('อัพโหลดโลโก้เรียบร้อยแล้ว! กรุณากด "บันทึก" เพื่อยืนยันการเปลี่ยนแปลง')
  }

  const handleLogoUploadError = (error: string) => {
    setError(error)
    setMessage('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {message && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ตั้งค่าระบบ</h1>
          <p className="text-stone-500">System Settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
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

            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">ตั้งค่าทั่วไป</h2>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อเว็บไซต์</label>
                  <input
                    type="text"
                    value={settings.website_name_en}
                    onChange={(e) => setSettings({ ...settings, website_name_en: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g. The Bliss Massage at Home"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Company Logo</label>
                  <LogoUpload
                    onUploadComplete={handleLogoUploadComplete}
                    onUploadError={handleLogoUploadError}
                    currentImageUrl={settings.company_logo_url}
                    bucketName="logos"
                    folder=""
                    maxSizeMB={2}
                    accept="image/*"
                    className="w-full"
                  />
                </div>


                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">อีเมลบริษัท</label>
                    <textarea
                      value={settings.company_email}
                      onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="info@theblissathome.com, support@theblissathome.com"
                      rows={2}
                    />
                    <p className="text-xs text-stone-500 mt-1">อีเมลหลักของบริษัท ใช้ในการติดต่อและส่งอีเมล</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">ที่อยู่บริษัท</label>
                    <textarea
                      value={settings.company_address}
                      onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="123/45 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพฯ 10110"
                      rows={3}
                    />
                    <p className="text-xs text-stone-500 mt-1">ที่อยู่บริษัทสำหรับใบเสร็จ ใบกำกับภาษี และการติดต่อ</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">เบอร์โทรศัพท์</label>
                    <textarea
                      value={settings.company_phone}
                      onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="02-123-4567, 099-123-4567 (Call Center), 080-123-4567 (Emergency)"
                      rows={2}
                    />
                    <p className="text-xs text-stone-500 mt-1">เบอร์โทรศัพท์ติดต่อ สามารถใส่หลายหมายเลข</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">การตั้งค่าการชำระเงิน</h2>

                {/* Omise Settings */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="font-medium text-stone-900 mb-3">Omise Payment Gateway</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Public Key</label>
                      <input
                        type="text"
                        value={settings.omise_public_key}
                        onChange={(e) => setSettings({ ...settings, omise_public_key: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="pkey_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Secret Key</label>
                      <input
                        type="password"
                        value={settings.omise_secret_key}
                        onChange={(e) => setSettings({ ...settings, omise_secret_key: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="skey_test_..."
                      />
                    </div>
                  </div>
                </div>

                {/* Google Maps */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h3 className="font-medium text-stone-900 mb-3">Google Maps API</h3>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">API Key</label>
                    <input
                      type="password"
                      value={settings.google_maps_api_key}
                      onChange={(e) => setSettings({ ...settings, google_maps_api_key: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="AIza..."
                    />
                  </div>
                </div>

                {/* Email Provider */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <h3 className="font-medium text-stone-900 mb-3">Email Provider</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Provider Domain</label>
                      <input
                        type="text"
                        value={settings.email_provider_domain}
                        onChange={(e) => setSettings({ ...settings, email_provider_domain: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="mg.mailgun.org"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">API Key</label>
                      <input
                        type="password"
                        value={settings.email_provider_api_key}
                        onChange={(e) => setSettings({ ...settings, email_provider_api_key: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="key-..."
                      />
                    </div>
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