import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
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
  Wallet,
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
// Map a Supabase/Postgres save error to a friendly Thai message — never surface raw dev text like
// `duplicate key value violates unique constraint "hotels_hotel_slug_key"` to the admin user.
function friendlyHotelSaveError(error: any): string {
  const code = error?.code
  const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  if (code === '23505' || text.includes('duplicate key') || text.includes('already exists')) {
    if (text.includes('slug')) return 'URL สำหรับโรงแรม (Slug) นี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนเป็นค่าอื่น'
    if (text.includes('email')) return 'อีเมลนี้ถูกใช้กับโรงแรมอื่นแล้ว กรุณาใช้อีเมลอื่น'
    if (text.includes('tax')) return 'เลขประจำตัวผู้เสียภาษีนี้ถูกใช้ไปแล้ว'
    return 'ข้อมูลบางส่วนซ้ำกับที่มีอยู่ในระบบแล้ว กรุณาตรวจสอบและลองใหม่'
  }
  return error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
}

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
  discount_amount: z.coerce
    .number({ required_error: 'ระบุจำนวนเงินส่วนลดเป็นตัวเลข' })
    .min(0, 'จำนวนเงินส่วนลดขั้นต่ำ 0 บาท')
    .max(10000, 'จำนวนเงินส่วนลดสูงสุด 10,000 บาท'),
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
  recommended_sales_staff: z.string().optional(),
  // Credit settings
  credit_days: z.coerce.number().min(1, 'จำนวนวันเครดิตขั้นต่ำ 1 วัน').max(365, 'จำนวนวันเครดิตสูงสุด 365 วัน').default(30),
  credit_start_date: z.string().optional().or(z.literal('')),
  credit_cycle_day: z.coerce.number().min(1, 'วันครบรอบขั้นต่ำ 1').max(31, 'วันครบรอบสูงสุด 31').optional().nullable(),
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
      toast.error('กรุณาบันทึกข้อมูลโรงแรมก่อนสร้างบัญชีผู้ใช้')
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
        toast.success('สร้างบัญชีผู้ใช้สำเร็จ!')
      } else {
        toast.error(result.error || 'ไม่สามารถสร้างบัญชีได้')
      }
    } catch (error: any) {
      console.error('Error creating account:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการสร้างบัญชี')
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
        toast.success('ส่งอีเมลเชิญใช้งานสำเร็จ!')
      } else {
        toast.error(result.error || 'ไม่สามารถส่งอีเมลได้')
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการส่งอีเมล')
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
        toast.success('รีเซ็ตรหัสผ่านสำเร็จ! รหัสผ่านชั่วคราวใหม่ถูกสร้างแล้ว')
      } else {
        toast.error(result.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้')
      }
    } catch (error: any) {
      console.error('Error resetting password:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
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
        toast.success(enabled ? 'เปิดใช้งานการเข้าสู่ระบบแล้ว' : 'ปิดใช้งานการเข้าสู่ระบบแล้ว')
      } else {
        toast.error(result.error || 'ไม่สามารถเปลี่ยนสถานะได้')
      }
    } catch (error: any) {
      console.error('Error toggling login access:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ')
    }
  }

  const copyPassword = async () => {
    const success = await copyToClipboard(temporaryPassword)
    if (success) {
      toast.success('คัดลอกรหัสผ่านแล้ว!')
    } else {
      toast.error('ไม่สามารถคัดลอกได้ กรุณาคัดลอกด้วยตนเอง')
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
      discount_amount: 0,
      rating: 0,
      status: 'pending',
      bank_name: '',
      bank_account_number: '',
      bank_account_name: '',
      tax_id: '',
      description: '',
      website: '',
      recommended_sales_staff: '',
      credit_days: 30,
      credit_start_date: '',
      credit_cycle_day: null,
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

  // Auto-fill credit_cycle_day from credit_start_date + credit_days
  const creditStartDate = watch('credit_start_date')
  const creditDays = watch('credit_days')
  useEffect(() => {
    if (creditStartDate && creditDays) {
      const start = new Date(creditStartDate)
      if (!isNaN(start.getTime())) {
        const dueDate = new Date(start)
        dueDate.setDate(dueDate.getDate() + Number(creditDays))
        setValue('credit_cycle_day', dueDate.getDate(), { shouldValidate: true })
      }
    }
  }, [creditStartDate, creditDays, setValue])

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
          discount_amount: 0,
          rating: 0,
          status: 'pending',
          bank_name: '',
          bank_account_number: '',
          bank_account_name: '',
          tax_id: '',
          description: '',
          website: '',
          recommended_sales_staff: '',
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
            discount_amount: data.discount_amount,
            rating: data.rating,
            status: data.status,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            tax_id: data.tax_id,
            description: data.description,
            website: data.website,
            recommended_sales_staff: data.recommended_sales_staff,
            credit_days: data.credit_days || 30,
            credit_start_date: data.credit_start_date || null,
            credit_cycle_day: data.credit_cycle_day || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editData.id)

        if (error) throw error
      } else {
        // Create new hotel
        const { data: newHotel, error } = await supabase.from('hotels').insert([
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
            discount_amount: data.discount_amount,
            rating: data.rating,
            status: data.status,
            bank_name: data.bank_name,
            bank_account_number: data.bank_account_number,
            bank_account_name: data.bank_account_name,
            tax_id: data.tax_id,
            description: data.description,
            website: data.website,
            recommended_sales_staff: data.recommended_sales_staff,
            credit_days: data.credit_days || 30,
            credit_start_date: data.credit_start_date || null,
            credit_cycle_day: data.credit_cycle_day || null,
          },
        ]).select('id').single()

        if (error) throw error

        // 🔐 สร้างบัญชีผู้ใช้สำหรับโรงแรมใหม่
        try {
          const authResult = await createHotelAccount({
            hotelId: newHotel.id,
            email: data.email,
            name: data.name_th,
          })

          if (authResult.success && authResult.temporaryPassword) {
            // แสดง temporary password ให้ admin
            setTemporaryPassword(authResult.temporaryPassword)
            setAuthStatus({
              hasAccount: true,
              loginEmail: authResult.loginEmail,
              passwordChangeRequired: true,
            })

            toast.success(`โรงแรมสร้างสำเร็จ! รหัสผ่านชั่วคราว: ${authResult.temporaryPassword}`, {
              duration: 8000,
            })
          } else {
            console.warn('Failed to create hotel auth account:', authResult.error)
            toast.error(`บันทึกข้อมูลโรงแรมสำเร็จ แต่ยังสร้างบัญชีเข้าใช้งานไม่ได้: ${authResult.error} — สามารถกด "สร้างบัญชี" อีกครั้งได้ในหน้าแก้ไขโรงแรม`, {
              duration: 7000,
            })
          }
        } catch (authError: any) {
          console.error('Error creating hotel auth account:', authError)
          toast.error(`โรงแรมสร้างสำเร็จ แต่เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้`, {
            duration: 6000,
          })
        }
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error submitting hotel:', error)
      setSubmitError(friendlyHotelSaveError(error))
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
        <div className="relative w-full max-w-4xl bg-white text-left shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white leading-tight">
                    {editData ? 'แก้ไขข้อมูลโรงแรม' : 'เพิ่มโรงแรมใหม่'}
                  </h2>
                  <p className="text-xs text-bliss-200">
                    {editData ? 'อัปเดตข้อมูลโรงแรมในระบบ' : 'กรอกข้อมูลเพื่อเพิ่มโรงแรมใหม่'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1" noValidate>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Basic Information */}
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <Building className="h-5 w-5 text-bliss-600" />
                  ข้อมูลพื้นฐาน
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      ชื่อโรงแรม (ภาษาไทย) *
                    </label>
                    <input
                      {...register('name_th')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="โรงแรมฮิลตัน กรุงเทพฯ"
                    />
                    {errors.name_th && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      ชื่อโรงแรม (English) *
                    </label>
                    <input
                      {...register('name_en')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="Hilton Bangkok"
                    />
                    {errors.name_en && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-bliss-700">
                    Hotel Slug (URL สำหรับโรงแรม) *
                  </label>
                  <input
                    {...register('hotel_slug')}
                    className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm bg-bliss-50 text-bliss-700 focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                    placeholder="hilton-bangkok"
                    readOnly={!editData} // Auto-generate for new hotels, allow edit for existing ones
                  />
                  {errors.hotel_slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.hotel_slug.message}</p>
                  )}
                  <p className="mt-1 text-xs text-bliss-500">
                    {editData
                      ? "สามารถแก้ไขได้หากจำเป็น (จะส่งผลต่อ URL ของโรงแรม)"
                      : "สร้างอัตโนมัติจากชื่อภาษาอังกฤษ - ใช้สำหรับ URL และระบุตัวตน"
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-bliss-700">
                    คำอธิบาย (ถ้ามี)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                    placeholder="รายละเอียดเกี่ยวกับโรงแรม..."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <User className="h-5 w-5 text-bliss-600" />
                  ข้อมูลการติดต่อ
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      ชื่อผู้ติดต่อ *
                    </label>
                    <input
                      {...register('contact_person')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="คุณสมชาย ใจดี"
                    />
                    {errors.contact_person && (
                      <p className="mt-1 text-sm text-red-600">{errors.contact_person.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      เบอร์โทรศัพท์ *
                    </label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-bliss-400" />
                      <input
                        {...register('phone')}
                        className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                        placeholder="02-123-4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">อีเมล *</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-bliss-400" />
                      <input
                        {...register('email')}
                        type="email"
                        className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                        placeholder="contact@hotel.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      เว็บไซต์ (ถ้ามี)
                    </label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-bliss-400" />
                      <input
                        {...register('website')}
                        className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                        placeholder="https://www.hotel.com"
                      />
                    </div>
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-bliss-700">
                      เซลล์ที่แนะนำ
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-bliss-400" />
                      <input
                        {...register('recommended_sales_staff')}
                        className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                        placeholder="ชื่อหรือรหัสเซลล์ที่แนะนำสำหรับโรงแรมนี้"
                      />
                    </div>
                    {errors.recommended_sales_staff && (
                      <p className="mt-1 text-sm text-red-600">{errors.recommended_sales_staff.message}</p>
                    )}
                    <p className="mt-1 text-xs text-bliss-500">
                      ระบุชื่อหรือรหัสพนักงานขายที่รับผิดชอบโรงแรมนี้
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Settings */}
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <CreditCard className="h-5 w-5 text-bliss-600" />
                  ตั้งค่าเครดิต
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">จำนวนวันเครดิต</label>
                    <input
                      type="number"
                      {...register('credit_days')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="30"
                      min={1}
                      max={365}
                    />
                    {errors.credit_days && (
                      <p className="mt-1 text-sm text-red-600">{errors.credit_days.message}</p>
                    )}
                    <p className="mt-1 text-xs text-bliss-500">ระยะเวลาเครดิต (วัน) ก่อนต้องชำระ</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">วันเริ่มรอบเครดิต</label>
                    <input
                      type="date"
                      {...register('credit_start_date')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                    />
                    <p className="mt-1 text-xs text-bliss-500">วันที่เริ่มนับรอบเครดิตแรก</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">วันครบรอบในเดือน</label>
                    <input
                      type="number"
                      {...register('credit_cycle_day')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="1"
                      min={1}
                      max={31}
                    />
                    {errors.credit_cycle_day && (
                      <p className="mt-1 text-sm text-red-600">{errors.credit_cycle_day.message}</p>
                    )}
                    <p className="mt-1 text-xs text-bliss-500">คำนวณอัตโนมัติจากวันเริ่มรอบ + จำนวนวัน (แก้ไขได้)</p>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <MapPin className="h-5 w-5 text-bliss-600" />
                  ที่ตั้ง
                </h3>

                <div>
                  <label className="block text-sm font-medium text-bliss-700">ที่อยู่ *</label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                    placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                {/* Google Maps Picker */}
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
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
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <Wallet className="h-5 w-5 text-bliss-600" />
                  ข้อมูลทางธุรกิจ
                </h3>

                <div>
                  <label className="block text-sm font-medium text-bliss-700">
                    จำนวนเงินส่วนลด (บาท) *
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bliss-500 font-semibold">฿</span>
                    <input
                      {...register('discount_amount')}
                      type="number"
                      step="1"
                      min="0"
                      max="10000"
                      className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="0"
                    />
                  </div>
                  {errors.discount_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.discount_amount.message}</p>
                  )}
                  <p className="mt-1 text-xs text-bliss-500">
                    จำนวนเงินคงที่ที่ลดให้ลูกค้า (เช่น 100 บาท, 500 บาท)
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      คะแนนรีวิว (Rating)
                    </label>
                    <div className="relative mt-1">
                      <Star className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-bliss-400" />
                      <input
                        {...register('rating')}
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        className="block w-full rounded-lg border border-bliss-300 py-2 pl-10 pr-3 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                        placeholder="4.5"
                      />
                    </div>
                    {errors.rating && (
                      <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                    )}
                    <p className="mt-1 text-xs text-bliss-500">คะแนน 0-5 ดาว</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">สถานะ *</label>
                    <select
                      {...register('status')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
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
                    <label className="block text-sm font-medium text-bliss-700">
                      เลขประจำตัวผู้เสียภาษี
                    </label>
                    <input
                      {...register('tax_id')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="0123456789012"
                      maxLength={13}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                  <CreditCard className="h-5 w-5 text-bliss-600" />
                  ข้อมูลการชำระเงิน
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700">ชื่อธนาคาร</label>
                    <input
                      {...register('bank_name')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="ธนาคารกรุงเทพ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700">
                      เลขที่บัญชี
                    </label>
                    <input
                      {...register('bank_account_number')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="123-4-56789-0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-bliss-700">ชื่อบัญชี</label>
                    <input
                      {...register('bank_account_name')}
                      className="mt-1 block w-full rounded-lg border border-bliss-300 px-3 py-2 shadow-sm focus:border-bliss-500 focus:outline-none focus:ring-1 focus:ring-bliss-500"
                      placeholder="บริษัท โรงแรมฮิลตัน จำกัด"
                    />
                  </div>
                </div>
              </div>

              {/* Login Account Management */}
              {editData?.id && (
                <div className="rounded-xl border border-bliss-200 p-5 space-y-4">
                  <h3 className="flex items-center gap-2.5 pb-3 mb-1 border-b border-bliss-100 text-lg font-bold text-bliss-900">
                    <KeyRound className="h-5 w-5 text-bliss-600" />
                    จัดการบัญชีผู้ใช้
                  </h3>

                  <div className="rounded-lg bg-bliss-50 p-4">
                    {/* Login Status */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-5 w-5 ${authStatus.hasAccount ? 'text-green-500' : 'text-bliss-400'}`} />
                        <span className="text-sm font-medium">
                          สถานะบัญชี: {authStatus.hasAccount ? 'มีบัญชีแล้ว' : 'ยังไม่มีบัญชี'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-bliss-600">
                        <Clock className="h-4 w-4" />
                        เข้าสู่ระบบล่าสุด: {formatLastLogin(authStatus.lastLogin || null)}
                      </div>
                    </div>

                    {/* Login Email */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-bliss-700 mb-2">
                        อีเมลสำหรับเข้าสู่ระบบ
                      </label>
                      <div className="text-sm text-bliss-600 bg-white rounded border px-3 py-2">
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
                          className="h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300 rounded"
                          disabled={!authStatus.hasAccount}
                        />
                        <span className="text-sm font-medium text-bliss-700">
                          เปิดใช้งานการเข้าสู่ระบบ
                        </span>
                      </label>
                      <p className="text-xs text-bliss-500 mt-1">
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
                          className="flex items-center justify-center gap-2 rounded-lg bg-bliss-600 px-4 py-2 text-sm font-medium text-white hover:bg-bliss-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="flex items-center justify-center gap-2 rounded-lg bg-bliss-600 px-4 py-2 text-sm font-medium text-white hover:bg-bliss-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="flex items-center justify-center gap-2 rounded-lg bg-bliss-500 px-4 py-2 text-sm font-medium text-white hover:bg-bliss-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="w-full px-3 py-2 bg-white border border-bliss-300 rounded text-sm font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-bliss-400 hover:text-bliss-600"
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
                            className="flex items-center gap-1 px-3 py-2 bg-bliss-100 hover:bg-bliss-200 border border-bliss-300 rounded text-sm"
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
                    <div className="mt-4 text-xs text-bliss-500">
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
            {(submitError || submitSuccess) && (
              <div className="flex-shrink-0 px-6 pt-4">
                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">{submitError}</p>
                  </div>
                )}
                {submitSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">
                      {editData ? 'อัพเดทข้อมูลสำเร็จ!' : 'เพิ่มโรงแรมสำเร็จ!'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex-shrink-0 flex justify-end gap-3 border-t border-bliss-200 bg-bliss-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-bliss-300 px-5 py-2.5 text-sm font-semibold text-bliss-700 hover:bg-bliss-100 transition"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-bliss-600 to-bliss-700 px-6 py-2.5 text-sm font-semibold text-white hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
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
