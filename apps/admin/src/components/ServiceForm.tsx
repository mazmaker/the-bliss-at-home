import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ImageUpload } from './ImageUpload'
// Removed pricingUtils imports - Admin now controls prices directly

// Simple duration label function
const getDurationLabel = (duration: number): string => {
  const labelMap: Record<number, string> = {
    60: '60 นาที (1 ชั่วโมง)',
    90: '90 นาที (1.5 ชั่วโมง)',
    120: '120 นาที (2 ชั่วโมง)'
  }
  return labelMap[duration] || `${duration} นาที`
}
import {
  X,
  Upload,
  Globe,
  Clock,
  Package,
  Sparkles,
  Hand,
  Flower2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'

// Validation schema
const serviceFormSchema = z.object({
  name_th: z.string().min(3, 'ชื่อภาษาไทยต้องมีอย่างน้อย 3 ตัวอักษร'),
  name_en: z.string().min(3, 'English name must be at least 3 characters'),
  slug: z.string().optional(),
  description_th: z.string().optional(),
  description_en: z.string().optional(),
  category: z.enum(['massage', 'nail', 'spa'], {
    required_error: 'กรุณาเลือกประเภทบริการ',
  }),
  duration_options: z.array(z.enum(['60', '90', '120'])).min(1, 'กรุณาเลือกระยะเวลาอย่างน้อย 1 ตัวเลือก').transform((arr) => arr.map(val => parseInt(val, 10))),
  base_price: z.coerce
    .number({ required_error: 'ระบุราคาเป็นตัวเลข' })
    .min(100, 'ราคาขั้นต่ำ 100 บาท')
    .max(50000, 'ราคาสูงสุด 50,000 บาท')
    .optional(),
  price_60: z.coerce
    .number({ required_error: 'ระบุราคา 60 นาทีเป็นตัวเลข' })
    .min(100, 'ราคาขั้นต่ำ 100 บาท')
    .max(50000, 'ราคาสูงสุด 50,000 บาท')
    .nullish(),
  price_90: z.coerce
    .number({ required_error: 'ระบุราคา 90 นาทีเป็นตัวเลข' })
    .min(100, 'ราคาขั้นต่ำ 100 บาท')
    .max(50000, 'ราคาสูงสุด 50,000 บาท')
    .nullish(),
  price_120: z.coerce
    .number({ required_error: 'ระบุราคา 120 นาทีเป็นตัวเลข' })
    .min(100, 'ราคาขั้นต่ำ 100 บาท')
    .max(50000, 'ราคาสูงสุด 50,000 บาท')
    .nullish(),
  staff_commission_rate: z.coerce
    .number({ required_error: 'ระบุเปอร์เซ็นต์เป็นตัวเลข' })
    .min(0, 'เปอร์เซ็นต์ขั้นต่ำ 0%')
    .max(100, 'เปอร์เซ็นต์สูงสุด 100%'),
  // Fixed rate earnings fields
  use_fixed_rate: z.boolean().default(false),
  staff_earning_60: z.coerce
    .number({ required_error: 'ระบุรายได้ staff 60 นาทีเป็นตัวเลข' })
    .min(50, 'รายได้ขั้นต่ำ 50 บาท')
    .max(10000, 'รายได้สูงสุด 10,000 บาท')
    .nullish(),
  staff_earning_90: z.coerce
    .number({ required_error: 'ระบุรายได้ staff 90 นาทีเป็นตัวเลข' })
    .min(50, 'รายได้ขั้นต่ำ 50 บาท')
    .max(10000, 'รายได้สูงสุด 10,000 บาท')
    .nullish(),
  staff_earning_120: z.coerce
    .number({ required_error: 'ระบุรายได้ staff 120 นาทีเป็นตัวเลข' })
    .min(50, 'รายได้ขั้นต่ำ 50 บาท')
    .max(10000, 'รายได้สูงสุด 10,000 บาท')
    .nullish(),
  image_url: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().optional(),
}).refine((data) => {
  // Validate that required price fields are provided based on duration_options
  if (!data.duration_options || data.duration_options.length === 0) {
    return false
  }

  // Check if prices are provided for selected durations
  for (const duration of data.duration_options) {
    if (duration === 60 && (!data.price_60 || data.price_60 <= 0)) {
      return false
    }
    if (duration === 90 && (!data.price_90 || data.price_90 <= 0)) {
      return false
    }
    if (duration === 120 && (!data.price_120 || data.price_120 <= 0)) {
      return false
    }
  }

  return true
}, {
  message: 'กรุณากรอกราคาที่ถูกต้องสำหรับทุกระยะเวลาที่เลือก',
  path: ['price_60'], // Show error on price fields instead
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: ServiceFormData & { id: string }
}

const categories = [
  { id: 'massage', name: 'นวด', nameEn: 'Massage', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', nameEn: 'Nail', icon: Hand },
  { id: 'spa', name: 'สปา', nameEn: 'Spa', icon: Flower2 },
]

const durationOptions = [
  { value: '60', label: '60 นาที (1 ชั่วโมง)' },
  { value: '90', label: '90 นาที (1.5 ชั่วโมง)' },
  { value: '120', label: '120 นาที (2 ชั่วโมง)' },
]

// Function to generate slug from text
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single hyphen
    .trim()
}

export function ServiceForm({ isOpen, onClose, onSuccess, editData }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadError, setUploadError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: editData || {
      name_th: '',
      name_en: '',
      slug: '',
      description_th: '',
      description_en: '',
      category: undefined,
      duration_options: [], // No default - user must choose
      base_price: undefined,
      price_60: undefined,
      price_90: undefined,
      price_120: undefined,
      staff_commission_rate: 25.00, // Default 25%
      use_fixed_rate: false, // Default to commission
      staff_earning_60: undefined,
      staff_earning_90: undefined,
      staff_earning_120: undefined,
      image_url: '',
      is_active: true,
      sort_order: 0,
    },
  })

  const selectedCategory = watch('category')
  const basePrice = watch('base_price')
  const price60 = watch('price_60')
  const price90 = watch('price_90')
  const price120 = watch('price_120')
  const nameEn = watch('name_en')
  const staffCommissionRate = watch('staff_commission_rate')
  const selectedDurations = watch('duration_options') || []
  const useFixedRate = watch('use_fixed_rate')

  // Load form data when editing
  useEffect(() => {
    if (editData && isOpen) {
      console.log('🔄 Loading edit data:', editData)

      // Convert single duration to array format for multiple selection
      let durationOptionsArray = ['60'] // default
      if (editData.duration_options && Array.isArray(editData.duration_options)) {
        // If duration_options exists (when migration is applied)
        durationOptionsArray = editData.duration_options.map(d => d.toString())
      } else if (editData.duration) {
        // Convert single duration to array format (current database structure)
        durationOptionsArray = [editData.duration.toString()]
      }

      console.log('📋 Duration options array:', durationOptionsArray)
      console.log('🔄 Original duration:', editData.duration)
      console.log('🔄 Original duration_options:', editData.duration_options)

      // Reset form with edit data
      reset({
        name_th: editData.name_th || '',
        name_en: editData.name_en || '',
        slug: editData.slug || '',
        description_th: editData.description_th || '',
        description_en: editData.description_en || '',
        category: editData.category || undefined,
        duration_options: durationOptionsArray,
        base_price: editData.base_price || undefined,
        price_60: editData.price_60 || undefined,
        price_90: editData.price_90 || undefined,
        price_120: editData.price_120 || undefined,
        staff_commission_rate: editData.staff_commission_rate != null ? editData.staff_commission_rate * 100 : 25.00,
        use_fixed_rate: editData.use_fixed_rate || false,
        staff_earning_60: editData.staff_earning_60 || undefined,
        staff_earning_90: editData.staff_earning_90 || undefined,
        staff_earning_120: editData.staff_earning_120 || undefined,
        image_url: editData.image_url || '',
        is_active: editData.is_active !== undefined ? editData.is_active : true,
        sort_order: editData.sort_order || 0,
      })
    } else if (!editData && isOpen) {
      // Reset form for new service
      reset({
        name_th: '',
        name_en: '',
        slug: '',
        description_th: '',
        description_en: '',
        category: undefined,
        duration_options: [], // No default - user must choose
        base_price: undefined,
        price_60: undefined,
        price_90: undefined,
        price_120: undefined,
        staff_commission_rate: 25.00,
        use_fixed_rate: false,
        staff_earning_60: undefined,
        staff_earning_90: undefined,
        staff_earning_120: undefined,
        image_url: '',
        is_active: true,
        sort_order: 0,
      })
    }
  }, [editData, isOpen, reset])

  // Auto-generate slug when name_en changes
  useEffect(() => {
    if (nameEn && !editData) {
      setValue('slug', generateSlug(nameEn))
    }
  }, [nameEn, setValue, editData])

  // Handle image upload success
  const handleUploadComplete = (imageUrl: string) => {
    setValue('image_url', imageUrl)
    setUploadError('')
  }

  // Handle image upload error
  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Clean data before submit - now including duration_options!
      const cleanData = {
        ...data,
        slug: data.slug || generateSlug(data.name_en),
        image_url: data.image_url || null,
        sort_order: data.sort_order || 0,
        // Set base_price from first available per-duration price
        base_price: data.base_price ?? data.price_60 ?? data.price_90 ?? data.price_120,
        // hotel_price defaults to base_price if not set (required column)
        hotel_price: data.base_price ?? data.price_60 ?? data.price_90 ?? data.price_120,
        // Convert commission from percentage (25) to fraction (0.25) for DB storage
        staff_commission_rate: data.staff_commission_rate / 100,
        // Fixed rate earnings fields
        use_fixed_rate: data.use_fixed_rate || false,
        staff_earning_60: data.staff_earning_60 || null,
        staff_earning_90: data.staff_earning_90 || null,
        staff_earning_120: data.staff_earning_120 || null,
        // Set duration from the first selected option for backward compatibility
        duration: data.duration_options[0], // Primary duration for backward compatibility
        // duration_options is now included since database column exists
        duration_options: data.duration_options, // Save multiple duration options
      }

      console.log('📝 Submitting service data:', cleanData)
      console.log('🔍 Form data check:')
      console.log('  - Duration (primary):', data.duration_options[0])
      console.log('  - Available options (SAVING):', data.duration_options)
      console.log('  - Will save to database:', cleanData.duration_options)

      // Debug commission/earnings
      console.log('👩‍💼 COMMISSION DEBUG:')
      console.log('  - Form staff_commission_rate (%):', data.staff_commission_rate)
      console.log('  - CleanData staff_commission_rate (decimal):', cleanData.staff_commission_rate)
      console.log('  - use_fixed_rate:', cleanData.use_fixed_rate)
      console.log('  - staff_earning_60:', cleanData.staff_earning_60)
      console.log('  - staff_earning_90:', cleanData.staff_earning_90)
      console.log('  - staff_earning_120:', cleanData.staff_earning_120)

      if (editData?.id) {
        // Update existing service
        const { error, data: result } = await supabase
          .from('services')
          .update(cleanData)
          .eq('id', editData.id)
          .select()

        console.log('✅ Update result:', result)
        if (result && result[0]) {
          console.log('👩‍💼 DB RETURNED COMMISSION:')
          console.log('  - DB staff_commission_rate:', result[0].staff_commission_rate, '→', (result[0].staff_commission_rate * 100).toFixed(1) + '%')
          console.log('  - DB use_fixed_rate:', result[0].use_fixed_rate)
          console.log('  - DB staff_earning_60:', result[0].staff_earning_60)
          console.log('  - DB staff_earning_90:', result[0].staff_earning_90)
          console.log('  - DB staff_earning_120:', result[0].staff_earning_120)
        }
        if (error) {
          console.error('Update error:', error)
          console.error('Full error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
      } else {
        // Create new service
        const { error, data: result } = await supabase
          .from('services')
          .insert(cleanData)
          .select()

        console.log('✅ Insert result:', result)
        if (result && result[0]) {
          console.log('DATABASE RETURNED PRICES:')
          console.log('  - DB price_60:', result[0].price_60)
          console.log('  - DB price_90:', result[0].price_90)
          console.log('  - DB price_120:', result[0].price_120)
          console.log('  - DB base_price:', result[0].base_price)
          console.log('  - DB hotel_price:', result[0].hotel_price)
        }
        if (error) {
          console.error('Insert error:', error)
          console.error('Full error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
      }

      reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Service form error:', error)
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก'
      setSubmitError(`บันทึกไม่สำเร็จ: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative w-full max-w-4xl bg-white text-left shadow-2xl rounded-2xl transition-all sm:my-8 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white leading-tight">
                    {editData ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}
                  </h3>
                  <p className="text-xs text-bliss-200">
                    {editData ? 'อัปเดตข้อมูลบริการที่มีอยู่' : 'กรอกข้อมูลเพื่อสร้างบริการใหม่'}
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
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log('Form validation errors:', errors)
            console.log('DEBUGGING FORM ERRORS - these might be causing orange warning!')
            Object.entries(errors).forEach(([field, error]) => {
              console.log(`  Field: ${field}, Error:`, error)
            })
            setSubmitError('กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง')
          })} className="flex flex-col min-h-0 flex-1" noValidate>
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Section: ข้อมูลบริการ ── */}
            <div className="rounded-xl border border-bliss-200 p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                <Package className="w-5 h-5 text-bliss-600" />
                <h4 className="text-lg font-bold text-bliss-900">ข้อมูลบริการ</h4>
              </div>

            {/* Category Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-bliss-700 mb-2 block">
                ประเภทบริการ
              </label>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setValue('category', cat.id as any, { shouldValidate: true })}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                        isSelected
                          ? 'border-bliss-500 bg-bliss-50'
                          : 'border-bliss-200 hover:border-bliss-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-bliss-600' : 'text-bliss-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-bliss-900' : 'text-bliss-600'}`}>
                        {cat.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-bliss-600" />
                      )}
                    </button>
                  )
                })}
              </div>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>

            {/* Service Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  ชื่อบริการ (ไทย)
                </label>
                <input
                  {...register('name_th')}
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="เช่น นวดไทย 2 ชั่วโมง"
                />
                {errors.name_th && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Service Name (English)
                </label>
                <input
                  {...register('name_en')}
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="e.g. Thai Massage 2 Hours"
                />
                {errors.name_en && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                )}
              </div>
            </div>

            {/* URL Slug */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-bliss-700 mb-1">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-bliss-500 whitespace-nowrap">customer.theblissmassageathome.com/services/</span>
                <input
                  {...register('slug')}
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="thai-massage-2hr"
                  readOnly={!!editData}
                />
              </div>
              <p className="mt-1 text-xs text-bliss-500">
                URL ที่ใช้แสดงบริการ (สร้างอัตโนมัติจากชื่อภาษาอังกฤษ)
              </p>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  รายละเอียด (ไทย)
                </label>
                <textarea
                  {...register('description_th')}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="คำอธิบายบริการ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  {...register('description_en')}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="Service description..."
                />
              </div>
            </div>

            </div>{/* end Section: ข้อมูลบริการ */}

            {/* ── Section: ระยะเวลา & ราคา ── */}
            <div className="rounded-xl border border-bliss-200 p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                <Clock className="w-5 h-5 text-bliss-600" />
                <h4 className="text-lg font-bold text-bliss-900">ระยะเวลา &amp; ราคา</h4>
              </div>

            {/* Duration Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-bliss-700 mb-3">
                <Clock className="w-4 h-4 inline mr-1" />
                ระยะเวลาบริการ (เลือกได้หลายตัวเลือก)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {durationOptions.map((option) => {
                  const currentOptions = watch('duration_options') || []
                  const isSelected = currentOptions.includes(option.value)

                  return (
                    <label
                      key={option.value}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-bliss-500 bg-bliss-50'
                          : 'border-bliss-200 hover:border-bliss-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Add option to array
                            setValue('duration_options', [...currentOptions, option.value])
                          } else {
                            // Remove option from array
                            setValue('duration_options', currentOptions.filter(val => val !== option.value))
                          }
                        }}
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-bliss-500 bg-bliss-500'
                          : 'border-bliss-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-bliss-900' : 'text-bliss-700'}`}>
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
              {errors.duration_options && (
                <p className="mt-2 text-sm text-red-600">{errors.duration_options.message}</p>
              )}

            </div>

            {/* Pricing */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-bliss-700 mb-3">
                <span className="inline-block mr-1 font-bold text-bliss-600">฿</span>
                ราคาบริการตามระยะเวลา
              </label>
              <p className="text-xs text-bliss-500 mb-4">
                เลือกระยะเวลาที่ต้องการด้านบน จากนั้นกรอกราคาสำหรับแต่ละระยะเวลาที่เลือก
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Price for 60 minutes */}
                {selectedDurations.includes('60') && (
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      ราคา 60 นาที
                    </label>
                    <input
                      {...register('price_60')}
                      type="number"
                      min="100"
                      max="50000"
                      step="10"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="690"
                    />
                    {errors.price_60 && (
                      <p className="mt-1 text-sm text-red-600">{errors.price_60.message}</p>
                    )}
                  </div>
                )}

                {/* Price for 90 minutes */}
                {selectedDurations.includes('90') && (
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      ราคา 90 นาที
                    </label>
                    <input
                      {...register('price_90')}
                      type="number"
                      min="100"
                      max="50000"
                      step="10"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="990"
                    />
                    {errors.price_90 && (
                      <p className="mt-1 text-sm text-red-600">{errors.price_90.message}</p>
                    )}
                  </div>
                )}

                {/* Price for 120 minutes */}
                {selectedDurations.includes('120') && (
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      ราคา 120 นาที
                    </label>
                    <input
                      {...register('price_120')}
                      type="number"
                      min="100"
                      max="50000"
                      step="10"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="1280"
                    />
                    {errors.price_120 && (
                      <p className="mt-1 text-sm text-red-600">{errors.price_120.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Helper message when no durations selected */}
              {selectedDurations.length === 0 && (
                <div className="mt-4 p-4 bg-bliss-50 border border-bliss-200 rounded-lg">
                  <p className="text-sm text-bliss-800">
                    กรุณาเลือกระยะเวลาบริการด้านบนก่อน จากนั้นช่องกรอกราคาจะปรากฏขึ้น
                  </p>
                </div>
              )}
            </div>

            {/* Fixed Pricing Preview */}
            {(price60 || price90 || price120) && (
              <div className="mb-4 p-4 bg-bliss-50 border border-bliss-200 rounded-lg">
                <h4 className="text-sm font-medium text-bliss-800 mb-3">
                  ตารางราคาที่กำหนด
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedDurations.map(duration => {
                    let price = 0
                    let priceEntered = false

                    switch (duration) {
                      case '60':
                        price = price60 || 0
                        priceEntered = !!price60
                        break
                      case '90':
                        price = price90 || 0
                        priceEntered = !!price90
                        break
                      case '120':
                        price = price120 || 0
                        priceEntered = !!price120
                        break
                      default:
                        return null
                    }

                    return (
                      <div
                        key={duration}
                        className={`p-3 rounded-lg border-2 ${
                          priceEntered
                            ? 'border-bliss-500 bg-bliss-100'
                            : 'border-bliss-200 bg-bliss-50'
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          priceEntered ? 'text-bliss-800' : 'text-bliss-600'
                        }`}>
                          {getDurationLabel(parseInt(duration))}
                        </p>
                        <p className={`text-lg font-bold ${
                          priceEntered ? 'text-bliss-900' : 'text-bliss-400'
                        }`}>
                          {priceEntered ? price.toLocaleString() : '---'} บาท
                        </p>
                        {!priceEntered && (
                          <p className="text-xs text-bliss-500">
                            รอการกรอกราคา
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-bliss-600">
                  ราคาที่กรอกจะถูกบันทึกและใช้แสดงให้ลูกค้าโดยตรง
                </p>
              </div>
            )}

            </div>{/* end Section: ระยะเวลา & ราคา */}

            {/* ── Section: รายได้ Staff ── */}
            <div className="rounded-xl border border-bliss-200 p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                <TrendingUp className="w-5 h-5 text-bliss-600" />
                <h4 className="text-lg font-bold text-bliss-900">รายได้ Staff</h4>
              </div>

            {/* Staff Earnings */}
            <div>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setValue('use_fixed_rate', false, { shouldValidate: true })}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    !useFixedRate
                      ? 'border-bliss-500 bg-bliss-50 text-bliss-700'
                      : 'border-bliss-200 text-bliss-500 hover:border-bliss-300'
                  }`}
                >
                  Commission (%)
                </button>
                <button
                  type="button"
                  onClick={() => setValue('use_fixed_rate', true, { shouldValidate: true })}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    useFixedRate
                      ? 'border-bliss-500 bg-bliss-50 text-bliss-700'
                      : 'border-bliss-200 text-bliss-500 hover:border-bliss-300'
                  }`}
                >
                  Fixed Rate (฿)
                </button>
              </div>

              {!useFixedRate && (
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      {...register('staff_commission_rate')}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 text-center text-lg font-semibold"
                      placeholder="25"
                    />
                    <span className="text-bliss-600 font-medium text-lg">%</span>
                    <span className="text-sm text-bliss-400">จากราคาที่ลูกค้าจ่าย</span>
                  </div>
                  {errors.staff_commission_rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.staff_commission_rate.message}</p>
                  )}
                </div>
              )}

              {useFixedRate && (
                <div className="space-y-3">
                  {selectedDurations.length === 0 && (
                    <p className="text-sm text-bliss-600 bg-bliss-50 border border-bliss-200 rounded-lg px-3 py-2">
                      กรุณาเลือกระยะเวลาบริการก่อน
                    </p>
                  )}
                  {selectedDurations.includes('60') && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-bliss-700 w-16 shrink-0">60 นาที</span>
                      <span className="text-bliss-400 shrink-0">→ Staff ได้</span>
                      <input
                        {...register('staff_earning_60')}
                        type="number"
                        min="50"
                        max="10000"
                        step="10"
                        className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 text-center font-semibold"
                        placeholder="400"
                      />
                      <span className="text-bliss-600 shrink-0">บาท</span>
                      {errors.staff_earning_60 && (
                        <p className="text-sm text-red-600">{errors.staff_earning_60.message}</p>
                      )}
                    </div>
                  )}
                  {selectedDurations.includes('90') && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-bliss-700 w-16 shrink-0">90 นาที</span>
                      <span className="text-bliss-400 shrink-0">→ Staff ได้</span>
                      <input
                        {...register('staff_earning_90')}
                        type="number"
                        min="50"
                        max="10000"
                        step="10"
                        className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 text-center font-semibold"
                        placeholder="600"
                      />
                      <span className="text-bliss-600 shrink-0">บาท</span>
                      {errors.staff_earning_90 && (
                        <p className="text-sm text-red-600">{errors.staff_earning_90.message}</p>
                      )}
                    </div>
                  )}
                  {selectedDurations.includes('120') && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-bliss-700 w-16 shrink-0">120 นาที</span>
                      <span className="text-bliss-400 shrink-0">→ Staff ได้</span>
                      <input
                        {...register('staff_earning_120')}
                        type="number"
                        min="50"
                        max="10000"
                        step="10"
                        className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 text-center font-semibold"
                        placeholder="800"
                      />
                      <span className="text-bliss-600 shrink-0">บาท</span>
                      {errors.staff_earning_120 && (
                        <p className="text-sm text-red-600">{errors.staff_earning_120.message}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            </div>{/* end Section: รายได้ Staff */}

            {/* ── Section: รูปภาพ & การตั้งค่า ── */}
            <div className="rounded-xl border border-bliss-200 p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                <Upload className="w-5 h-5 text-bliss-600" />
                <h4 className="text-lg font-bold text-bliss-900">รูปภาพ &amp; การตั้งค่า</h4>
              </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                รูปภาพบริการ
              </label>
              <ImageUpload
                currentImageUrl={editData?.image_url}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                disabled={isSubmitting}
                folder={selectedCategory || 'general'}
                maxSizeMB={5}
              />
              {uploadError && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {uploadError}
                </p>
              )}
              {errors.image_url && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.image_url.message}
                </p>
              )}
            </div>

            {/* Status and Sort Order */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center">
                <input
                  {...register('is_active')}
                  type="checkbox"
                  id="is_active"
                  className="h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-bliss-700">
                  เปิดใช้งานบริการนี้
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  ลำดับการแสดง
                </label>
                <input
                  {...register('sort_order', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  placeholder="0"
                />
              </div>
            </div>

            </div>{/* end Section: รูปภาพ & การตั้งค่า */}

            {/* Error Messages */}
            {(submitError || Object.keys(errors).length > 0) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {submitError && (
                      <p className="text-sm text-red-700 mb-2">{submitError}</p>
                    )}
                    {Object.keys(errors).length > 0 && (
                      <div className="text-sm text-red-700">
                        <p className="font-medium mb-1">กรุณาแก้ไขข้อมูลต่อไปนี้:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {Object.entries(errors).map(([field, error]) => (
                            <li key={field}>
                              <strong>
                                {field === 'name_th' && 'ชื่อภาษาไทย'}
                                {field === 'name_en' && 'ชื่อภาษาอังกฤษ'}
                                {field === 'category' && 'ประเภทบริการ'}
                                {field === 'duration_options' && 'ระยะเวลาบริการ'}
                                {field === 'base_price' && 'ราคาปกติ'}
                                {field === 'price_60' && 'ราคา 60 นาที'}
                                {field === 'price_90' && 'ราคา 90 นาที'}
                                {field === 'price_120' && 'ราคา 120 นาที'}
                                {field === 'staff_commission_rate' && 'คอมมิชชั่น'}
                                {field === 'staff_earning_60' && 'รายได้ Staff 60 นาที'}
                                {field === 'staff_earning_90' && 'รายได้ Staff 90 นาที'}
                                {field === 'staff_earning_120' && 'รายได้ Staff 120 นาที'}
                                {field === 'image_url' && 'รูปภาพ'}
                              </strong>: {error?.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>{/* end Scrollable Body */}

            {/* Sticky Footer */}
            <div className="flex-shrink-0 flex justify-end gap-3 border-t border-bliss-200 bg-bliss-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-bliss-700 bg-white border border-bliss-300 rounded-xl hover:bg-bliss-100 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : editData ? 'บันทึกการแก้ไข' : 'เพิ่มบริการ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}