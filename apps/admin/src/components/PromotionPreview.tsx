import { useState } from 'react'
import {
  X,
  Tag,
  Calendar,
  Clock,
  Percent,
  Gift,
  Users,
  Star,
  Share2,
  Download,
  Copy,
  CheckCircle,
} from 'lucide-react'

interface Promotion {
  id: string
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
  usage_count: number
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'expired' | 'disabled'
  applies_to: 'all_services' | 'specific_services' | 'categories'
  target_services?: string[]
  target_categories?: string[]
  image_url?: string
  created_at: string
  updated_at: string
}

interface PromotionPreviewProps {
  isOpen: boolean
  onClose: () => void
  promotion: Promotion | null
}

export function PromotionPreview({ isOpen, onClose, promotion }: PromotionPreviewProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !promotion) return null

  const formatDiscount = (promotion: Promotion) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}%`
      case 'fixed_amount':
        return `฿${promotion.discount_value.toLocaleString()}`
      case 'buy_x_get_y':
        return `แถม ${promotion.discount_value} ชิ้น`
      default:
        return promotion.discount_value.toString()
    }
  }

  const getDiscountIcon = () => {
    switch (promotion.discount_type) {
      case 'percentage':
        return <Percent className="w-6 h-6" />
      case 'fixed_amount':
        return <Tag className="w-6 h-6" />
      case 'buy_x_get_y':
        return <Gift className="w-6 h-6" />
      default:
        return <Tag className="w-6 h-6" />
    }
  }

  const getStatusBadge = () => {
    const statusColors = {
      draft: 'bg-bliss-500 text-white',
      active: 'bg-green-500 text-white',
      disabled: 'bg-orange-500 text-white',
      expired: 'bg-red-500 text-white',
    }

    const statusText = {
      draft: 'ร่าง',
      active: 'ใช้งานอยู่',
      disabled: 'ระงับ',
      expired: 'หมดอายุ',
    }

    return (
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[promotion.status]}`}>
        {statusText[promotion.status]}
      </div>
    )
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(promotion.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = new Date() > new Date(promotion.end_date)
  const daysLeft = Math.ceil((new Date(promotion.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Section with Image - Responsive Height */}
        <div className="relative h-56 sm:h-64 lg:h-72 bg-gradient-to-br from-bliss-400 via-bliss-500 to-bliss-600 rounded-t-3xl overflow-hidden">
          {/* Promotion image */}
          {promotion.image_url && (
            <img
              src={promotion.image_url}
              alt={promotion.name_en}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Olive gradient overlay — readable text + CI tone */}
          <div className="absolute inset-0 bg-gradient-to-t from-bliss-900/85 via-bliss-900/35 to-bliss-900/10" />

          {/* Discount info — bottom-left */}
          <div className="absolute bottom-4 left-5 text-white">
            <div className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm mb-2">
              {getDiscountIcon()}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-none drop-shadow-lg">{formatDiscount(promotion)}</h1>
            <p className="text-sm font-semibold opacity-90 drop-shadow mt-1">OFF</p>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            {getStatusBadge()}
          </div>

        </div>

        {/* Content - Responsive Padding */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Title Section - Responsive Text */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-bliss-800 mb-2">{promotion.name_th}</h2>
            <p className="text-lg sm:text-xl text-bliss-600">{promotion.name_en}</p>
            {promotion.description_th && (
              <p className="text-bliss-500 mt-3 leading-relaxed">{promotion.description_th}</p>
            )}
          </div>

          {/* Promo Code */}
          <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 rounded-2xl p-4 border border-bliss-200">
            <div className="text-center">
              <p className="text-sm text-bliss-600 mb-2">รหัสโปรโมชัน</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <code className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-bliss-700 bg-white px-4 py-2 rounded-lg border border-bliss-300 min-w-0 break-all text-center sm:text-left">
                  {promotion.code}
                </code>
                <button
                  onClick={copyCode}
                  className="p-3 sm:p-2 bg-bliss-100 hover:bg-bliss-200 rounded-lg transition touch-manipulation"
                  title="คัดลอกรหัส"
                >
                  {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-bliss-600" />}
                </button>
              </div>
              {copied && <p className="text-sm text-green-600 mt-1">คัดลอกแล้ว!</p>}
            </div>
          </div>

          {/* Promotion Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Period */}
            <div className="bg-bliss-50 rounded-xl p-4 border border-bliss-200">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-bliss-600" />
                <h3 className="font-semibold text-bliss-800">ระยะเวลาโปรโมชัน</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-bliss-600">เริ่ม:</span>
                  <span className="ml-2 font-medium">{new Date(promotion.start_date).toLocaleDateString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-bliss-600">สิ้นสุด:</span>
                  <span className="ml-2 font-medium">{new Date(promotion.end_date).toLocaleDateString('th-TH')}</span>
                </div>
                {!isExpired && daysLeft > 0 && (
                  <div className="text-orange-600 font-medium">
                    <Clock className="w-4 h-4 inline mr-1" />
                    เหลือ {daysLeft} วัน
                  </div>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-bliss-50 rounded-xl p-4 border border-bliss-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-bliss-600" />
                <h3 className="font-semibold text-bliss-800">การใช้งาน</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-bliss-600">ใช้แล้ว:</span>
                  <span className="ml-2 font-medium">{promotion.usage_count.toLocaleString()}</span>
                  {promotion.usage_limit && <span className="text-bliss-500">/{promotion.usage_limit.toLocaleString()}</span>}
                </div>
                {promotion.usage_limit && (
                  <div className="w-full bg-bliss-200 rounded-full h-2">
                    <div
                      className="bg-bliss-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((promotion.usage_count / promotion.usage_limit) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                )}
                {promotion.usage_limit_per_user && (
                  <div className="text-xs text-bliss-500">
                    จำกัด {promotion.usage_limit_per_user} ครั้งต่อผู้ใช้
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-bliss-50 rounded-xl p-4 border border-bliss-200">
            <h3 className="font-semibold text-bliss-800 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-bliss-500" />
              เงื่อนไขการใช้งาน
            </h3>
            <div className="space-y-2 text-sm text-bliss-600">
              {promotion.min_order_amount && (
                <div className="flex justify-between">
                  <span>ยอดขั้นต่ำ:</span>
                  <span className="font-medium">฿{promotion.min_order_amount.toLocaleString()}</span>
                </div>
              )}
              {promotion.max_discount && promotion.discount_type === 'percentage' && (
                <div className="flex justify-between">
                  <span>ลดสูงสุด:</span>
                  <span className="font-medium">฿{promotion.max_discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>ใช้ได้กับ:</span>
                <span className="font-medium">
                  {promotion.applies_to === 'all_services'
                    ? 'บริการทั้งหมด'
                    : promotion.applies_to === 'categories' && promotion.target_categories
                      ? promotion.target_categories.join(', ')
                      : 'บริการที่เลือก'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Mobile Optimized */}
          <div className="space-y-3 pt-4">
            {/* Primary Action - Always Full Width */}
            <button
              onClick={copyCode}
              className="w-full bg-bliss-600 hover:bg-bliss-700 text-white px-6 py-4 rounded-xl font-medium transition flex items-center justify-center gap-3 touch-manipulation text-lg"
            >
              <Copy className="w-5 h-5" />
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัสโปรโมชัน'}
            </button>

            {/* Secondary Actions - Stack on Mobile, Row on Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const text = `🎉 โปรโมชันพิเศษ!\n${promotion.name_th}\nใช้รหัส: ${promotion.code}\nลด${formatDiscount(promotion)}`
                  if (navigator.share) {
                    navigator.share({ title: promotion.name_th, text })
                  } else {
                    navigator.clipboard.writeText(text)
                    alert('คัดลอกข้อความสำหรับแชร์แล้ว!')
                  }
                }}
                className="px-6 py-3 bg-bliss-100 hover:bg-bliss-200 text-bliss-700 rounded-xl font-medium transition flex items-center justify-center gap-2 touch-manipulation"
              >
                <Share2 className="w-5 h-5" />
                แชร์โปรโมชัน
              </button>

              <button
                onClick={onClose}
                className="px-6 py-3 bg-bliss-100 hover:bg-bliss-200 text-bliss-700 rounded-xl font-medium transition flex items-center justify-center gap-2 touch-manipulation"
              >
                <X className="w-5 h-5" />
                ปิด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromotionPreview