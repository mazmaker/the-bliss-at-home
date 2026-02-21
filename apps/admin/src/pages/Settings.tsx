import { useState, useEffect } from 'react'
import { Save, Globe, CreditCard, AlertCircle, CheckCircle, RefreshCw, Calendar, Plus, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LogoUpload } from '../components/LogoUpload'

// Cancellation Policy Types
interface CancellationPolicyTier {
  id: string
  min_hours_before: number
  max_hours_before: number | null
  can_cancel: boolean
  can_reschedule: boolean
  refund_percentage: number
  reschedule_fee: number
  label_th: string | null
  label_en: string | null
  sort_order: number
  is_active: boolean
}

interface CancellationPolicySettings {
  id: string
  policy_title_th: string | null
  policy_title_en: string | null
  policy_description_th: string | null
  policy_description_en: string | null
  max_reschedules_per_booking: number
  refund_processing_days: number
  is_active: boolean
}


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

  // Cancellation Policy State
  const [policySettings, setPolicySettings] = useState<CancellationPolicySettings | null>(null)
  const [policyTiers, setPolicyTiers] = useState<CancellationPolicyTier[]>([])
  const [editingTier, setEditingTier] = useState<CancellationPolicyTier | null>(null)
  const [showTierModal, setShowTierModal] = useState(false)
  const [policyLoading, setPolicyLoading] = useState(false)

  const tabs = [
    { id: 'general', name: 'ทั่วไป', nameEn: 'General Settings', icon: Globe },
    { id: 'payment', name: 'การชำระเงิน', nameEn: 'Payment Settings', icon: CreditCard },
    { id: 'cancellation', name: 'นโยบายการยกเลิก', nameEn: 'Cancellation Policy', icon: Calendar },
  ]

  // Load settings from database
  useEffect(() => {
    loadSettings()
    loadCancellationPolicy()
  }, [])

  // Load cancellation policy
  const loadCancellationPolicy = async () => {
    setPolicyLoading(true)
    try {
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('cancellation_policy_settings')
        .select('*')
        .limit(1)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading policy settings:', settingsError)
      } else if (settingsData) {
        setPolicySettings(settingsData)
      }

      // Load tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('cancellation_policy_tiers')
        .select('*')
        .order('sort_order', { ascending: true })

      if (tiersError) {
        console.error('Error loading policy tiers:', tiersError)
      } else {
        setPolicyTiers(tiersData || [])
      }
    } catch (err: any) {
      console.error('Error loading cancellation policy:', err)
    } finally {
      setPolicyLoading(false)
    }
  }

  // Save cancellation policy settings
  const savePolicySettings = async () => {
    if (!policySettings) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('cancellation_policy_settings')
        .update({
          policy_title_th: policySettings.policy_title_th,
          policy_title_en: policySettings.policy_title_en,
          policy_description_th: policySettings.policy_description_th,
          policy_description_en: policySettings.policy_description_en,
          max_reschedules_per_booking: policySettings.max_reschedules_per_booking,
          refund_processing_days: policySettings.refund_processing_days,
          is_active: policySettings.is_active,
        })
        .eq('id', policySettings.id)

      if (error) throw error

      setMessage('บันทึกนโยบายการยกเลิกเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      console.error('Error saving policy settings:', err)
      setError(`Failed to save policy settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Save tier
  const saveTier = async (tier: CancellationPolicyTier) => {
    setSaving(true)
    try {
      if (tier.id && tier.id !== 'new') {
        // Update existing
        const { error } = await supabase
          .from('cancellation_policy_tiers')
          .update({
            min_hours_before: tier.min_hours_before,
            max_hours_before: tier.max_hours_before,
            can_cancel: tier.can_cancel,
            can_reschedule: tier.can_reschedule,
            refund_percentage: tier.refund_percentage,
            reschedule_fee: tier.reschedule_fee,
            label_th: tier.label_th,
            label_en: tier.label_en,
            sort_order: tier.sort_order,
            is_active: tier.is_active,
          })
          .eq('id', tier.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('cancellation_policy_tiers')
          .insert({
            min_hours_before: tier.min_hours_before,
            max_hours_before: tier.max_hours_before,
            can_cancel: tier.can_cancel,
            can_reschedule: tier.can_reschedule,
            refund_percentage: tier.refund_percentage,
            reschedule_fee: tier.reschedule_fee,
            label_th: tier.label_th,
            label_en: tier.label_en,
            sort_order: tier.sort_order,
            is_active: tier.is_active,
          })

        if (error) throw error
      }

      setMessage('บันทึกช่วงเวลาเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)
      setShowTierModal(false)
      setEditingTier(null)
      loadCancellationPolicy()
    } catch (err: any) {
      console.error('Error saving tier:', err)
      setError(`Failed to save tier: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Delete tier
  const deleteTier = async (tierId: string) => {
    if (!confirm('ยืนยันการลบช่วงเวลานี้?')) return

    try {
      const { error } = await supabase
        .from('cancellation_policy_tiers')
        .delete()
        .eq('id', tierId)

      if (error) throw error

      setMessage('ลบช่วงเวลาเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)
      loadCancellationPolicy()
    } catch (err: any) {
      console.error('Error deleting tier:', err)
      setError(`Failed to delete tier: ${err.message}`)
    }
  }

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

            {/* Cancellation Policy Settings */}
            {activeTab === 'cancellation' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-stone-900">นโยบายการยกเลิก/เลื่อนนัด</h2>
                  <button
                    onClick={savePolicySettings}
                    disabled={saving || !policySettings}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                  </button>
                </div>

                {policyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
                    <span className="ml-2 text-stone-600">กำลังโหลด...</span>
                  </div>
                ) : (
                  <>
                    {/* General Settings */}
                    {policySettings && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                        <h3 className="font-medium text-stone-900">ตั้งค่าทั่วไป</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อนโยบาย (ไทย)</label>
                            <input
                              type="text"
                              value={policySettings.policy_title_th || ''}
                              onChange={(e) => setPolicySettings({ ...policySettings, policy_title_th: e.target.value })}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อนโยบาย (English)</label>
                            <input
                              type="text"
                              value={policySettings.policy_title_en || ''}
                              onChange={(e) => setPolicySettings({ ...policySettings, policy_title_en: e.target.value })}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-2">รายละเอียดนโยบาย (ไทย)</label>
                          <textarea
                            value={policySettings.policy_description_th || ''}
                            onChange={(e) => setPolicySettings({ ...policySettings, policy_description_th: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">จำนวนครั้งเลื่อนนัดสูงสุดต่อการจอง</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={policySettings.max_reschedules_per_booking}
                              onChange={(e) => setPolicySettings({ ...policySettings, max_reschedules_per_booking: parseInt(e.target.value) || 0 })}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">ระยะเวลาดำเนินการคืนเงิน (วัน)</label>
                            <input
                              type="number"
                              min="1"
                              max="60"
                              value={policySettings.refund_processing_days}
                              onChange={(e) => setPolicySettings({ ...policySettings, refund_processing_days: parseInt(e.target.value) || 14 })}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Policy Tiers */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-stone-900">ช่วงเวลาและเงื่อนไข</h3>
                        <button
                          onClick={() => {
                            setEditingTier({
                              id: 'new',
                              min_hours_before: 0,
                              max_hours_before: null,
                              can_cancel: true,
                              can_reschedule: true,
                              refund_percentage: 100,
                              reschedule_fee: 0,
                              label_th: '',
                              label_en: '',
                              sort_order: policyTiers.length + 1,
                              is_active: true,
                            })
                            setShowTierModal(true)
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                        >
                          <Plus className="w-4 h-4" />
                          เพิ่มช่วงเวลา
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-stone-100">
                              <th className="px-4 py-3 text-left font-medium text-stone-700">ช่วงเวลา</th>
                              <th className="px-4 py-3 text-center font-medium text-stone-700">ยกเลิกได้</th>
                              <th className="px-4 py-3 text-center font-medium text-stone-700">เลื่อนนัดได้</th>
                              <th className="px-4 py-3 text-center font-medium text-stone-700">คืนเงิน %</th>
                              <th className="px-4 py-3 text-center font-medium text-stone-700">สถานะ</th>
                              <th className="px-4 py-3 text-center font-medium text-stone-700">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200">
                            {policyTiers.map((tier) => (
                              <tr key={tier.id} className={!tier.is_active ? 'bg-stone-50 opacity-60' : ''}>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-stone-900">
                                    {tier.max_hours_before === null
                                      ? `มากกว่า ${tier.min_hours_before} ชั่วโมง`
                                      : tier.min_hours_before === 0
                                      ? `น้อยกว่า ${tier.max_hours_before} ชั่วโมง`
                                      : `${tier.min_hours_before}-${tier.max_hours_before} ชั่วโมง`}
                                  </div>
                                  <div className="text-stone-500 text-xs">{tier.label_th}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {tier.can_cancel ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">ได้</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">ไม่ได้</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {tier.can_reschedule ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">ได้</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">ไม่ได้</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-medium ${tier.refund_percentage === 100 ? 'text-green-600' : tier.refund_percentage > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {tier.refund_percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {tier.is_active ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">ใช้งาน</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600">ปิดใช้งาน</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingTier(tier)
                                        setShowTierModal(true)
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                      title="แก้ไข"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteTier(tier.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {policyTiers.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                                  ยังไม่มีช่วงเวลาที่กำหนด กรุณาเพิ่มช่วงเวลา
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Tier Edit Modal */}
      {showTierModal && editingTier && (
        <TierEditModal
          tier={editingTier}
          onSave={saveTier}
          onClose={() => {
            setShowTierModal(false)
            setEditingTier(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

// Tier Edit Modal Component
function TierEditModal({
  tier,
  onSave,
  onClose,
  saving,
}: {
  tier: CancellationPolicyTier
  onSave: (tier: CancellationPolicyTier) => void
  onClose: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState(tier)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-stone-200">
          <h3 className="text-xl font-semibold text-stone-900">
            {tier.id === 'new' ? 'เพิ่มช่วงเวลาใหม่' : 'แก้ไขช่วงเวลา'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ชั่วโมงขั้นต่ำก่อนนัด</label>
              <input
                type="number"
                min="0"
                value={formData.min_hours_before}
                onChange={(e) => setFormData({ ...formData, min_hours_before: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ชั่วโมงสูงสุดก่อนนัด</label>
              <input
                type="number"
                min="0"
                value={formData.max_hours_before || ''}
                onChange={(e) => setFormData({ ...formData, max_hours_before: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="ไม่จำกัด"
              />
              <p className="text-xs text-stone-500 mt-1">เว้นว่างหากไม่จำกัด</p>
            </div>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ป้ายกำกับ (ไทย)</label>
              <input
                type="text"
                value={formData.label_th || ''}
                onChange={(e) => setFormData({ ...formData, label_th: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="เช่น มากกว่า 24 ชั่วโมงก่อนนัด"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ป้ายกำกับ (English)</label>
              <input
                type="text"
                value={formData.label_en || ''}
                onChange={(e) => setFormData({ ...formData, label_en: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g. More than 24 hours before"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_cancel}
                onChange={(e) => setFormData({ ...formData, can_cancel: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-stone-700">อนุญาตให้ยกเลิกได้</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_reschedule}
                onChange={(e) => setFormData({ ...formData, can_reschedule: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-stone-700">อนุญาตให้เลื่อนนัดได้</span>
            </label>
          </div>

          {/* Refund */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">เปอร์เซ็นต์คืนเงิน</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.refund_percentage}
                  onChange={(e) => setFormData({ ...formData, refund_percentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="text-stone-700">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ค่าธรรมเนียมเลื่อนนัด (บาท)</label>
              <input
                type="number"
                min="0"
                value={formData.reschedule_fee}
                onChange={(e) => setFormData({ ...formData, reschedule_fee: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Sort Order & Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">ลำดับการแสดง</label>
              <input
                type="number"
                min="1"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-stone-700">เปิดใช้งาน</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-700 bg-stone-100 rounded-xl font-medium hover:bg-stone-200 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings