import { useState, useEffect } from 'react'
import { Save, Globe, CreditCard, AlertCircle, CheckCircle, RefreshCw, Calendar, Plus, Trash2, Edit2, BarChart3, FileText, Star, Wallet, Loader2 } from 'lucide-react'
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
  company_name_th: string
  company_tax_id: string
  company_logo_url: string
  company_email: string
  company_address: string
  company_phone: string

  // Payment Settings
  omise_public_key: string
  omise_secret_key: string
  google_maps_api_key: string
  google_calendar_id: string
  google_service_account_key: string
  email_provider_api_key: string
  email_provider_domain: string

  // Report Settings
  report_monthly_target: string
  report_cost_percentage: string

  // Payment Processing Fees
  fee_credit_card: string
  fee_promptpay: string
  fee_internet_banking: string
  fee_mobile_banking: string
}

function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SettingsState>({
    website_name_en: '',
    company_name_th: '',
    company_tax_id: '',
    company_logo_url: '',
    company_email: '',
    company_address: '',
    company_phone: '',
    omise_public_key: '',
    omise_secret_key: '',
    google_maps_api_key: '',
    google_calendar_id: '',
    google_service_account_key: '',
    email_provider_api_key: '',
    email_provider_domain: '',
    report_monthly_target: '500000',
    report_cost_percentage: '30',
    fee_credit_card: '3.65',
    fee_promptpay: '1.65',
    fee_internet_banking: '10',
    fee_mobile_banking: '10',
  })


  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Refund Policy State
  const [refundPolicyContent, setRefundPolicyContent] = useState('')
  const [refundPolicyVersion, setRefundPolicyVersion] = useState('1.0')
  const [refundPolicySaving, setRefundPolicySaving] = useState(false)

  // Cancellation Policy State
  const [policySettings, setPolicySettings] = useState<CancellationPolicySettings | null>(null)
  const [policyTiers, setPolicyTiers] = useState<CancellationPolicyTier[]>([])
  const [editingTier, setEditingTier] = useState<CancellationPolicyTier | null>(null)
  const [showTierModal, setShowTierModal] = useState(false)
  const [policyLoading, setPolicyLoading] = useState(false)

  // Loyalty Points State
  const [loyaltySettings, setLoyaltySettings] = useState({
    loyalty_enabled: true,
    points_per_baht: '100',
    points_to_baht: '10',
    min_redeem_points: '100',
    max_discount_percent: '50',
    first_booking_bonus: '50',
    points_expiry_days: '365',
    points_expiry_warning_days: '30',
  })
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [loyaltySaving, setLoyaltySaving] = useState(false)

  // Payout settings state
  const [payoutSettings, setPayoutSettings] = useState({
    mid_month_payout_day: '16',
    end_month_payout_day: '1',
    mid_month_cutoff_day: '10',
    end_month_cutoff_day: '25',
    minimum_payout_amount: '100',
    carry_forward_enabled: true,
  })
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutSaving, setPayoutSaving] = useState(false)

  const tabs = [
    { id: 'general', name: 'ทั่วไป', nameEn: 'General Settings', icon: Globe },
    { id: 'payment', name: 'การชำระเงิน', nameEn: 'Payment Settings', icon: CreditCard },
    { id: 'cancellation', name: 'นโยบายการยกเลิก', nameEn: 'Cancellation Policy', icon: Calendar },
    { id: 'refund_policy', name: 'เงื่อนไขการคืนเงิน', nameEn: 'Refund Policy', icon: FileText },
    { id: 'reports', name: 'รายงาน/เป้าหมาย', nameEn: 'Reports & Targets', icon: BarChart3 },
    { id: 'loyalty', name: 'ระบบแต้มสะสม', nameEn: 'Loyalty Points', icon: Star },
    { id: 'payout', name: 'รอบจ่ายเงิน Staff', nameEn: 'Staff Payout', icon: Wallet },
  ]

  // Load settings from database
  useEffect(() => {
    loadSettings()
    loadCancellationPolicy()
    loadRefundPolicy()
    loadLoyaltySettings()
    loadPayoutSettings()
  }, [])

  const loadPayoutSettings = async () => {
    setPayoutLoading(true)
    try {
      const { data } = await supabase.from('payout_settings').select('setting_key, setting_value')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((r: { setting_key: string; setting_value: string }) => { map[r.setting_key] = r.setting_value })
        setPayoutSettings({
          mid_month_payout_day: map.mid_month_payout_day || '16',
          end_month_payout_day: map.end_month_payout_day || '1',
          mid_month_cutoff_day: map.mid_month_cutoff_day || '10',
          end_month_cutoff_day: map.end_month_cutoff_day || '25',
          minimum_payout_amount: map.minimum_payout_amount || '100',
          carry_forward_enabled: map.carry_forward_enabled !== 'false',
        })
      }
    } catch (err) {
      console.error('Error loading payout settings:', err)
    } finally {
      setPayoutLoading(false)
    }
  }

  const savePayoutSettings = async () => {
    setPayoutSaving(true)
    try {
      const entries = [
        { key: 'mid_month_payout_day', value: payoutSettings.mid_month_payout_day },
        { key: 'end_month_payout_day', value: payoutSettings.end_month_payout_day },
        { key: 'mid_month_cutoff_day', value: payoutSettings.mid_month_cutoff_day },
        { key: 'end_month_cutoff_day', value: payoutSettings.end_month_cutoff_day },
        { key: 'minimum_payout_amount', value: payoutSettings.minimum_payout_amount },
        { key: 'carry_forward_enabled', value: String(payoutSettings.carry_forward_enabled) },
      ]
      for (const entry of entries) {
        await supabase
          .from('payout_settings')
          .update({ setting_value: entry.value })
          .eq('setting_key', entry.key)
      }
      setMessage('บันทึกการตั้งค่ารอบจ่ายเงินเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error saving payout settings:', err)
      setMessage('ไม่สามารถบันทึกการตั้งค่าได้')
    } finally {
      setPayoutSaving(false)
    }
  }

  const loadLoyaltySettings = async () => {
    setLoyaltyLoading(true)
    try {
      const loyaltyKeys = [
        'loyalty_enabled', 'points_per_baht', 'points_to_baht',
        'min_redeem_points', 'max_discount_percent', 'first_booking_bonus',
        'points_expiry_days', 'points_expiry_warning_days'
      ]
      const { data } = await supabase.from('settings').select('key, value').in('key', loyaltyKeys)
      if (data && data.length > 0) {
        const mapped: Record<string, any> = {}
        data.forEach((s: any) => {
          if (s.key === 'loyalty_enabled') {
            mapped[s.key] = s.value?.enabled ?? true
          } else {
            mapped[s.key] = String(s.value?.value ?? '')
          }
        })
        setLoyaltySettings(prev => ({ ...prev, ...mapped }))
      }
    } catch (err) {
      console.error('Failed to load loyalty settings:', err)
    } finally {
      setLoyaltyLoading(false)
    }
  }

  const saveLoyaltySettings = async () => {
    setLoyaltySaving(true)
    try {
      const settingsToSave = [
        { key: 'loyalty_enabled', value: { enabled: loyaltySettings.loyalty_enabled }, description: 'เปิด/ปิดระบบแต้มสะสม' },
        { key: 'points_per_baht', value: { value: parseInt(loyaltySettings.points_per_baht) || 100 }, description: 'ทุกกี่บาทได้ 1 แต้ม' },
        { key: 'points_to_baht', value: { value: parseInt(loyaltySettings.points_to_baht) || 10 }, description: 'กี่แต้มเท่ากับ 1 บาท' },
        { key: 'min_redeem_points', value: { value: parseInt(loyaltySettings.min_redeem_points) || 100 }, description: 'แลกแต้มขั้นต่ำ' },
        { key: 'max_discount_percent', value: { value: parseInt(loyaltySettings.max_discount_percent) || 50 }, description: 'ส่วนลดสูงสุดจากแต้ม (%)' },
        { key: 'first_booking_bonus', value: { value: parseInt(loyaltySettings.first_booking_bonus) || 50 }, description: 'โบนัสแต้มจองครั้งแรก' },
        { key: 'points_expiry_days', value: { value: parseInt(loyaltySettings.points_expiry_days) || 365 }, description: 'อายุแต้ม (วัน)' },
        { key: 'points_expiry_warning_days', value: { value: parseInt(loyaltySettings.points_expiry_warning_days) || 30 }, description: 'แจ้งเตือนก่อนหมดอายุ (วัน)' },
      ]
      for (const setting of settingsToSave) {
        const { error } = await supabase.from('settings').upsert({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
        if (error) throw error
      }
      setMessage('บันทึกการตั้งค่าระบบแต้มสะสมเรียบร้อยแล้ว')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save loyalty settings:', err)
      setError('เกิดข้อผิดพลาดในการบันทึก')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoyaltySaving(false)
    }
  }

  const loadRefundPolicy = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'refund_policy_content').single()
    if (data?.value) {
      const val = typeof data.value === 'object' && 'value' in data.value ? data.value.value : data.value
      const ver = typeof data.value === 'object' && 'version' in data.value ? data.value.version : '1.0'
      setRefundPolicyContent(typeof val === 'string' ? val : '')
      setRefundPolicyVersion(typeof ver === 'string' ? ver : '1.0')
    }
  }

  const saveRefundPolicy = async () => {
    setRefundPolicySaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update({ value: { value: refundPolicyContent, version: refundPolicyVersion }, updated_at: new Date().toISOString() })
        .eq('key', 'refund_policy_content')
      if (error) throw error
      setMessage('บันทึกเงื่อนไขการคืนเงินเรียบร้อย')
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกได้')
    } finally {
      setRefundPolicySaving(false)
    }
  }

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
        company_name_th: settingsMap.company_name_th || '',
        company_tax_id: settingsMap.company_tax_id || '',
        company_logo_url: settingsMap.company_logo_url || '',
        company_email: settingsMap.company_email || '',
        company_address: settingsMap.company_address || '',
        company_phone: settingsMap.company_phone || '',
        omise_public_key: settingsMap.omise_public_key || '',
        omise_secret_key: settingsMap.omise_secret_key || '',
        google_maps_api_key: settingsMap.google_maps_api_key || '',
        google_calendar_id: settingsMap.google_calendar_id || '',
        google_service_account_key: settingsMap.google_service_account_key || '',
        email_provider_api_key: settingsMap.email_provider_api_key || '',
        email_provider_domain: settingsMap.email_provider_domain || '',
        report_monthly_target: settingsMap.report_monthly_target || '500000',
        report_cost_percentage: settingsMap.report_cost_percentage || '30',
        fee_credit_card: settingsMap.fee_credit_card || '3.65',
        fee_promptpay: settingsMap.fee_promptpay || '1.65',
        fee_internet_banking: settingsMap.fee_internet_banking || '10',
        fee_mobile_banking: settingsMap.fee_mobile_banking || '10',
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
        { key: 'company_name_th', value: { value: settings.company_name_th || '' }, description: 'Company name in Thai' },
        { key: 'company_tax_id', value: { value: settings.company_tax_id || '' }, description: 'Company tax ID' },
        { key: 'company_logo_url', value: { url: settings.company_logo_url || '' }, description: 'Company logo URL' },
        { key: 'company_email', value: { value: settings.company_email || '' }, description: 'Company email address' },
        { key: 'company_address', value: { value: settings.company_address || '' }, description: 'Company address' },
        { key: 'company_phone', value: { value: settings.company_phone || '' }, description: 'Company phone number' },
        { key: 'omise_public_key', value: { key: settings.omise_public_key || '' }, description: 'Omise public key' },
        { key: 'omise_secret_key', value: { key: settings.omise_secret_key || '' }, description: 'Omise secret key' },
        { key: 'google_maps_api_key', value: { key: settings.google_maps_api_key || '' }, description: 'Google Maps API key' },
        { key: 'google_calendar_id', value: settings.google_calendar_id || '', description: 'Google Calendar ID for credit reminders' },
        { key: 'google_service_account_key', value: settings.google_service_account_key || '', description: 'Google Service Account key (base64)' },
        { key: 'email_provider_api_key', value: { key: settings.email_provider_api_key || '' }, description: 'Email provider API key' },
        { key: 'email_provider_domain', value: { domain: settings.email_provider_domain || '' }, description: 'Email provider domain' },
        { key: 'report_monthly_target', value: { value: settings.report_monthly_target || '500000' }, description: 'Monthly revenue target (THB)' },
        { key: 'report_cost_percentage', value: { value: settings.report_cost_percentage || '30' }, description: 'Estimated cost percentage (%)' },
        { key: 'fee_credit_card', value: { value: settings.fee_credit_card || '3.65', type: 'percentage' }, description: 'Credit/Debit card processing fee (%)' },
        { key: 'fee_promptpay', value: { value: settings.fee_promptpay || '1.65', type: 'percentage' }, description: 'PromptPay QR processing fee (%)' },
        { key: 'fee_internet_banking', value: { value: settings.fee_internet_banking || '10', type: 'flat' }, description: 'Internet Banking processing fee (THB per transaction)' },
        { key: 'fee_mobile_banking', value: { value: settings.fee_mobile_banking || '10', type: 'flat' }, description: 'Mobile Banking processing fee (THB per transaction)' },
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
                  <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อบริษัท (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={settings.company_name_th}
                    onChange={(e) => setSettings({ ...settings, company_name_th: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="เช่น บริษัท เดอะบลิส แอท โฮม จำกัด"
                  />
                  <p className="text-xs text-stone-500 mt-1">ใช้สำหรับใบเสร็จรับเงินและใบลดหนี้</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={settings.company_tax_id}
                    onChange={(e) => setSettings({ ...settings, company_tax_id: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="เช่น 0123456789012"
                    maxLength={13}
                  />
                  <p className="text-xs text-stone-500 mt-1">เลข 13 หลัก ใช้สำหรับใบเสร็จรับเงินและใบลดหนี้</p>
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

                {/* Google Calendar */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <h3 className="font-medium text-stone-900 mb-1">Google Calendar (เครดิตโรงแรม)</h3>
                  <p className="text-xs text-stone-500 mb-3">เชื่อมต่อ Google Calendar เพื่อสร้าง event แจ้งเตือนครบกำหนดชำระเครดิตอัตโนมัติ</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Calendar ID</label>
                      <input
                        type="text"
                        value={settings.google_calendar_id}
                        onChange={(e) => setSettings({ ...settings, google_calendar_id: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="xxx@group.calendar.google.com"
                      />
                      <p className="text-xs text-stone-400 mt-1">ดูได้จาก Google Calendar Settings → Calendar ID</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Service Account Key (Base64)</label>
                      <textarea
                        value={settings.google_service_account_key}
                        onChange={(e) => setSettings({ ...settings, google_service_account_key: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
                        placeholder="eyJ0eXBlIjoic2Vydmlj..."
                      />
                      <p className="text-xs text-stone-400 mt-1">แปลง JSON key เป็น base64 ด้วย: btoa(JSON.stringify(key))</p>
                    </div>
                  </div>
                  {settings.google_calendar_id && settings.google_service_account_key ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> เชื่อมต่อแล้ว
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                      <span className="w-2 h-2 rounded-full bg-stone-300" /> ยังไม่ได้เชื่อมต่อ
                    </div>
                  )}
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

            {/* Refund Policy Tab */}
            {activeTab === 'refund_policy' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    เงื่อนไขการคืนเงิน (Refund Policy)
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    เนื้อหาที่ลูกค้าต้องอ่านและยอมรับก่อนลงทะเบียน/จองบริการ
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เวอร์ชัน</label>
                  <input
                    type="text"
                    value={refundPolicyVersion}
                    onChange={(e) => setRefundPolicyVersion(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น 1.0, 2.0"
                  />
                  <p className="text-xs text-stone-400 mt-1">เมื่อเปลี่ยนเวอร์ชัน ลูกค้าเก่าจะต้องยอมรับเงื่อนไขใหม่อีกครั้ง</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เนื้อหาเงื่อนไข</label>
                  <textarea
                    value={refundPolicyContent}
                    onChange={(e) => setRefundPolicyContent(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="เขียนเงื่อนไขการคืนเงินที่นี่..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={saveRefundPolicy}
                    disabled={refundPolicySaving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {refundPolicySaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึก
                  </button>
                </div>
              </div>
            )}

            {/* Reports & Targets Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    ตั้งค่ารายงานและเป้าหมาย
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    ค่าเหล่านี้ใช้คำนวณใน Dashboard รายงาน เช่น Forecast, Net Revenue, Target Achievement
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      เป้ารายได้ต่อเดือน (บาท) • Monthly Revenue Target (THB)
                    </label>
                    <input
                      type="number"
                      value={settings.report_monthly_target}
                      onChange={(e) => setSettings({ ...settings, report_monthly_target: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="500000"
                      min="0"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      ใช้คำนวณ Target Achievement (%) และ Variance from Forecast ในหน้ารายงานยอดขาย
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      อัตราต้นทุนโดยประมาณ (%) • Estimated Cost Percentage
                    </label>
                    <input
                      type="number"
                      value={settings.report_cost_percentage}
                      onChange={(e) => setSettings({ ...settings, report_cost_percentage: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="30"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      ใช้คำนวณ Net Revenue, Gross Margin และ Cash Flow โดยหักจากรายได้รวม
                    </p>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 className="font-medium text-stone-800 mb-2">ตัวอย่างการคำนวณ</h4>
                  <div className="text-sm text-stone-600 space-y-1">
                    <p>• <strong>Net Revenue</strong> = รายได้ completed - (รายได้รวม × {settings.report_cost_percentage || 30}%)</p>
                    <p>• <strong>Target Achievement</strong> = (รายได้ completed ÷ ฿{Number(settings.report_monthly_target || 500000).toLocaleString()}) × 100</p>
                    <p>• <strong>Forecast</strong> = (รายได้ completed ÷ จำนวนวัน) × 30 วัน</p>
                  </div>
                </div>

                {/* Payment Processing Fees */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 mt-6">
                  <h3 className="font-semibold text-green-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    ค่าธรรมเนียมช่องทางชำระเงิน
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    ค่าธรรมเนียมที่ payment gateway เรียกเก็บ ใช้คำนวณ Processing Fees ในรายงานยอดขาย
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Credit Card - percentage */}
                  <div className="flex items-center gap-4 p-3 bg-white border border-stone-200 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">💳</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700">
                        บัตรเครดิต/เดบิต • Credit/Debit Card
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.fee_credit_card}
                        onChange={(e) => setSettings({ ...settings, fee_credit_card: e.target.value })}
                        className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="3.65"
                        min="0"
                        step="0.01"
                      />
                      <span className="text-sm text-stone-500 w-20">% ต่อรายการ</span>
                    </div>
                  </div>

                  {/* PromptPay - percentage */}
                  <div className="flex items-center gap-4 p-3 bg-white border border-stone-200 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📱</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700">
                        พร้อมเพย์ • PromptPay QR
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.fee_promptpay}
                        onChange={(e) => setSettings({ ...settings, fee_promptpay: e.target.value })}
                        className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="1.65"
                        min="0"
                        step="0.01"
                      />
                      <span className="text-sm text-stone-500 w-20">% ต่อรายการ</span>
                    </div>
                  </div>

                  {/* Internet Banking - flat fee */}
                  <div className="flex items-center gap-4 p-3 bg-white border border-stone-200 rounded-lg">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-sm">🏦</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700">
                        อินเทอร์เน็ตแบงก์กิ้ง • Internet Banking
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.fee_internet_banking}
                        onChange={(e) => setSettings({ ...settings, fee_internet_banking: e.target.value })}
                        className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="10"
                        min="0"
                        step="0.01"
                      />
                      <span className="text-sm text-stone-500 w-20">บาท/รายการ</span>
                    </div>
                  </div>

                  {/* Mobile Banking - flat fee */}
                  <div className="flex items-center gap-4 p-3 bg-white border border-stone-200 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm">📲</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700">
                        โมบายแบงก์กิ้ง • Mobile Banking
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.fee_mobile_banking}
                        onChange={(e) => setSettings({ ...settings, fee_mobile_banking: e.target.value })}
                        className="w-24 px-3 py-1.5 border border-stone-300 rounded-lg text-right focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="10"
                        min="0"
                        step="0.01"
                      />
                      <span className="text-sm text-stone-500 w-20">บาท/รายการ</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Loyalty Points Settings */}
            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">ระบบแต้มสะสม</h2>
                    <p className="text-sm text-stone-500 mt-1">Loyalty Points — ตั้งค่าการได้รับและแลกแต้มของลูกค้า</p>
                  </div>
                  <button
                    onClick={saveLoyaltySettings}
                    disabled={loyaltySaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loyaltySaving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>

                {loyaltyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                    <span className="ml-2 text-stone-500">กำลังโหลด...</span>
                  </div>
                ) : (
                  <>
                    {/* เปิด/ปิดระบบ */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Star className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">เปิดใช้งานระบบแต้มสะสม</p>
                            <p className="text-sm text-stone-500">ลูกค้าจะได้รับแต้มเมื่อจองบริการเสร็จสมบูรณ์</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setLoyaltySettings(prev => ({ ...prev, loyalty_enabled: !prev.loyalty_enabled }))}
                          className={`relative w-14 h-7 rounded-full transition-colors ${loyaltySettings.loyalty_enabled ? 'bg-amber-600' : 'bg-stone-300'}`}
                        >
                          <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${loyaltySettings.loyalty_enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>

                    {/* การได้รับแต้ม */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">+</span>
                        การได้รับแต้ม
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">ทุกกี่บาทได้ 1 แต้ม</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.points_per_baht}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, points_per_baht: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="1"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">บาท</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">ตัวอย่าง: ฿{loyaltySettings.points_per_baht || 100} = 1 แต้ม, ฿{(parseInt(loyaltySettings.points_per_baht) || 100) * 5} = 5 แต้ม</p>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">โบนัสจองครั้งแรก</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.first_booking_bonus}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, first_booking_bonus: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="0"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">แต้ม</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">ลูกค้าจะได้รับโบนัสนี้เมื่อจองครั้งแรกเสร็จสมบูรณ์</p>
                        </div>
                      </div>
                    </div>

                    {/* การแลกแต้ม */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">⇄</span>
                        การแลกแต้ม
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">กี่แต้มเท่ากับ ฿1</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.points_to_baht}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, points_to_baht: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="1"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">แต้ม</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{loyaltySettings.points_to_baht || 10} แต้ม = ฿1</p>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">แลกขั้นต่ำ</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.min_redeem_points}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, min_redeem_points: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="0"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">แต้ม</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">= ฿{Math.floor((parseInt(loyaltySettings.min_redeem_points) || 100) / (parseInt(loyaltySettings.points_to_baht) || 10))} ส่วนลด</p>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">ส่วนลดสูงสุด</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.max_discount_percent}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, max_discount_percent: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="1"
                              max="100"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">%</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">ป้องกันลูกค้าจองฟรี</p>
                        </div>
                      </div>
                    </div>

                    {/* อายุแต้ม */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                        <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">⏱</span>
                        อายุแต้ม
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">แต้มหมดอายุหลัง</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.points_expiry_days}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, points_expiry_days: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="1"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">วัน</span>
                          </div>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-4">
                          <label className="block text-sm font-medium text-stone-700 mb-2">แจ้งเตือนก่อนหมดอายุ</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={loyaltySettings.points_expiry_warning_days}
                              onChange={(e) => setLoyaltySettings(prev => ({ ...prev, points_expiry_warning_days: e.target.value }))}
                              className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              min="1"
                            />
                            <span className="text-sm text-stone-500 whitespace-nowrap">วัน</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ตัวอย่างการคำนวณ */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                      <h4 className="font-medium text-stone-900 mb-3">ตัวอย่างการคำนวณ</h4>
                      <div className="text-sm text-stone-600 space-y-1">
                        <p>• ลูกค้าจองบริการ ฿800 → ได้ <strong>{Math.floor(800 / (parseInt(loyaltySettings.points_per_baht) || 100))} แต้ม</strong></p>
                        <p>• ลูกค้ามี 500 แต้ม → แลกส่วนลดได้ <strong>฿{Math.floor(500 / (parseInt(loyaltySettings.points_to_baht) || 10))}</strong></p>
                        <p>• บริการ ฿1,000 → ส่วนลดจากแต้มสูงสุด <strong>฿{Math.floor(1000 * (parseInt(loyaltySettings.max_discount_percent) || 50) / 100)}</strong> ({loyaltySettings.max_discount_percent}%)</p>
                        <p>• จองครั้งแรก → ได้โบนัส <strong>{loyaltySettings.first_booking_bonus} แต้ม</strong> (= ฿{Math.floor((parseInt(loyaltySettings.first_booking_bonus) || 50) / (parseInt(loyaltySettings.points_to_baht) || 10))})</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'payout' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">ตั้งค่ารอบจ่ายเงิน Staff</h3>
                    <p className="text-sm text-stone-500">กำหนดวันตัดรอบ วันจ่ายเงิน และยอดขั้นต่ำ</p>
                  </div>
                  <button
                    onClick={savePayoutSettings}
                    disabled={payoutSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
                  >
                    {payoutSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึก
                  </button>
                </div>

                {payoutLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                  </div>
                ) : (
                  <>
                    {/* Mid-month (งวดแรก) */}
                    <div className="bg-stone-50 rounded-xl p-5 space-y-4">
                      <h4 className="font-semibold text-stone-800">งวดแรก (Mid-month)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">วันตัดรอบงวดแรก</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">วันที่</span>
                            <input
                              type="number"
                              min="1" max="28"
                              value={payoutSettings.mid_month_cutoff_day}
                              onChange={e => setPayoutSettings(s => ({ ...s, mid_month_cutoff_day: e.target.value }))}
                              className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-sm text-stone-500">ของเดือน</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">วันจ่ายเงินงวดแรก</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">วันที่</span>
                            <input
                              type="number"
                              min="1" max="28"
                              value={payoutSettings.mid_month_payout_day}
                              onChange={e => setPayoutSettings(s => ({ ...s, mid_month_payout_day: e.target.value }))}
                              className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-sm text-stone-500">ของเดือน</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400">สำหรับ Staff ที่เลือกรอบ "ครึ่งเดือน" — นับรายได้จากวันที่ 26 เดือนก่อน ถึงวันตัดรอบ</p>
                    </div>

                    {/* End-month (งวดหลัง) */}
                    <div className="bg-stone-50 rounded-xl p-5 space-y-4">
                      <h4 className="font-semibold text-stone-800">งวดหลัง (End-month)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">วันตัดรอบงวดหลัง</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">วันที่</span>
                            <input
                              type="number"
                              min="1" max="28"
                              value={payoutSettings.end_month_cutoff_day}
                              onChange={e => setPayoutSettings(s => ({ ...s, end_month_cutoff_day: e.target.value }))}
                              className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-sm text-stone-500">ของเดือน</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">วันจ่ายเงินงวดหลัง</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">วันที่</span>
                            <input
                              type="number"
                              min="1" max="28"
                              value={payoutSettings.end_month_payout_day}
                              onChange={e => setPayoutSettings(s => ({ ...s, end_month_payout_day: e.target.value }))}
                              className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-sm text-stone-500">ของเดือนถัดไป</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-stone-400">สำหรับ Staff ทุกคน — นับรายได้จากวันที่ 11 (หรือ 26 สำหรับรายเดือน) ถึงวันตัดรอบ</p>
                    </div>

                    {/* Minimum & Carry Forward */}
                    <div className="bg-stone-50 rounded-xl p-5 space-y-4">
                      <h4 className="font-semibold text-stone-800">ยอดขั้นต่ำ & ยกยอด</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">ยอดขั้นต่ำในการจ่าย (บาท)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-500">฿</span>
                            <input
                              type="number"
                              min="0"
                              value={payoutSettings.minimum_payout_amount}
                              onChange={e => setPayoutSettings(s => ({ ...s, minimum_payout_amount: e.target.value }))}
                              className="w-32 px-3 py-2 border border-stone-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <p className="text-xs text-stone-400 mt-1">ถ้ารายได้ต่ำกว่ายอดนี้จะยกยอดไปรอบถัดไป</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-600 mb-1">ยกยอดข้ามรอบ</label>
                          <button
                            onClick={() => setPayoutSettings(s => ({ ...s, carry_forward_enabled: !s.carry_forward_enabled }))}
                            className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${
                              payoutSettings.carry_forward_enabled ? 'bg-amber-700' : 'bg-stone-300'
                            }`}
                            style={{ width: '44px', height: '24px' }}
                          >
                            <span
                              className="inline-block rounded-full bg-white shadow-sm transition-transform"
                              style={{
                                width: '20px', height: '20px',
                                transform: payoutSettings.carry_forward_enabled ? 'translateX(22px)' : 'translateX(2px)',
                              }}
                            />
                          </button>
                          <p className="text-xs text-stone-400 mt-1">
                            {payoutSettings.carry_forward_enabled ? 'เปิด — ยอดต่ำกว่าขั้นต่ำจะยกไปรอบถัดไป' : 'ปิด — จ่ายทุกยอดไม่ว่าจะน้อยแค่ไหน'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="font-semibold text-amber-800 mb-2">สรุปการตั้งค่า</h4>
                      <div className="text-sm text-amber-700 space-y-1">
                        <p>• งวดแรก: ตัดรอบวันที่ {payoutSettings.mid_month_cutoff_day} → จ่ายวันที่ {payoutSettings.mid_month_payout_day}</p>
                        <p>• งวดหลัง: ตัดรอบวันที่ {payoutSettings.end_month_cutoff_day} → จ่ายวันที่ {payoutSettings.end_month_payout_day} เดือนถัดไป</p>
                        <p>• ยอดขั้นต่ำ: ฿{parseInt(payoutSettings.minimum_payout_amount).toLocaleString('th-TH')} {payoutSettings.carry_forward_enabled ? '(ยกยอดถ้าต่ำกว่า)' : '(จ่ายทุกยอด)'}</p>
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