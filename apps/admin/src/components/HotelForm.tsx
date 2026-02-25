import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { GoogleMapsPicker } from './GoogleMapsPicker'
import {
  createHotelAccount,
  sendHotelInvitation,
  resetHotelPassword,
  toggleHotelLoginAccess,
  loadHotelAuthStatus,
  copyToClipboard,
  formatLastLogin,
  generateHotelLoginURL,
  type HotelAuthStatus,
} from '../utils/hotelAuthUtils'
import {
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  User,
  Percent,
  Star,
  KeyRound,
  Send,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Shield,
  Clock,
} from 'lucide-react'

// Function to generate hotel slug from English name
const generateHotelSlug = (englishName: string): string => {
  return englishName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
}

// Validation schema
const hotelFormSchema = z.object({
  name_th: z.string().min(3, 'ชื่อภาษาไทยต้องมีอย่างน้อย 3 ตัวอักษร'),
  name_en: z.string().min(3, 'English name must be at least 3 characters'),
  hotel_slug: z.string().min(3, 'Hotel slug must be at least 3 characters'),
  contact_person: z.string().min(2, 'ชื่อผู้ติดต่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().min(9, 'เบอร์โทรศัพท์ต้องมีอย่างน้อย 9 หลัก'),
  address: z.string().min(10, 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร'),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  commission_rate: z.coerce
    .number({ required_error: 'ระบุเปอร์เซ็นต์เป็นตัวเลข' })
    .min(0, 'เปอร์เซ็นต์ขั้นต่ำ 0%')
    .max(100, 'เปอร์เซ็นต์สูงสุด 100%'),
  discount_rate: z.coerce
    .number({ required_error: 'ระบุเปอร์เซ็นต์ส่วนลดเป็นตัวเลข' })
    .min(0, 'เปอร์เซ็นต์ส่วนลดขั้นต่ำ 0%')
    .max(100, 'เปอร์เซ็นต์ส่วนลดสูงสุด 100%'),
  rating: z.coerce
    .number()
    .min(0, 'คะแนนขั้นต่ำ 0')
    .max(5, 'คะแนนสูงสุด 5')
    .default(0),
  status: z.enum(['active', 'pending', 'inactive', 'suspended', 'banned'], {
    required_error: 'กรุณาเลือกสถานะ',
  }),
  // Payment information
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
  tax_id: z.string().optional(),
  // Additional info
  description: z.string().optional(),
  website: z.string().url('รูปแบบ URL ไม่ถูกต้อง').optional().or(z.literal('')),
})

type HotelFormData = z.infer<typeof hotelFormSchema>

interface HotelFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: HotelFormData & { id: string }
}

const statusOptions = [
  { value: 'active', label: 'ใช้งานอยู่', color: 'green' },
  { value: 'pending', label: 'รออนุมัติ', color: 'yellow' },
  { value: 'inactive', label: 'ไม่ใช้งาน', color: 'gray' },
  { value: 'suspended', label: 'ระงับการใช้งาน', color: 'orange' },
  { value: 'banned', label: 'ถูกแบน', color: 'red' },
]

export function HotelForm({ isOpen, onClose, onSuccess, editData }: HotelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Login Account Management State
  const [loginEnabled, setLoginEnabled] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false)
  const [isSendingInvitation, setIsSendingInvitation] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [authStatus, setAuthStatus] = useState<HotelAuthStatus>({ hasAccount: false })

  // Login Account Management Functions
  const generateTemporaryPassword = async () => {
    if (!editData?.id) {
      alert('กรุณาบันทึกข้อมูลโรงแรมก่อนสร้างบัญชีผู้ใช้')
      return
    }

    setIsGeneratingPassword(true)
    try {
      const result = await createHotelAccount({
        hotelId: editData.id,
        email: watch('email'),
        name: watch('name_th'),
      })

      if (result.success && result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword)
        setAuthStatus({
          hasAccount: true,
          loginEmail: result.loginEmail,
        })
        setLoginEnabled(true)
        alert('สร้างบัญชีผู้ใช้สำเร็จ!')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถสร้างบัญชีได้'))
      }
    } catch (error: any) {
      console.error('Error creating account:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setIsGeneratingPassword(false)
    }
  }

  const sendInvitationEmail = async () => {
    if (!editData?.id) return

    setIsSendingInvitation(true)
    try {
      const result = await sendHotelInvitation(editData.id)
      if (result.success) {
        alert('ส่งอีเมลเชิญใช้งานสำเร็จ!')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถส่งอีเมลได้'))
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setIsSendingInvitation(false)
    }
  }

  const resetPassword = async () => {
    if (!editData?.id) return

    setIsResettingPassword(true)
    try {
      const result = await resetHotelPassword(editData.id)
      if (result.success && result.data?.temporaryPassword) {
        setTemporaryPassword(result.data.temporaryPassword)
        alert('รีเซ็ตรหัสผ่านสำเร็จ! รหัสผ่านชั่วคราวใหม่ถูกสร้างแล้ว')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้'))
      }
    } catch (error: any) {
      console.error('Error resetting password:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const toggleLoginAccess = async (enabled: boolean) => {
    if (!editData?.id) return

    try {
      const result = await toggleHotelLoginAccess(editData.id, enabled)
      if (result.success) {
        setLoginEnabled(enabled)
        alert(enabled ? 'เปิดใช้งานการเข้าสู่ระบบแล้ว' : 'ปิดใช้งานการเข้าสู่ระบบแล้ว')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถเปลี่ยนสถานะได้'))
      }
    } catch (error: any) {
      console.error('Error toggling login access:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const copyPassword = async () => {
    const success = await copyToClipboard(temporaryPassword)
    if (success) {
      alert('คัดลอกรหัสผ่านแล้ว!')
    } else {
      alert('ไม่สามารถคัดลอกได้ กรุณาคัดลอกด้วยตนเอง')
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<HotelFormData>({
    resolver: zodResolver(hotelFormSchema),
    defaultValues: editData || {
      name_th: '',
      name_en: '',
      hotel_slug: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      latitude: null,
      longitude: null,
      commission_rate: 20,
      discount_rate: 20,
      rating: 0,
      status: 'pending',
      bank_name: '',
      bank_account_number: '',
      bank_account_name: '',
      tax_id: '',
      description: '',
      website: '',
    },
  })

  // Auto-generate hotel_slug from English name
  const nameEn = watch('name_en')
  useEffect(() => {
    if (nameEn && nameEn.trim()) {
      const generatedSlug = generateHotelSlug(nameEn)
      setValue('hotel_slug', generatedSlug, { shouldValidate: true })
    }
  }, [nameEn, setValue])

  // Load hotel auth status
  const loadAuthStatusData = async (hotelId: string) => {
    try {
      const status = await loadHotelAuthStatus(hotelId)
      if (status) {
        setAuthStatus(status)
        setLoginEnabled(status.loginEnabled || false)
        // แสดงรหัสผ่านชั่วคราวถ้ามี
        if (status.temporaryPassword) {
          setTemporaryPassword(status.temporaryPassword)
        }
      }
    } catch (error) {
      console.error('Error loading auth status:', error)
    }
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        reset(editData)
        // Load auth status for existing hotel
        if (editData.id) {
          loadAuthStatusData(editData.id)
        }
      } else {
        reset({
          name_th: 'โรงแรมทดสอบ กรุงเทพฯ',
          name_en: 'Test Hotel Bangkok',
          hotel_slug: 'test-hotel-bangkok',
          contact_person: 'คุณสมชาย ใจดี',
          email: 'contact@testhotel.com',
          phone: '02-123-4567',
          address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
          latitude: 13.7563,
          longitude: 100.5018,
          commission_rate: 20,
          discount_rate: 20,
          rating: 4.5,
          status: 'pending',
          bank_name: 'ธนาคารกรุงเทพ',
          bank_account_number: '123-4-56789-0',
          bank_account_name: 'บริษัท โรงแรมทดสอบ จำกัด',
          tax_id: '0123456789012',
          description: 'โรงแรมระดับ 5 ดาว ใจกลางกรุงเทพฯ มีสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับนักท่องเที่ยวและนักธุรกิจ',
          website: 'https://www.testhotel.com',
        })
      }
      setSubmitError('')
      setSubmitSuccess(false)
    } else {
      // Reset auth state when modal closes
      setAuthStatus({ hasAccount: false })
      setLoginEnabled(false)
      setTemporaryPassword('')
      setShowPassword(false)
    }
  }, [isOpen, editData, reset])

  const onSubmit = async (data: HotelFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    try {
      if (editData?.id) {
        // Update existing hotel
        const { error } = await supabase
          .from('hotels')
          .update({
            name_th: data.name_th,
            name_en: data.name_en,
            hotel_slug: data.hotel_slug,
            contact_person: data.contact_person,
            email: data.email,
            phone: data.phone,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            commission_rate: data.commission_rate,
            discount_rate: data.discount_rate,
            rating: data.rating,
            status: data.status,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            tax_id: data.tax_id,
            description: data.description,
            website: data.website,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editData.id)

        if (error) throw error
      } else {
        // Create new hotel
        const { error } = await supabase.from('hotels').insert([
          {
            name_th: data.name_th,
            name_en: data.name_en,
            hotel_slug: data.hotel_slug,
            contact_person: data.contact_person,
            email: data.email,
            phone: data.phone,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            commission_rate: data.commission_rate,
            discount_rate: data.discount_rate,
            rating: data.rating,
            status: data.status,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            tax_id: data.tax_id,
            description: data.description,
            website: data.website,
          },
        ])

        if (error) throw error
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error submitting hotel:', error)
      setSubmitError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editData ? 'แก้ไขข้อมูลโรงแรม' : 'เพิ่มโรงแรมใหม่'}
                </h2>
                <p className="text-sm text-gray-500">
                  {editData ? 'อัพเดทข้อมูลโรงแรมในระบบ' : 'เพิ่มโรงแรมเข้าสู่ระบบ'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="max-h-[calc(100vh-300px)] space-y-6 overflow-y-auto pr-2">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Building className="h-5 w-5" />
                  ข้อมูลพื้นฐาน
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อโรงแรม (ภาษาไทย) *
                    </label>
                    <input
                      {...register('name_th')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="โรงแรมฮิลตัน กรุงเทพฯ"
                    />
                    {errors.name_th && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อโรงแรม (English) *
                    </label>
                    <input
                      {...register('name_en')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Hilton Bangkok"
                    />
                    {errors.name_en && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hotel Slug (URL สำหรับโรงแรม) *
                  </label>
                  <input
                    {...register('hotel_slug')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm bg-gray-50 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="hilton-bangkok"
                    readOnly={!editData} // Auto-generate for new hotels, allow edit for existing ones
                  />
                  {errors.hotel_slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.hotel_slug.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {editData
                      ? "สามารถแก้ไขได้หากจำเป็น (จะส่งผลต่อ URL ของโรงแรม)"
                      : "สร้างอัตโนมัติจากชื่อภาษาอังกฤษ - ใช้สำหรับ URL และระบุตัวตน"
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    คำอธิบาย (ถ้ามี)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="รายละเอียดเกี่ยวกับโรงแรม..."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <User className="h-5 w-5" />
                  ข้อมูลการติดต่อ
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อผู้ติดต่อ *
                    </label>
                    <input
                      {...register('contact_person')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="คุณสมชาย ใจดี"
                    />
                    {errors.contact_person && (
                      <p className="mt-1 text-sm text-red-600">{errors.contact_person.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เบอร์โทรศัพท์ *
                    </label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('phone')}
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="02-123-4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">อีเมล *</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('email')}
                        type="email"
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="contact@hotel.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เว็บไซต์ (ถ้ามี)
                    </label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('website')}
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="https://www.hotel.com"
                      />
                    </div>
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MapPin className="h-5 w-5" />
                  ที่ตั้ง
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ที่อยู่ *</label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                {/* Google Maps Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลือกตำแหน่งบนแผนที่
                  </label>
                  <GoogleMapsPicker
                    latitude={watch('latitude')}
                    longitude={watch('longitude')}
                    onLocationChange={(lat, lng) => {
                      setValue('latitude', lat, { shouldValidate: true })
                      setValue('longitude', lng, { shouldValidate: true })
                    }}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <DollarSign className="h-5 w-5" />
                  ข้อมูลทางธุรกิจ
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      อัตราค่าคอมมิชชั่น (%) *
                    </label>
                    <div className="relative mt-1">
                      <Percent className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('commission_rate')}
                        type="number"
                        step="0.01"
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="20"
                      />
                    </div>
                    {errors.commission_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.commission_rate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      อัตราค่าส่วนลด (%) *
                    </label>
                    <div className="relative mt-1">
                      <Percent className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('discount_rate')}
                        type="number"
                        step="0.01"
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="20"
                      />
                    </div>
                    {errors.discount_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.discount_rate.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      คะแนนรีวิว (Rating)
                    </label>
                    <div className="relative mt-1">
                      <Star className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400" />
                      <input
                        {...register('rating')}
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="4.5"
                      />
                    </div>
                    {errors.rating && (
                      <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">คะแนน 0-5 ดาว</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">สถานะ *</label>
                    <select
                      {...register('status')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เลขประจำตัวผู้เสียภาษี
                    </label>
                    <input
                      {...register('tax_id')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0123456789012"
                      maxLength={13}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CreditCard className="h-5 w-5" />
                  ข้อมูลการชำระเงิน
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อธนาคาร</label>
                    <input
                      {...register('bank_name')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="ธนาคารกรุงเทพ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เลขที่บัญชี
                    </label>
                    <input
                      {...register('bank_account_number')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="123-4-56789-0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ชื่อบัญชี</label>
                    <input
                      {...register('bank_account_name')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="บริษัท โรงแรมฮิลตัน จำกัด"
                    />
                  </div>
                </div>
              </div>

              {/* Login Account Management */}
              {editData?.id && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <KeyRound className="h-5 w-5" />
                    จัดการบัญชีผู้ใช้
                  </h3>

                  <div className="rounded-lg bg-gray-50 p-4">
                    {/* Login Status */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-5 w-5 ${authStatus.hasAccount ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">
                          สถานะบัญชี: {authStatus.hasAccount ? 'มีบัญชีแล้ว' : 'ยังไม่มีบัญชี'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        เข้าสู่ระบบล่าสุด: {formatLastLogin(authStatus.lastLogin || null)}
                      </div>
                    </div>

                    {/* Login Email */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        อีเมลสำหรับเข้าสู่ระบบ
                      </label>
                      <div className="text-sm text-gray-600 bg-white rounded border px-3 py-2">
                        {authStatus.loginEmail || watch('email') || 'ใช้อีเมลติดต่อหลัก'}
                      </div>
                    </div>

                    {/* Login Enable Toggle */}
                    <div className="mb-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={loginEnabled}
                          onChange={(e) => toggleLoginAccess(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!authStatus.hasAccount}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          เปิดใช้งานการเข้าสู่ระบบ
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        อนุญาตให้โรงแรมเข้าสู่ระบบผ่านแอปพลิเคชัน Hotel
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {!authStatus.hasAccount ? (
                        <button
                          type="button"
                          onClick={generateTemporaryPassword}
                          disabled={isGeneratingPassword || !watch('email')}
                          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGeneratingPassword ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          {isGeneratingPassword ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้ใช้'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={sendInvitationEmail}
                            disabled={isSendingInvitation}
                            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSendingInvitation ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {isSendingInvitation ? 'กำลังส่ง...' : 'ส่งอีเมลเชิญใช้งาน'}
                          </button>

                          <button
                            type="button"
                            onClick={resetPassword}
                            disabled={isResettingPassword}
                            className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isResettingPassword ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            {isResettingPassword ? 'กำลังรีเซ็ต...' : 'รีเซ็ตรหัสผ่าน'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Temporary Password Display */}
                    {temporaryPassword && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm font-semibold text-yellow-800">
                            รหัสผ่านชั่วคราวปัจจุบัน
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={temporaryPassword}
                                readOnly
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={copyPassword}
                            className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-sm"
                          >
                            <Copy className="h-4 w-4" />
                            คัดลอก
                          </button>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          โรงแรมต้องเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
                        </p>
                      </div>
                    )}

                    {/* Help Text */}
                    <div className="mt-4 text-xs text-gray-500">
                      <p className="mb-1">
                        • สร้างบัญชีผู้ใช้เพื่อให้โรงแรมสามารถเข้าสู่ระบบแอปพลิเคชัน Hotel ได้
                      </p>
                      <p className="mb-1">
                        • อีเมลเชิญใช้งานจะส่งไปยังอีเมลติดต่อของโรงแรม
                      </p>
                      <p>
                        • โรงแรมต้องเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error/Success Messages */}
            {submitError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            )}

            {submitSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">
                  {editData ? 'อัพเดทข้อมูลสำเร็จ!' : 'เพิ่มโรงแรมสำเร็จ!'}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'กำลังบันทึก...' : editData ? 'บันทึกการแก้ไข' : 'เพิ่มโรงแรม'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
