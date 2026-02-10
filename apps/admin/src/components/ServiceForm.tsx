import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ImageUpload } from './ImageUpload'
import {
  X,
  Upload,
  Globe,
  Clock,
  DollarSign,
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
    .max(50000, 'ราคาสูงสุด 50,000 บาท'),
  hotel_price: z.coerce
    .number({ required_error: 'ระบุราคาเป็นตัวเลข' })
    .min(50, 'ราคาขั้นต่ำ 50 บาท')
    .max(50000, 'ราคาสูงสุด 50,000 บาท'),
  staff_commission_rate: z.coerce
    .number({ required_error: 'ระบุเปอร์เซ็นต์เป็นตัวเลข' })
    .min(0, 'เปอร์เซ็นต์ขั้นต่ำ 0%')
    .max(100, 'เปอร์เซ็นต์สูงสุด 100%'),
  image_url: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().optional(),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: ServiceFormData & { id: string }
}

const categories = [
  { id: 'massage', name: 'นวด', nameEn: 'Massage', icon: Sparkles, color: 'purple' },
  { id: 'nail', name: 'เล็บ', nameEn: 'Nail', icon: Hand, color: 'pink' },
  { id: 'spa', name: 'สปา', nameEn: 'Spa', icon: Flower2, color: 'blue' },
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
      duration_options: [60], // Default 60 minutes
      base_price: undefined,
      hotel_price: undefined,
      staff_commission_rate: 25.00, // Default 25%
      image_url: '',
      is_active: true,
      sort_order: 0,
    },
  })

  const selectedCategory = watch('category')
  const hotelPrice = watch('hotel_price')
  const basePrice = watch('base_price')
  const nameEn = watch('name_en')
  const staffCommissionRate = watch('staff_commission_rate')

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
        hotel_price: editData.hotel_price || undefined,
        staff_commission_rate: editData.staff_commission_rate || 25.00,
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
        duration_options: [60],
        base_price: undefined,
        hotel_price: undefined,
        staff_commission_rate: 25.00,
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

  // Calculate discount percentage
  const discountPercentage = basePrice && hotelPrice
    ? Math.round(((basePrice - hotelPrice) / basePrice) * 100)
    : 0

  // Calculate staff commission
  const staffCommissionAmount = basePrice && staffCommissionRate
    ? Math.round((basePrice * (staffCommissionRate / 100)) * 100) / 100
    : 0

  const companyRevenue = basePrice && staffCommissionAmount
    ? Math.round((basePrice - staffCommissionAmount) * 100) / 100
    : 0

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
      // Clean data before submit
      const cleanData = {
        ...data,
        slug: data.slug || generateSlug(data.name_en),
        image_url: data.image_url || null,
        sort_order: data.sort_order || 0,
        // Keep both duration_options and duration for compatibility
        duration: data.duration_options[0], // Primary duration for backward compatibility
        duration_options: data.duration_options, // New multiple options
      }

      console.log('📝 Submitting service data:', cleanData)

      if (editData?.id) {
        // Update existing service
        const { error, data: result } = await supabase
          .from('services')
          .update(cleanData)
          .eq('id', editData.id)
          .select()

        console.log('✅ Update result:', result)
        if (error) {
          console.error('❌ Update error:', error)
          throw error
        }
      } else {
        // Create new service
        const { error, data: result } = await supabase
          .from('services')
          .insert(cleanData)
          .select()

        console.log('✅ Insert result:', result)
        if (error) {
          console.error('❌ Insert error:', error)
          throw error
        }
      }

      reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('❌ Service form error:', error)
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
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editData ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-amber-200 transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log('❌ Form validation errors:', errors)
            setSubmitError('กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง')
          })} className="p-6">
            {/* Category Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                ประเภทบริการ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setValue('category', cat.id as any)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-amber-900' : 'text-gray-600'}`}>
                        {cat.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-amber-600" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  ชื่อบริการ (ไทย)
                </label>
                <input
                  {...register('name_th')}
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="เช่น นวดไทย 2 ชั่วโมง"
                />
                {errors.name_th && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Service Name (English)
                </label>
                <input
                  {...register('name_en')}
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g. Thai Massage 2 Hours"
                />
                {errors.name_en && (
                  <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                )}
              </div>
            </div>

            {/* URL Slug */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">localhost:3002/services/</span>
                <input
                  {...register('slug')}
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="thai-massage-2hr"
                  readOnly={!!editData}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                URL ที่ใช้แสดงบริการ (สร้างอัตโนมัติจากชื่อภาษาอังกฤษ)
              </p>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รายละเอียด (ไทย)
                </label>
                <textarea
                  {...register('description_th')}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="คำอธิบายบริการ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (English)
                </label>
                <textarea
                  {...register('description_en')}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Service description..."
                />
              </div>
            </div>

            {/* Duration Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Clock className="w-4 h-4 inline mr-1" />
                ระยะเวลาบริการ (เลือกได้หลายตัวเลือก)
              </label>

              {/* Show current saved duration if editing */}
              {editData && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    📋 ระยะเวลาปัจจุบันที่บันทึกไว้:
                  </p>
                  <p className="text-sm text-blue-700">
                    {editData.duration} นาที
                    {editData.duration_options && Array.isArray(editData.duration_options)
                      ? ` (ตัวเลือก: ${editData.duration_options.join(', ')} นาที)`
                      : ' (ระบบเก่า: ใช้ระยะเวลาเดียว)'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {durationOptions.map((option) => {
                  const currentOptions = watch('duration_options') || []
                  const isSelected = currentOptions.includes(option.value)

                  return (
                    <label
                      key={option.value}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-amber-900' : 'text-gray-700'}`}>
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
              {errors.duration_options && (
                <p className="mt-2 text-sm text-red-600">{errors.duration_options.message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                💡 เลือกตัวเลือกระยะเวลาที่ต้องการให้บริการ (สามารถเลือกได้หลายตัวเลือก)
              </p>

              {/* Debug info for current selections */}
              {editData && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                  <p className="text-gray-600">
                    🔍 Debug: ตัวเลือกที่เลือกอยู่ = {JSON.stringify(watch('duration_options') || [])}
                  </p>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  ราคาปกติ (บาท)
                </label>
                <input
                  {...register('base_price')}
                  type="number"
                  min="100"
                  max="50000"
                  step="50"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="1000"
                />
                {errors.base_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.base_price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Package className="w-4 h-4 inline mr-1" />
                  ราคาโรงแรม (บาท)
                </label>
                <input
                  {...register('hotel_price')}
                  type="number"
                  min="50"
                  max="50000"
                  step="50"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="800"
                />
                {errors.hotel_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.hotel_price.message}</p>
                )}
              </div>

              <div className="flex items-end">
                <div className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">ส่วนลด</p>
                  <p className="text-lg font-semibold text-green-800">{discountPercentage}%</p>
                </div>
              </div>
            </div>

            {/* Commission Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                ค่าคอมมิชชั่น Staff
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เปอร์เซ็นต์ (%)
                  </label>
                  <input
                    {...register('staff_commission_rate')}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="25.00"
                  />
                  {errors.staff_commission_rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.staff_commission_rate.message}</p>
                  )}
                </div>

                <div className="flex items-end">
                  <div className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">รายได้ Staff</p>
                    <p className="text-lg font-semibold text-blue-800">{staffCommissionAmount} บาท</p>
                  </div>
                </div>

                <div className="flex items-end">
                  <div className="w-full px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-700">รายได้ บริษัท</p>
                    <p className="text-lg font-semibold text-purple-800">{companyRevenue} บาท</p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                💡 Staff จะได้รับค่าคอมมิชชั่น {staffCommissionRate || 0}% = {staffCommissionAmount} บาท จากราคา {basePrice || 0} บาท
              </p>
            </div>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  เปิดใช้งานบริการนี้
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ลำดับการแสดง
                </label>
                <input
                  {...register('sort_order', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0"
                />
              </div>
            </div>

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
                                {field === 'hotel_price' && 'ราคาโรงแรม'}
                                {field === 'staff_commission_rate' && 'คอมมิชชั่น'}
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

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-lg hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50"
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