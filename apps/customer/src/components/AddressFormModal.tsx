import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { User, Phone, MapPin } from 'lucide-react'
import { useCreateAddress, useUpdateAddress } from '@bliss/supabase/hooks/useAddresses'
import type { Database } from '@bliss/supabase/types/database.types'
import toast from 'react-hot-toast'
import { GoogleMapsPicker } from './GoogleMapsPicker'

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
      newErrors.recipient_name = 'Recipient name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else {
      // Thai phone validation: 10 digits starting with 0
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length !== 10 || !phoneDigits.startsWith('0')) {
        newErrors.phone = 'Phone number must be 10 digits starting with 0'
      }
    }

    if (!formData.address_line.trim()) {
      newErrors.address_line = 'Address is required'
    }

    if (!formData.province.trim()) {
      newErrors.province = 'Province is required'
    }

    if (!formData.zipcode.trim()) {
      newErrors.zipcode = 'Postal code is required'
    } else if (!/^\d{5}$/.test(formData.zipcode)) {
      newErrors.zipcode = 'Postal code must be 5 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      if (isEditMode) {
        await updateAddressMutation.mutateAsync({
          addressId: addressToEdit!.id,
          updates: formData,
        })
        toast.success('Address updated successfully')
      } else {
        await createAddressMutation.mutateAsync({
          ...formData,
          customer_id: customerId,
        })
        toast.success('Address added successfully')
      }
      onClose()
    } catch (error: any) {
      console.error('Failed to save address:', error)
      toast.error(
        isEditMode ? 'Failed to update address' : 'Failed to add address'
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Address' : 'Add New Address'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Scrollable Content */}
        <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
        {/* Label and Default Checkbox */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed"
            >
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
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
              <span className="text-sm text-stone-700">Set as default</span>
            </label>
          </div>
        </div>

        {/* Recipient Name */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Recipient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.recipient_name}
            onChange={(e) => handleInputChange('recipient_name', e.target.value)}
            placeholder="John Doe"
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
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Phone className="w-4 h-4 inline mr-1" />
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="081-234-5678"
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
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.address_line}
            onChange={(e) => handleInputChange('address_line', e.target.value)}
            placeholder="123 Main Street, Sukhumvit"
            disabled={mutation.isPending}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.address_line ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.address_line && (
            <p className="text-xs text-red-600 mt-1">{errors.address_line}</p>
          )}
        </div>

        {/* Subdistrict and District */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Subdistrict (แขวง/ตำบล)
            </label>
            <input
              type="text"
              value={formData.subdistrict}
              onChange={(e) => handleInputChange('subdistrict', e.target.value)}
              placeholder="Khlong Tan"
              disabled={mutation.isPending}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              District (เขต/อำเภอ)
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => handleInputChange('district', e.target.value)}
              placeholder="Watthana"
              disabled={mutation.isPending}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Province and Zipcode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Province (จังหวัด) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => handleInputChange('province', e.target.value)}
              placeholder="Bangkok"
              disabled={mutation.isPending}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
                errors.province ? 'border-red-500' : 'border-stone-300'
              }`}
            />
            {errors.province && (
              <p className="text-xs text-red-600 mt-1">{errors.province}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Postal Code (รหัสไปรษณีย์) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.zipcode}
              onChange={(e) => handleInputChange('zipcode', e.target.value)}
              placeholder="10110"
              maxLength={5}
              disabled={mutation.isPending}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
                errors.zipcode ? 'border-red-500' : 'border-stone-300'
              }`}
            />
            {errors.zipcode && (
              <p className="text-xs text-red-600 mt-1">{errors.zipcode}</p>
            )}
          </div>
        </div>

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
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditMode ? 'Update Address' : 'Add Address'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddressFormModal
