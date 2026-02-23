import { useState, useRef } from 'react'
import {
  X,
  Upload,
  Image as ImageIcon,
  Save,
  Eye,
  EyeOff,
  Clock,
  DollarSign,
  Globe,
  Tag,
  FileText,
  Info,
  AlertCircle,
  CheckCircle2,
  Star,
  Settings,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Hand,
  Flower2,
  Zap,
  ChevronRight
} from 'lucide-react'

interface AddServiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (serviceData: ServiceFormData) => void
}

interface ServiceFormData {
  name_th: string
  name_en: string
  description_th: string
  description_en: string
  category: 'massage' | 'nail' | 'spa'
  duration: number
  base_price: number
  hotel_price: number
  // Additional professional fields
  benefits_th: string
  benefits_en: string
  contraindications_th: string
  contraindications_en: string
  requirements_th: string
  requirements_en: string
  preparation_th: string
  preparation_en: string
  aftercare_th: string
  aftercare_en: string
  skill_level_required: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  min_staff_required: number
  max_clients_per_session: number
  room_requirements: string[]
  equipment_needed: string[]
  image_url?: string
  additional_images: string[]
  tags: string[]
  sort_order: number
  is_signature_service: boolean
  is_couple_service: boolean
  is_mobile_service: boolean
  age_restriction: {
    min_age?: number
    max_age?: number
  }
  seasonal_availability: {
    available_seasons: string[]
    peak_seasons: string[]
  }
  booking_settings: {
    advance_booking_days: number
    cancellation_hours: number
    reschedule_hours: number
  }
  loyalty_points: number
  commission_rate: number
}

const categories = [
  { id: 'massage', name: 'นวด', nameEn: 'Massage', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', nameEn: 'Nail', icon: Hand },
  { id: 'spa', name: 'สปา', nameEn: 'Spa', icon: Flower2 },
]

const skillLevels = [
  { id: 'beginner', name: 'ผู้เริ่มต้น', nameEn: 'Beginner' },
  { id: 'intermediate', name: 'ปานกลาง', nameEn: 'Intermediate' },
  { id: 'advanced', name: 'ชำนาญ', nameEn: 'Advanced' },
  { id: 'expert', name: 'ผู้เชี่ยวชาญ', nameEn: 'Expert' },
]

const roomTypes = [
  'ห้องเดี่ยว (Single Room)',
  'ห้องคู่ (Couple Room)',
  'ห้องกลุ่ม (Group Room)',
  'ห้องส่วนตัว VIP (VIP Private)',
  'ห้องกลางแจ้ง (Outdoor Area)',
  'ห้องสปา (Spa Suite)',
]

const equipment = [
  'เตียงนวด (Massage Table)',
  'เก้าอี้นวด (Massage Chair)',
  'น้ำมันอโรมา (Aromatic Oils)',
  'หินร้อน (Hot Stones)',
  'เครื่องอบไอน้ำ (Steam Equipment)',
  'อุปกรณ์เล็บ (Nail Equipment)',
  'ผลิตภัณฑ์บำรุงผิว (Skincare Products)',
  'ดนตรีผ่อนคลาย (Relaxation Music)',
]

const seasons = [
  'ฤดูร้อน (Summer)',
  'ฤดูฝน (Rainy)',
  'ฤดูหนาว (Winter)',
  'ตลอดปี (Year-round)',
]

function AddServiceForm({ isOpen, onClose, onSave }: AddServiceFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ServiceFormData>({
    name_th: '',
    name_en: '',
    description_th: '',
    description_en: '',
    category: 'massage',
    duration: 60,
    base_price: 500,
    hotel_price: 400,
    benefits_th: '',
    benefits_en: '',
    contraindications_th: '',
    contraindications_en: '',
    requirements_th: '',
    requirements_en: '',
    preparation_th: '',
    preparation_en: '',
    aftercare_th: '',
    aftercare_en: '',
    skill_level_required: 'intermediate',
    min_staff_required: 1,
    max_clients_per_session: 1,
    room_requirements: [],
    equipment_needed: [],
    additional_images: [],
    tags: [],
    sort_order: 0,
    is_signature_service: false,
    is_couple_service: false,
    is_mobile_service: false,
    age_restriction: {},
    seasonal_availability: {
      available_seasons: ['ตลอดปี (Year-round)'],
      peak_seasons: [],
    },
    booking_settings: {
      advance_booking_days: 1,
      cancellation_hours: 24,
      reschedule_hours: 12,
    },
    loyalty_points: 10,
    commission_rate: 15,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = [
    { id: 1, name: 'ข้อมูลพื้นฐาน', nameEn: 'Basic Info', icon: Info },
    { id: 2, name: 'รายละเอียด', nameEn: 'Details', icon: FileText },
    { id: 3, name: 'ความต้องการ', nameEn: 'Requirements', icon: Settings },
    { id: 4, name: 'ภาพและสื่อ', nameEn: 'Media', icon: ImageIcon },
    { id: 5, name: 'การตั้งค่า', nameEn: 'Settings', icon: Settings },
  ]

  if (!isOpen) return null

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.name_th.trim()) newErrors.name_th = 'กรุณากรอกชื่อบริการภาษาไทย'
      if (!formData.name_en.trim()) newErrors.name_en = 'กรุณากรอกชื่อบริการภาษาอังกฤษ'
      if (formData.duration <= 0) newErrors.duration = 'กรุณากรอกระยะเวลาที่ถูกต้อง'
      if (formData.base_price <= 0) newErrors.base_price = 'กรุณากรอกราคาที่ถูกต้อง'
      if (formData.hotel_price <= 0) newErrors.hotel_price = 'กรุณากรอกราคาโรงแรมที่ถูกต้อง'
      if (formData.hotel_price >= formData.base_price) {
        newErrors.hotel_price = 'ราคาโรงแรมควรน้อยกว่าราคาปกติ'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(5, currentStep + 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
  }

  const handleSave = () => {
    if (validateStep(currentStep)) {
      onSave(formData)
      onClose()
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // In a real app, you would upload to Supabase Storage
      const imageUrl = URL.createObjectURL(file)
      setFormData(prev => ({ ...prev, image_url: imageUrl }))
    }
  }

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item]
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thai Name */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Globe className="inline w-4 h-4 mr-1" />
            ชื่อบริการ (ไทย) *
          </label>
          <input
            type="text"
            value={formData.name_th}
            onChange={(e) => setFormData(prev => ({ ...prev, name_th: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.name_th ? 'border-red-500' : 'border-stone-300'
            }`}
            placeholder="เช่น นวดไทยแบบดั้งเดิม"
          />
          {errors.name_th && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.name_th}
            </p>
          )}
        </div>

        {/* English Name */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Globe className="inline w-4 h-4 mr-1" />
            Service Name (English) *
          </label>
          <input
            type="text"
            value={formData.name_en}
            onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.name_en ? 'border-red-500' : 'border-stone-300'
            }`}
            placeholder="e.g. Traditional Thai Massage"
          />
          {errors.name_en && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.name_en}
            </p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <Tag className="inline w-4 h-4 mr-1" />
          หมวดหมู่บริการ *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: category.id as any }))}
                className={`p-4 border-2 rounded-xl transition-all ${
                  formData.category === category.id
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">{category.name}</div>
                <div className="text-xs text-stone-500">{category.nameEn}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration and Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Clock className="inline w-4 h-4 mr-1" />
            ระยะเวลา (นาที) *
          </label>
          <input
            type="number"
            min="15"
            max="480"
            step="15"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.duration ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.duration && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.duration}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <DollarSign className="inline w-4 h-4 mr-1" />
            ราคาปกติ (บาท) *
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) }))}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.base_price ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.base_price && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.base_price}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <DollarSign className="inline w-4 h-4 mr-1" />
            ราคาโรงแรม (บาท) *
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={formData.hotel_price}
            onChange={(e) => setFormData(prev => ({ ...prev, hotel_price: parseFloat(e.target.value) }))}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.hotel_price ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.hotel_price && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.hotel_price}
            </p>
          )}
          {formData.base_price > 0 && formData.hotel_price > 0 && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              ส่วนลด {Math.round(((formData.base_price - formData.hotel_price) / formData.base_price) * 100)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            คำอธิบายบริการ (ไทย)
          </label>
          <textarea
            value={formData.description_th}
            onChange={(e) => setFormData(prev => ({ ...prev, description_th: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="บรรยายรายละเอียดบริการ ขั้นตอน และประโยชน์..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Service Description (English)
          </label>
          <textarea
            value={formData.description_en}
            onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Describe service details, process, and benefits..."
          />
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            ประโยชน์ที่ได้รับ (ไทย)
          </label>
          <textarea
            value={formData.benefits_th}
            onChange={(e) => setFormData(prev => ({ ...prev, benefits_th: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="เช่น ผ่อนคลายกล้ามเนื้อ, ลดความเครียด, เพิ่มการไหลเวียนเลือด..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Benefits (English)
          </label>
          <textarea
            value={formData.benefits_en}
            onChange={(e) => setFormData(prev => ({ ...prev, benefits_en: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g. Muscle relaxation, stress relief, improved circulation..."
          />
        </div>
      </div>

      {/* Contraindications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            ข้อห้าม/ข้อควรระวัง (ไทย)
          </label>
          <textarea
            value={formData.contraindications_th}
            onChange={(e) => setFormData(prev => ({ ...prev, contraindications_th: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="เช่น ห้ามในผู้ที่มีแผลเปิด, ผู้ป่วยโรคหัวใจ, หญิงมีครรภ์..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Contraindications (English)
          </label>
          <textarea
            value={formData.contraindications_en}
            onChange={(e) => setFormData(prev => ({ ...prev, contraindications_en: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="e.g. Open wounds, heart conditions, pregnancy..."
          />
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Staff and Client Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            <Users className="inline w-4 h-4 mr-1" />
            ระดับทักษะพนักงาน
          </label>
          <select
            value={formData.skill_level_required}
            onChange={(e) => setFormData(prev => ({ ...prev, skill_level_required: e.target.value as any }))}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {skillLevels.map(level => (
              <option key={level.id} value={level.id}>
                {level.name} ({level.nameEn})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            จำนวนพนักงานขั้นต่ำ
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={formData.min_staff_required}
            onChange={(e) => setFormData(prev => ({ ...prev, min_staff_required: parseInt(e.target.value) }))}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            ลูกค้าสูงสุดต่อรอบ
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.max_clients_per_session}
            onChange={(e) => setFormData(prev => ({ ...prev, max_clients_per_session: parseInt(e.target.value) }))}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Room Requirements */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <MapPin className="inline w-4 h-4 mr-1" />
          ความต้องการห้อง
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roomTypes.map(room => (
            <label key={room} className="flex items-center p-3 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.room_requirements.includes(room)}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    room_requirements: e.target.checked
                      ? [...prev.room_requirements, room]
                      : prev.room_requirements.filter(r => r !== room)
                  }))
                }}
                className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
              />
              <span className="ml-3 text-sm">{room}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Equipment Needed */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <Settings className="inline w-4 h-4 mr-1" />
          อุปกรณ์ที่ต้องใช้
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {equipment.map(item => (
            <label key={item} className="flex items-center p-3 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.equipment_needed.includes(item)}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    equipment_needed: e.target.checked
                      ? [...prev.equipment_needed, item]
                      : prev.equipment_needed.filter(eq => eq !== item)
                  }))
                }}
                className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
              />
              <span className="ml-3 text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Main Image */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <ImageIcon className="inline w-4 h-4 mr-1" />
          ภาพหลักของบริการ
        </label>

        <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center">
          {formData.image_url ? (
            <div className="relative">
              <img
                src={formData.image_url}
                alt="Service preview"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <button
                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-8">
              <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-600 mb-4">คลิกเพื่ออัปโหลดภาพ หรือลากไฟล์มาวาง</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                <Upload className="w-4 h-4" />
                เลือกภาพ
              </button>
            </div>
          )}
          <p className="text-xs text-stone-500 mt-2">
            รองรับไฟล์: JPG, PNG, WebP (ขนาดสูงสุด 5MB)
          </p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          <Tag className="inline w-4 h-4 mr-1" />
          แท็ก (คั่นด้วยเครื่องหมายจุลภาค)
        </label>
        <input
          type="text"
          value={formData.tags.join(', ')}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
          }))}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="เช่น ผ่อนคลาย, เพื่อสุขภาพ, นวดไทย, อโรมา"
        />
        <p className="text-xs text-stone-500 mt-1">
          แท็กจะช่วยให้ลูกค้าค้นหาบริการได้ง่ายขึ้น
        </p>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Service Features */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <Star className="inline w-4 h-4 mr-1" />
          คุณสมบัติพิเศษ
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center p-4 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_signature_service}
              onChange={(e) => setFormData(prev => ({ ...prev, is_signature_service: e.target.checked }))}
              className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
            />
            <div className="ml-3">
              <div className="font-medium">Signature Service</div>
              <div className="text-sm text-stone-500">บริการเด่นของร้าน</div>
            </div>
          </label>

          <label className="flex items-center p-4 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_couple_service}
              onChange={(e) => setFormData(prev => ({ ...prev, is_couple_service: e.target.checked }))}
              className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
            />
            <div className="ml-3">
              <div className="font-medium">Couple Service</div>
              <div className="text-sm text-stone-500">บริการสำหรับคู่รัก</div>
            </div>
          </label>

          <label className="flex items-center p-4 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_mobile_service}
              onChange={(e) => setFormData(prev => ({ ...prev, is_mobile_service: e.target.checked }))}
              className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
            />
            <div className="ml-3">
              <div className="font-medium">Mobile Service</div>
              <div className="text-sm text-stone-500">บริการถึงที่</div>
            </div>
          </label>
        </div>
      </div>

      {/* Booking Settings */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          <Calendar className="inline w-4 h-4 mr-1" />
          การตั้งค่าการจอง
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-stone-600 mb-2">จองล่วงหน้า (วัน)</label>
            <input
              type="number"
              min="0"
              max="30"
              value={formData.booking_settings.advance_booking_days}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                booking_settings: {
                  ...prev.booking_settings,
                  advance_booking_days: parseInt(e.target.value)
                }
              }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">ยกเลิกล่วงหน้า (ชั่วโมง)</label>
            <input
              type="number"
              min="1"
              max="72"
              value={formData.booking_settings.cancellation_hours}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                booking_settings: {
                  ...prev.booking_settings,
                  cancellation_hours: parseInt(e.target.value)
                }
              }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">เลื่อนนัดล่วงหน้า (ชั่วโมง)</label>
            <input
              type="number"
              min="1"
              max="48"
              value={formData.booking_settings.reschedule_hours}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                booking_settings: {
                  ...prev.booking_settings,
                  reschedule_hours: parseInt(e.target.value)
                }
              }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          การตั้งค่าธุรกิจ
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-stone-600 mb-2">คะแนนสะสม</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.loyalty_points}
              onChange={(e) => setFormData(prev => ({ ...prev, loyalty_points: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">คอมมิชชั่น (%)</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={formData.commission_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-600 mb-2">ลำดับการแสดง</label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-stone-900">เพิ่มบริการใหม่</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition ${
                  showPreview
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่าง'}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition ${
                    currentStep >= step.id
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'border-stone-300 text-stone-400'
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </button>
                <div className="ml-3 min-w-0">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-amber-600' : 'text-stone-400'
                  }`}>
                    {step.name}
                  </div>
                  <div className="text-xs text-stone-500">{step.nameEn}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-amber-600' : 'bg-stone-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-2 border rounded-xl transition ${
              currentStep === 1
                ? 'border-stone-200 text-stone-400 cursor-not-allowed'
                : 'border-stone-300 text-stone-700 hover:bg-stone-100'
            }`}
          >
            ก่อนหน้า
          </button>

          <div className="text-sm text-stone-500">
            ขั้นตอน {currentStep} จาก {steps.length}
          </div>

          <div className="flex gap-3">
            {currentStep === steps.length ? (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition"
              >
                <Save className="w-4 h-4" />
                บันทึกบริการ
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-medium hover:from-amber-700 hover:to-amber-800 transition"
              >
                ถัดไป
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddServiceForm