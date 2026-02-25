import { useState, useEffect } from 'react'
import { Save, Building, MapPin, Phone, Mail, User, Edit, Check, Loader2, AlertCircle, RefreshCw, Globe } from 'lucide-react'
import { useHotelContext } from '../hooks/useHotelContext'
import { supabase } from '@bliss/supabase/auth'
import { createLoadingToast, notifications } from '../utils/notifications'
import { HotelMapDisplay } from '../components/HotelMapDisplay'

// Extended hotel interface for profile editing (excluding read-only fields)
interface HotelProfileData {
  contact_person: string
  email: string
  phone: string
  website: string
  tax_id: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
}

function HotelProfile() {
  const { hotelData, hotelId, isLoading: hotelLoading, isValidHotel } = useHotelContext()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [formData, setFormData] = useState<HotelProfileData>({
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    tax_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
  })

  // Update form data when hotel data changes
  useEffect(() => {
    if (hotelData) {
      setFormData({
        contact_person: hotelData.contact_person || '',
        email: hotelData.email || '',
        phone: hotelData.phone || '',
        website: hotelData.website || '',
        tax_id: hotelData.tax_id || '',
        bank_name: hotelData.bank_name || '',
        bank_account_number: hotelData.bank_account_number || '',
        bank_account_name: hotelData.bank_account_name || '',
      })
    }
  }, [hotelData])

  const handleSave = async () => {
    if (!hotelId) return

    const loadingToast = createLoadingToast(notifications.profile.updateLoading)

    try {
      setIsSaving(true)
      setSaveError(null)

      const { error } = await supabase
        .from('hotels')
        .update(formData)
        .eq('id', hotelId)

      if (error) {
        throw new Error(`Failed to update hotel profile: ${error.message}`)
      }

      loadingToast.success(notifications.profile.updateSuccess)
      setIsEditing(false)

    } catch (error) {
      console.error('Error saving hotel profile:', error)
      loadingToast.error(notifications.profile.updateError)
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSaveError(null)
    // Reset form data to original values
    if (hotelData) {
      setFormData({
        contact_person: hotelData.contact_person || '',
        email: hotelData.email || '',
        phone: hotelData.phone || '',
        website: hotelData.website || '',
        tax_id: hotelData.tax_id || '',
        bank_name: hotelData.bank_name || '',
        bank_account_number: hotelData.bank_account_number || '',
        bank_account_name: hotelData.bank_account_name || '',
      })
    }
  }

  const updateFormData = (field: keyof HotelProfileData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Show loading state
  if (hotelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดข้อมูลโรงแรม...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (!isValidHotel || !hotelData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-4">ไม่พบข้อมูลโรงแรม</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรชหน้า
          </button>
        </div>
      </div>
    )
  }

  // Get first character for avatar
  const avatarChar = hotelData?.name_th?.charAt(0) || 'H'

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <p className="font-medium">บันทึกข้อมูลเรียบร้อยแล้ว</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">เกิดข้อผิดพลาด: {saveError}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ข้อมูลโรงแรม</h1>
          <p className="text-stone-500">Hotel Profile</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
          >
            <Edit className="w-5 h-5" />
            แก้ไขข้อมูล
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        )}
      </div>

      {/* Hotel Info Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-800 to-stone-900 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl flex items-center justify-center text-2xl font-bold">
              {avatarChar}
            </div>
            <div>
              <h2 className="text-xl font-bold">{hotelData?.name_th}</h2>
              <p className="text-stone-300">{hotelData?.name_en}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information - Read Only */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-900">ข้อมูลพื้นฐาน</h3>
                <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">ไม่สามารถแก้ไขได้</span>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">ชื่อโรงแรม (ไทย)</label>
                  <p className="text-stone-900 font-medium">{hotelData?.name_th || 'ไม่ระบุ'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">ชื่อโรงแรม (อังกฤษ)</label>
                  <p className="text-stone-900 font-medium">{hotelData?.name_en || 'ไม่ระบุ'}</p>
                  <p className="text-xs text-stone-500 mt-1">ใช้สำหรับสร้าง URL: {hotelData?.hotel_slug}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">ที่อยู่</label>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
                    <p className="text-stone-900">{hotelData?.address || 'ไม่ระบุ'}</p>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-3 mt-3">
                  <p className="text-xs text-stone-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    ต้องการเปลี่ยนแปลงข้อมูลนี้? กรุณาติดต่อ Admin
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลติดต่อ</h3>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ผู้ติดต่อ</label>
                {isEditing ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => updateFormData('contact_person', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="กรอกชื่อผู้ติดต่อ"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{formData.contact_person || 'ไม่ระบุ'}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">อีเมล</label>
                {isEditing ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="example@hotel.com"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{formData.email || 'ไม่ระบุ'}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">เบอร์โทรศัพท์</label>
                {isEditing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="02-xxx-xxxx"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-stone-400" />
                    <p className="text-stone-900">{formData.phone || 'ไม่ระบุ'}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">เว็บไซต์</label>
                {isEditing ? (
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateFormData('website', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-stone-400" />
                    {formData.website ? (
                      <a
                        href={formData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700 hover:text-amber-800 font-medium hover:underline"
                      >
                        {formData.website}
                      </a>
                    ) : (
                      <p className="text-stone-900">ไม่ระบุ</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tax & Business Info */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลภาษี</h3>
            <div className="max-w-md">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">เลขประจำตัวผู้เสียภาษี</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => updateFormData('tax_id', e.target.value)}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0123456789012"
                  />
                ) : (
                  <p className="font-mono text-stone-900">{formData.tax_id || 'ไม่ระบุ'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="font-semibold text-stone-900 mb-4">ข้อมูลบัญชีธนาคาร</h3>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ธนาคาร</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => updateFormData('bank_name', e.target.value)}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="ธนาคารกสิกรไทย"
                    />
                  ) : (
                    <p className="text-stone-900">{formData.bank_name || 'ไม่ระบุ'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เลขที่บัญชี</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => updateFormData('bank_account_number', e.target.value)}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="012-3-45678-9"
                    />
                  ) : (
                    <p className="font-mono text-stone-900">{formData.bank_account_number || 'ไม่ระบุ'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อบัญชี</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.bank_account_name}
                      onChange={(e) => updateFormData('bank_account_name', e.target.value)}
                      className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="โรงแรม จำกัด"
                    />
                  ) : (
                    <p className="text-stone-900">{formData.bank_account_name || 'ไม่ระบุ'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Map Section */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">ที่ตั้งโรงแรม</h3>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">ไม่สามารถแก้ไขได้</span>
            </div>
            <HotelMapDisplay
              latitude={hotelData?.latitude}
              longitude={hotelData?.longitude}
              hotelName={hotelData?.name_th}
              hotelAddress={hotelData?.address}
              height="400px"
            />
            <div className="mt-3">
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                ต้องการเปลี่ยนแปลงข้อมูลนี้? กรุณาติดต่อ Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelProfile