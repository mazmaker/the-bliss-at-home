import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Calendar,
  Percent,
  Tag,
  Gift,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Upload,
  Image,
  Trash2,
} from 'lucide-react'

interface Service {
  id: string
  name_th: string
  name_en: string
  category: string
}

interface PromotionFormData {
  name_th: string
  name_en: string
  name_cn?: string
  description_th?: string
  description_en?: string
  description_cn?: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
  discount_value: number
  min_order_amount?: number
  max_discount?: number
  usage_limit?: number
  usage_limit_per_user?: number
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'disabled'
  applies_to: 'all_services' | 'specific_services' | 'categories'
  target_services?: string[]
  target_categories?: string[]
  auto_generate_code: boolean
  code_prefix: string
  code_length: number
  image_url?: string
  is_public: boolean
}

interface PromotionFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: any
}

const categories = [
  { id: 'massage', name: 'นวด' },
  { id: 'nail', name: 'เล็บ' },
  { id: 'spa', name: 'สปา' },
]

export function PromotionForm({ isOpen, onClose, onSuccess, editData }: PromotionFormProps) {
  const [formData, setFormData] = useState<PromotionFormData>({
    name_th: '',
    name_en: '',
    name_cn: '',
    description_th: '',
    description_en: '',
    description_cn: '',
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_order_amount: undefined,
    max_discount: undefined,
    usage_limit: undefined,
    usage_limit_per_user: undefined,
    start_date: '',
    end_date: '',
    status: 'draft',
    applies_to: 'all_services',
    target_services: [],
    target_categories: [],
    auto_generate_code: false,
    code_prefix: '',
    code_length: 8,
    image_url: '',
    is_public: true,
  })

  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Load form data for editing
  useEffect(() => {
    if (editData) {
      setFormData({
        name_th: editData.name_th || '',
        name_en: editData.name_en || '',
        name_cn: editData.name_cn || '',
        description_th: editData.description_th || '',
        description_en: editData.description_en || '',
        description_cn: editData.description_cn || '',
        code: editData.code || '',
        discount_type: editData.discount_type || 'percentage',
        discount_value: editData.discount_value || 0,
        min_order_amount: editData.min_order_amount || undefined,
        max_discount: editData.max_discount || undefined,
        usage_limit: editData.usage_limit || undefined,
        usage_limit_per_user: editData.usage_limit_per_user || undefined,
        start_date: editData.start_date ? editData.start_date.split('T')[0] : '',
        end_date: editData.end_date ? editData.end_date.split('T')[0] : '',
        status: editData.status || 'draft',
        applies_to: editData.applies_to || 'all_services',
        target_services: editData.target_services || [],
        target_categories: editData.target_categories || [],
        auto_generate_code: editData.auto_generate_code || false,
        code_prefix: editData.code_prefix || '',
        code_length: editData.code_length || 8,
        image_url: editData.image_url || '',
        is_public: (editData as any).is_public ?? true,
      })
      setImagePreview(editData.image_url || '')
    } else {
      // Reset form for new promotion
      setFormData({
        name_th: '',
        name_en: '',
        name_cn: '',
        description_th: '',
        description_en: '',
        description_cn: '',
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_order_amount: undefined,
        max_discount: undefined,
        usage_limit: undefined,
        usage_limit_per_user: undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        applies_to: 'all_services',
        target_services: [],
        target_categories: [],
        auto_generate_code: false,
        code_prefix: '',
        code_length: 8,
        image_url: '',
        is_public: true,
      })
      setImagePreview('')
      setSelectedImage(null)
    }
  }, [editData, isOpen])

  // Load services
  useEffect(() => {
    if (isOpen) {
      fetchServices()
    }
  }, [isOpen])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name_th, name_en, category')
        .eq('is_active', true)
        .order('name_en')

      if (error) throw error
      setServices(data || [])
    } catch (err) {
      console.error('Error fetching services:', err)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = formData.code_prefix.toUpperCase()

    for (let i = 0; i < formData.code_length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    setFormData({ ...formData, code: result })
  }

  // Image handling functions

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      console.log('🖼️ Starting real image upload:', file.name, 'Size:', file.size, 'Type:', file.type)

      // Generate unique filename with proper extension
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `promotion_${Date.now()}.${fileExt}`

      console.log('📁 Uploading to bucket: promotion-images, filename:', fileName)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('promotion-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        })

      if (error) {
        console.error('❌ Storage upload failed:', error.message)
        console.error('Error details:', error)

        // Instead of falling back to placeholder, throw the error
        throw new Error(`การอัพโหลดรูปภาพล้มเหลว: ${error.message}`)
      }

      if (!data?.path) {
        throw new Error('ไม่ได้รับ path จากการอัพโหลด')
      }

      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('promotion-images')
        .getPublicUrl(fileName)

      console.log('✅ Real image uploaded successfully!')
      console.log('📍 Storage path:', data.path)
      console.log('🌐 Public URL:', publicUrl)

      // Verify the URL is accessible
      if (publicUrl && publicUrl.includes('supabase.co')) {
        console.log('🎉 Real image URL confirmed:', publicUrl)
        return publicUrl
      } else {
        throw new Error('ไม่สามารถสร้าง public URL ได้')
      }

    } catch (error: any) {
      console.error('💥 Upload failed completely:', error)
      setError(error.message || 'การอัพโหลดรูปภาพล้มเหลว')

      // Return null instead of placeholder - let the user retry
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        setError('ขนาดไฟล์ต้องไม่เกิน 2MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
        return
      }

      setSelectedImage(file)

      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview('')
    setFormData({ ...formData, image_url: '' })
  }


  const generateCouponCodes = async (promotionId: string, count: number = 5) => {
    try {
      const { data, error } = await supabase.rpc('create_coupon_codes_for_promotion', {
        promotion_id_param: promotionId,
        count: count
      })

      if (error) throw error

      const codes = data?.map((row: any) => row.code) || []
      setGeneratedCodes(codes)

      return codes
    } catch (err) {
      console.error('Error generating coupon codes:', err)
      throw err
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add a toast notification here
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.name_th || !formData.name_en || !formData.code) {
        throw new Error('กรุณากรอกข้อมูลที่จำเป็น')
      }

      if (formData.discount_value <= 0) {
        throw new Error('ส่วนลดต้องมากกว่า 0')
      }

      if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
        throw new Error('ส่วนลดเปอร์เซ็นต์ไม่ควรเกิน 100%')
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        throw new Error('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น')
      }

      // Upload image if selected
      let imageUrl = formData.image_url
      if (selectedImage) {
        console.log('🖼️ Processing image upload...')
        const uploadedUrl = await uploadImage(selectedImage)
        if (uploadedUrl) {
          console.log('✅ Image uploaded successfully, using real URL:', uploadedUrl)
          imageUrl = uploadedUrl
        } else {
          console.error('❌ Image upload failed, continuing without image')
          // Don't stop the form submission, just continue without the image
          imageUrl = '' // Clear any existing image URL
        }
      }

      // Prepare data for database (exclude image_url if column doesn't exist)
      const promotionData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        min_order_amount: formData.min_order_amount || null,
        max_discount: formData.max_discount || null,
        usage_limit: formData.usage_limit || null,
        usage_limit_per_user: formData.usage_limit_per_user || null,
        target_services: formData.applies_to === 'specific_services' ? formData.target_services : null,
        target_categories: formData.applies_to === 'categories' ? formData.target_categories : null,
      }

      // Add image_url only if we have a value (will be removed if column doesn't exist)
      if (imageUrl) {
        promotionData.image_url = imageUrl
      }

      let result

      if (editData) {
        // Update existing promotion
        const { data, error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editData.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new promotion
        const { data, error } = await supabase
          .from('promotions')
          .insert(promotionData)
          .select()
          .single()

        if (error) throw error
        result = data

        // Generate coupon codes if auto-generate is enabled
        if (formData.auto_generate_code) {
          await generateCouponCodes(result.id, 10)
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving promotion:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white leading-tight">
                  {editData ? 'แก้ไขโปรโมชัน' : 'เพิ่มโปรโมชันใหม่'}
                </h2>
                <p className="text-xs text-bliss-200">
                  {editData ? 'อัปเดตข้อมูลโปรโมชันที่มีอยู่' : 'กรอกข้อมูลเพื่อสร้างโปรโมชันใหม่'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Customer app visibility (secret promo) */}
          <div className="rounded-xl border border-bliss-200 p-4 bg-bliss-50/60">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-bliss-100 flex items-center justify-center flex-shrink-0">
                  {formData.is_public ? (
                    <Eye className="w-5 h-5 text-bliss-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-bliss-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-bliss-900">การแสดงผลในแอปลูกค้า</p>
                  <p className="text-xs text-bliss-500 mt-0.5">
                    {formData.is_public
                      ? 'แสดงในหน้าโปรโมชันทั้งหมด — ลูกค้าเห็นและกดใช้ได้'
                      : 'โปรโมชันไม่แสดงผลในหน้าโปรโมชัน ใช้ได้เฉพาะคนที่มีโค้ด'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_public}
                onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                  formData.is_public ? 'bg-bliss-600' : 'bg-bliss-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    formData.is_public ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                ชื่อโปรโมชัน (ไทย) *
              </label>
              <input
                type="text"
                value={formData.name_th}
                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                className="w-full px-4 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                placeholder="ส่วนลดสำหรับสมาชิกใหม่"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                ชื่อโปรโมชัน (อังกฤษ) *
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-4 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                placeholder="New Member Discount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                ชื่อโปรโมชัน (中文)
              </label>
              <input
                type="text"
                value={formData.name_cn}
                onChange={(e) => setFormData({ ...formData, name_cn: e.target.value })}
                className="w-full px-4 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-transparent"
                placeholder="新会员折扣"
              />
            </div>
          </div>


          {/* Code Generation */}
          <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              รหัสโปรโมชัน
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-bliss-700 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.auto_generate_code}
                    onChange={(e) => setFormData({ ...formData, auto_generate_code: e.target.checked })}
                    className="rounded border-bliss-300 text-bliss-600 focus:ring-bliss-500"
                  />
                  สร้างรหัสอัตโนมัติ
                </label>

                {formData.auto_generate_code && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="คำนำหน้า"
                      value={formData.code_prefix}
                      onChange={(e) => setFormData({ ...formData, code_prefix: e.target.value })}
                      className="px-3 py-2 border border-bliss-200 rounded-lg text-sm focus:ring-2 focus:ring-bliss-500"
                    />
                    <input
                      type="number"
                      min="4"
                      max="20"
                      value={formData.code_length}
                      onChange={(e) => setFormData({ ...formData, code_length: parseInt(e.target.value) || 8 })}
                      className="px-3 py-2 border border-bliss-200 rounded-lg text-sm focus:ring-2 focus:ring-bliss-500"
                      placeholder="ความยาว"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  รหัสโปรโมชัน *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="flex-1 px-3 py-2 border border-bliss-200 rounded-lg text-sm focus:ring-2 focus:ring-bliss-500 font-mono"
                    placeholder="SAVE20"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-bliss-600 text-white rounded-lg hover:bg-bliss-700 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              ส่วนลด
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  ประเภทส่วนลด *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                  required
                >
                  <option value="percentage">ลดเปอร์เซ็นต์ (%)</option>
                  <option value="fixed_amount">ลดจำนวนคงที่ (฿)</option>
                  <option value="buy_x_get_y">แถม</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  จำนวนส่วนลด *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                    placeholder={formData.discount_type === 'percentage' ? '20' : '200'}
                    required
                  />
                  {formData.discount_type === 'percentage' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-bliss-600 text-sm font-medium">%</span>
                    </div>
                  )}
                  {formData.discount_type === 'fixed_amount' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-bliss-600 text-sm font-medium">฿</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  ยอดขั้นต่ำ (฿)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                  placeholder="1000"
                />
              </div>

              {formData.discount_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    ลดสูงสุด (฿)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_discount || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                    placeholder="500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Service Targeting - Now visible by default */}
          <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              เป้าหมายบริการ
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  ใช้ได้กับ
                </label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                >
                  <option value="all_services">บริการทั้งหมด</option>
                  <option value="categories">หมวดหมู่เฉพาะ</option>
                  <option value="specific_services">บริการเฉพาะ</option>
                </select>
              </div>

              {formData.applies_to === 'categories' && (
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    เลือกหมวดหมู่บริการ
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 text-sm bg-white p-3 rounded-lg border border-bliss-200 hover:bg-bliss-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.target_categories?.includes(category.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                target_categories: [...(formData.target_categories || []), category.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                target_categories: formData.target_categories?.filter(c => c !== category.id)
                              })
                            }
                          }}
                          className="rounded border-bliss-300 text-bliss-600 focus:ring-bliss-500"
                        />
                        <span className="font-medium text-bliss-900">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.applies_to === 'specific_services' && (
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    เลือกบริการ
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-bliss-200 rounded-lg p-2 space-y-1 bg-white">
                    {services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm hover:bg-bliss-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.target_services?.includes(service.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                target_services: [...(formData.target_services || []), service.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                target_services: formData.target_services?.filter(s => s !== service.id)
                              })
                            }
                          }}
                          className="rounded border-bliss-300 text-bliss-600 focus:ring-bliss-500"
                        />
                        <span className="flex-1">{service.name_th}</span>
                        <span className="text-xs text-bliss-500">{service.name_en}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Limits - Now visible by default */}
          <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              ข้อจำกัดการใช้งาน
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  จำนวนครั้งทั้งหมด
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.usage_limit || ''}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                  placeholder="ไม่จำกัด"
                />
                <p className="text-xs text-bliss-600 mt-1">
                  จำนวนครั้งทั้งหมดที่โปรโมชันนี้สามารถใช้ได้ (เว้นว่างหมายถึงไม่จำกัด)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  จำนวนครั้งต่อคน
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.usage_limit_per_user || ''}
                  onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                  placeholder="ไม่จำกัด"
                />
                <p className="text-xs text-bliss-600 mt-1">
                  จำนวนครั้งสูงสุดที่ลูกค้า 1 คนใช้โปรโมชันนี้ได้ (เว้นว่างหมายถึงไม่จำกัด)
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-bliss-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-bliss-600 hover:text-bliss-800"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAdvanced ? 'ซ่อนการตั้งค่าขั้นสูง' : 'แสดงการตั้งค่าขั้นสูง'}
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-6">

            </div>
          )}

          {/* Dates and Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                วันที่เริ่มต้น *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                วันที่สิ้นสุด *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                สถานะ *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                required
              >
                <option value="draft">ร่าง</option>
                <option value="active">ใช้งาน</option>
                <option value="disabled">ระงับ</option>
              </select>
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                รายละเอียด (ไทย)
              </label>
              <textarea
                value={formData.description_th}
                onChange={(e) => setFormData({ ...formData, description_th: e.target.value })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                rows={3}
                placeholder="รายละเอียดและเงื่อนไขของโปรโมชัน"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                รายละเอียด (อังกฤษ)
              </label>
              <textarea
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                rows={3}
                placeholder="Promotion details and conditions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                รายละเอียด (中文)
              </label>
              <textarea
                value={formData.description_cn}
                onChange={(e) => setFormData({ ...formData, description_cn: e.target.value })}
                className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500"
                rows={3}
                placeholder="促销详情与条款"
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              ภาพประกอบโปรโมชัน
            </h3>

            <div className="space-y-4">
              {/* Current Image Display */}
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="ตัวอย่างภาพโปรโมชัน"
                    className="w-full h-48 object-cover rounded-lg border border-bliss-200"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {formData.image_url ? 'ภาพปัจจุบัน' : 'ภาพใหม่'}
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">
                  {imagePreview ? 'เปลี่ยนภาพ' : 'อัพโหลดภาพ'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onClick={(e) => { (e.currentTarget as HTMLInputElement).value = '' }}
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-bliss-200 rounded-lg focus:ring-2 focus:ring-bliss-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-bliss-100 file:text-bliss-700 hover:file:bg-bliss-200"
                />
                <p className="text-xs text-bliss-600 mt-1">
                  รองรับไฟล์: JPG, PNG, GIF (ขนาดสูงสุด 2MB)
                </p>
              </div>

              {/* Upload Progress */}
              {uploadingImage && (
                <div className="flex items-center gap-2 text-bliss-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">กำลังอัพโหลดภาพ...</span>
                </div>
              )}
            </div>
          </div>

          {/* Generated Coupon Codes Preview */}
          {generatedCodes.length > 0 && (
            <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-bliss-800 mb-3">รหัสคูปองที่สร้างขึ้น:</h3>
              <div className="grid grid-cols-3 gap-2">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <span className="font-mono text-sm flex-1">{code}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(code)}
                      className="p-1 hover:bg-bliss-100 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex justify-end gap-3 border-t border-bliss-200 bg-bliss-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-bliss-700 font-semibold hover:bg-bliss-100 transition"
              disabled={isLoading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-semibold hover:from-bliss-700 hover:to-bliss-800 shadow-sm disabled:opacity-50 transition"
            >
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {editData ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชัน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}