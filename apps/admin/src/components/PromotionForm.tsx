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
  description_th?: string
  description_en?: string
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
  { id: 'facial', name: 'เฟเชียล' },
]

export function PromotionForm({ isOpen, onClose, onSuccess, editData }: PromotionFormProps) {
  const [formData, setFormData] = useState<PromotionFormData>({
    name_th: '',
    name_en: '',
    description_th: '',
    description_en: '',
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
  })

  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  // Load form data for editing
  useEffect(() => {
    if (editData) {
      setFormData({
        name_th: editData.name_th || '',
        name_en: editData.name_en || '',
        description_th: editData.description_th || '',
        description_en: editData.description_en || '',
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
      })
    } else {
      // Reset form for new promotion
      setFormData({
        name_th: '',
        name_en: '',
        description_th: '',
        description_en: '',
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
      })
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

      // Prepare data for database
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {editData ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {editData ? 'แก้ไขข้อมูลโปรโมชั่นที่มีอยู่' : 'สร้างโปรโมชั่นใหม่สำหรับลูกค้า'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                ชื่อโปรโมชั่น (ไทย) *
              </label>
              <input
                type="text"
                value={formData.name_th}
                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="ส่วนลดสำหรับสมาชิกใหม่"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                ชื่อโปรโมชั่น (อังกฤษ) *
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="New Member Discount"
                required
              />
            </div>
          </div>

          {/* Code Generation */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              รหัสโปรโมชั่น
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-amber-700 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.auto_generate_code}
                    onChange={(e) => setFormData({ ...formData, auto_generate_code: e.target.checked })}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
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
                      className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      min="4"
                      max="20"
                      value={formData.code_length}
                      onChange={(e) => setFormData({ ...formData, code_length: parseInt(e.target.value) || 8 })}
                      className="px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      placeholder="ความยาว"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">
                  รหัสโปรโมชั่น *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                    placeholder="SAVE20"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              ส่วนลด
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  ประเภทส่วนลด *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="percentage">ลดเปอร์เซ็นต์ (%)</option>
                  <option value="fixed_amount">ลดจำนวนคงที่ (฿)</option>
                  <option value="buy_x_get_y">ซื้อ X ได้ Y</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  จำนวนส่วนลด *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  ยอดขั้นต่ำ (฿)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="1000"
                />
              </div>

              {formData.discount_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    ลดสูงสุด (฿)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_discount || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAdvanced ? 'ซ่อนการตั้งค่าขั้นสูง' : 'แสดงการตั้งค่าขั้นสูง'}
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-6">
              {/* Usage Limits */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  ข้อจำกัดการใช้งาน
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      จำนวนครั้งทั้งหมด
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.usage_limit || ''}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ไม่จำกัด"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      จำนวนครั้งต่อคน
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.usage_limit_per_user || ''}
                      onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="ไม่จำกัด"
                    />
                  </div>
                </div>
              </div>

              {/* Service Targeting */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  เป้าหมายบริการ
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-2">
                      ใช้ได้กับ
                    </label>
                    <select
                      value={formData.applies_to}
                      onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all_services">บริการทั้งหมด</option>
                      <option value="categories">หมวดหมู่เฉพาะ</option>
                      <option value="specific_services">บริการเฉพาะ</option>
                    </select>
                  </div>

                  {formData.applies_to === 'categories' && (
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        เลือกหมวดหมู่
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((category) => (
                          <label key={category.id} className="flex items-center gap-2 text-sm">
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
                              className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                            />
                            {category.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.applies_to === 'specific_services' && (
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        เลือกบริการ
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-purple-200 rounded-lg p-2 space-y-1">
                        {services.map((service) => (
                          <label key={service.id} className="flex items-center gap-2 text-sm hover:bg-purple-50 p-1 rounded">
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
                              className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="flex-1">{service.name_th}</span>
                            <span className="text-xs text-purple-500">{service.name_en}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dates and Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                วันที่เริ่มต้น *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                วันที่สิ้นสุด *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                สถานะ *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="draft">ร่าง</option>
                <option value="active">ใช้งาน</option>
                <option value="disabled">ระงับ</option>
              </select>
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                รายละเอียด (ไทย)
              </label>
              <textarea
                value={formData.description_th}
                onChange={(e) => setFormData({ ...formData, description_th: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                rows={3}
                placeholder="รายละเอียดและเงื่อนไขของโปรโมชั่น"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                รายละเอียด (อังกฤษ)
              </label>
              <textarea
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                rows={3}
                placeholder="Promotion details and conditions"
              />
            </div>
          </div>

          {/* Generated Coupon Codes Preview */}
          {generatedCodes.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-3">รหัสคูปองที่สร้างขึ้น:</h3>
              <div className="grid grid-cols-3 gap-2">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                    <span className="font-mono text-sm flex-1">{code}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(code)}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium"
              disabled={isLoading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 disabled:opacity-50 transition"
            >
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {editData ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}