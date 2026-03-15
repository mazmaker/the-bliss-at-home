import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { User, Phone, MapPin } from 'lucide-react'
import { useCreateAddress, useUpdateAddress } from '@bliss/supabase/hooks/useAddresses'
import type { Database } from '@bliss/supabase/types/database.types'
import toast from 'react-hot-toast'
import { GoogleMapsPicker } from './GoogleMapsPicker'
import ThaiAddressFields from './ThaiAddressFields'

type Address = Database['public']['Tables']['addresses']['Row']

interface AddressFormModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  addressToEdit?: Address | null
}

interface AddressFormData {
  label: string
  recipient_name: string
  phone: string
  address_line: string
  subdistrict: string
  district: string
  province: string
  zipcode: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
}

function AddressFormModal({
  isOpen,
  onClose,
  customerId,
  addressToEdit,
}: AddressFormModalProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    label: 'Home',
    recipient_name: '',
    phone: '',
    address_line: '',
    subdistrict: '',
    district: '',
    province: '',
    zipcode: '',
    latitude: null,
    longitude: null,
    is_default: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const createAddressMutation = useCreateAddress()
  const updateAddressMutation = useUpdateAddress()

  const isEditMode = !!addressToEdit
  const mutation = isEditMode ? updateAddressMutation : createAddressMutation

  // Initialize form when addressToEdit changes
  useEffect(() => {
    if (addressToEdit) {
      setFormData({
        label: addressToEdit.label,
        recipient_name: addressToEdit.recipient_name,
        phone: addressToEdit.phone,
        address_line: addressToEdit.address_line,
        subdistrict: addressToEdit.subdistrict || '',
        district: addressToEdit.district || '',
        province: addressToEdit.province,
        zipcode: addressToEdit.zipcode || '',
        latitude: addressToEdit.latitude,
        longitude: addressToEdit.longitude,
        is_default: addressToEdit.is_default || false,
      })
    } else {
      // Reset form for add mode
      setFormData({
        label: 'Home',
        recipient_name: '',
        phone: '',
        address_line: '',
        subdistrict: '',
        district: '',
        province: '',
        zipcode: '',
        latitude: null,
        longitude: null,
        is_default: false,
      })
    }
    setErrors({})
  }, [addressToEdit, isOpen])

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.recipient_name.trim()) {
      newErrors.recipient_name = 'กรุณากรอกชื่อผู้รับ'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    } else {
      // Thai phone validation: 10 digits starting with 0
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length !== 10 || !phoneDigits.startsWith('0')) {
        newErrors.phone = 'เบอร์โทรศัพท์ต้อง 10 หลัก เริ่มต้นด้วย 0'
      }
    }

    if (!formData.address_line.trim()) {
      newErrors.address_line = 'กรุณากรอกที่อยู่'
    }

    if (!formData.province.trim()) {
      newErrors.province = 'กรุณาเลือกจังหวัด'
    }

    if (!formData.zipcode.trim()) {
      newErrors.zipcode = 'กรุณากรอกรหัสไปรษณีย์'
    } else if (!/^\d{5}$/.test(formData.zipcode.trim())) {
      newErrors.zipcode = 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      // Show toast with first error message
      const firstError = Object.values(newErrors)[0]
      toast.error(firstError)

      // Scroll to first error field
      const firstErrorField = Object.keys(newErrors)[0]
      const fieldElement = document.querySelector(`[data-field="${firstErrorField}"]`)
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    // Trim string fields before submitting
    const trimmedData = {
      ...formData,
      recipient_name: formData.recipient_name.trim(),
      phone: formData.phone.trim(),
      address_line: formData.address_line.trim(),
      subdistrict: formData.subdistrict.trim(),
      district: formData.district.trim(),
      province: formData.province.trim(),
      zipcode: formData.zipcode.trim(),
    }

    try {
      if (isEditMode) {
        await updateAddressMutation.mutateAsync({
          addressId: addressToEdit!.id,
          updates: trimmedData,
        })
        toast.success('อัปเดตที่อยู่สำเร็จ')
      } else {
        await createAddressMutation.mutateAsync({
          ...trimmedData,
          customer_id: customerId,
        })
        toast.success('เพิ่มที่อยู่สำเร็จ')
      }
      onClose()
    } catch (error: any) {
      console.error('Failed to save address:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
        statusText: error?.statusText,
      })
      toast.error(
        isEditMode ? 'ไม่สามารถอัปเดตที่อยู่ได้ กรุณาลองอีกครั้ง' : 'ไม่สามารถเพิ่มที่อยู่ได้ กรุณาลองอีกครั้ง'
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่ใหม่'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Scrollable Content */}
        <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
        {/* Label and Default Checkbox */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ป้ายกำกับ <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed"
            >
              <option value="Home">บ้าน</option>
              <option value="Office">ที่ทำงาน</option>
              <option value="Other">อื่นๆ</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleInputChange('is_default', e.target.checked)}
                disabled={mutation.isPending}
                className="w-4 h-4 text-amber-700 border-stone-300 rounded focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
              <span className="text-sm text-stone-700">ตั้งเป็นค่าเริ่มต้น</span>
            </label>
          </div>
        </div>

        {/* Recipient Name */}
        <div data-field="recipient_name">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            ชื่อผู้รับ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.recipient_name}
            onChange={(e) => handleInputChange('recipient_name', e.target.value)}
            placeholder="ชื่อ นามสกุล"
            disabled={mutation.isPending}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.recipient_name ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.recipient_name && (
            <p className="text-xs text-red-600 mt-1">{errors.recipient_name}</p>
          )}
        </div>

        {/* Phone Number */}
        <div data-field="phone">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1" />
            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="0812345678"
            disabled={mutation.isPending}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.phone ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.phone && (
            <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Address Line */}
        <div data-field="address_line">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            ที่อยู่ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.address_line}
            onChange={(e) => handleInputChange('address_line', e.target.value)}
            placeholder="บ้านเลขที่ ซอย ถนน"
            disabled={mutation.isPending}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.address_line ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.address_line && (
            <p className="text-xs text-red-600 mt-1">{errors.address_line}</p>
          )}
        </div>

        {/* Thai Address Cascading Dropdowns */}
        <ThaiAddressFields
          province={formData.province}
          district={formData.district}
          subdistrict={formData.subdistrict}
          zipcode={formData.zipcode}
          onChange={(fields) => {
            setFormData((prev) => ({ ...prev, ...fields }))
            // Clear related errors
            const addressFields = ['province', 'district', 'subdistrict', 'zipcode']
            setErrors((prev) => {
              const newErrors = { ...prev }
              addressFields.forEach((f) => delete newErrors[f])
              return newErrors
            })
          }}
          disabled={mutation.isPending}
          errors={errors}
        />

        {/* Google Maps Location Picker */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            เลือกตำแหน่งบนแผนที่ (ไม่บังคับ)
          </label>
          <GoogleMapsPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={handleLocationChange}
          />
        </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 pt-4 mt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <span>{isEditMode ? 'อัปเดตที่อยู่' : 'เพิ่มที่อยู่'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddressFormModal
