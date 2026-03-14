import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Percent,
  Calendar,
  Clock,
  Users,
  Copy,
  CheckCircle,
  Share2,
  Tag,
  Gift,
  Sparkles
} from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

interface Promotion {
  id: string
  name_th: string
  name_en: string
  description_th?: string | null
  description_en?: string | null
  code: string
  discount_type: string
  discount_value: number
  min_order_amount?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  usage_count?: number | null
  start_date: string
  end_date: string
  image_url?: string | null
}

interface UniversalPromotionModalProps {
  promotion: Promotion | null
  onClose: () => void
  variant?: 'thai' | 'international' | 'minimal'
}

export function UniversalPromotionModal({
  promotion,
  onClose,
  variant = 'international'
}: UniversalPromotionModalProps) {
  const { t, i18n } = useTranslation(['home'])
  const [copied, setCopied] = useState(false)

  if (!promotion) return null

  const isEn = i18n.language === 'en' || i18n.language === 'cn'
  const name = isEn ? promotion.name_en : promotion.name_th
  const description = isEn
    ? (promotion.description_en || promotion.description_th)
    : (promotion.description_th || promotion.description_en)

  const formatDiscount = () => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}%`
      case 'fixed_amount':
        return variant === 'international'
          ? `$${promotion.discount_value}`
          : `฿${promotion.discount_value.toLocaleString()}`
      case 'buy_x_get_y':
        return `${promotion.discount_value}`
      default:
        return promotion.discount_value.toString()
    }
  }

  const getDiscountIcon = () => {
    switch (promotion.discount_type) {
      case 'percentage': return <Percent className="w-5 h-5" />
      case 'fixed_amount': return <Tag className="w-5 h-5" />
      case 'buy_x_get_y': return <Gift className="w-5 h-5" />
      default: return <Tag className="w-5 h-5" />
    }
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(promotion.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(promotion.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ))

  const usagePercentage = promotion.usage_limit
    ? ((promotion.usage_count || 0) / promotion.usage_limit) * 100
    : 0

  // Service Details Style - เหมือนหน้ารายละเอียดบริการเปี๊ยบ
  const variants = {
    thai: {
      // Service Details Style - เหมือนหน้ารายละเอียดบริการ
      headerBg: 'bg-gradient-to-br from-amber-100 to-amber-200',
      accent: 'bg-gradient-to-r from-amber-700 to-amber-800',
      accentHover: 'hover:shadow-lg transition transform hover:scale-105',
      accentText: 'text-white',
      cardBg: 'bg-amber-50/60',
      cardBorder: 'border-amber-500',
      border: 'border-stone-100',
      text: {
        primary: 'text-stone-900',
        secondary: 'text-stone-700',
        muted: 'text-stone-500',
        accent: 'text-amber-700'
      },
      statsColors: ['text-amber-700', 'text-stone-600', 'text-stone-700']
    },
    international: {
      // International Style ตาม Service Details pattern
      headerBg: 'bg-gradient-to-br from-stone-100 to-stone-200',
      accent: 'bg-gradient-to-r from-stone-700 to-stone-800',
      accentHover: 'hover:shadow-lg transition transform hover:scale-105',
      accentText: 'text-white',
      cardBg: 'bg-stone-50',
      cardBorder: 'border-stone-500',
      border: 'border-stone-100',
      text: {
        primary: 'text-stone-900',
        secondary: 'text-stone-700',
        muted: 'text-stone-500',
        accent: 'text-stone-700'
      },
      statsColors: ['text-stone-700', 'text-stone-600', 'text-stone-500']
    },
    minimal: {
      // Minimal Style ตาม Service Details pattern
      headerBg: 'bg-gradient-to-br from-stone-50 to-white',
      accent: 'bg-gradient-to-r from-stone-800 to-stone-900',
      accentHover: 'hover:shadow-lg transition transform hover:scale-105',
      accentText: 'text-white',
      cardBg: 'bg-stone-50',
      cardBorder: 'border-stone-300',
      border: 'border-stone-100',
      text: {
        primary: 'text-stone-900',
        secondary: 'text-stone-700',
        muted: 'text-stone-500',
        accent: 'text-stone-800'
      },
      statsColors: ['text-stone-800', 'text-stone-700', 'text-stone-600']
    }
  }

  const currentVariant = variants[variant]

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal ที่ปรับขนาดตามรูปโปรโมชั่น */}
      <div className="bg-white rounded-2xl min-w-[400px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-lg border border-stone-100">

        {/* Header - รูปโปรโมชั่นขนาดจริง */}
        <div className="relative overflow-hidden bg-white">
          {/* Promotion Image */}
          {promotion.image_url ? (
            <div className="relative">
              <img
                src={promotion.image_url}
                alt={name}
                className="w-full h-auto max-h-[60vh] object-contain bg-white"
                onError={(e) => {
                  // Fallback to fixed height gradient
                  e.currentTarget.style.display = 'none'
                  const fallback = document.createElement('div')
                  fallback.className = `w-full h-80 flex items-center justify-center ${currentVariant.headerBg}`
                  fallback.innerHTML = `
                    <div class="text-center ${currentVariant.text.primary}">
                      <div class="flex items-center justify-center mb-4">
                        <div class="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><line x1="19" x2="5" y1="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
                        </div>
                      </div>
                      <div class="text-4xl font-bold mb-2">${formatDiscount()}</div>
                      <div class="text-lg font-medium opacity-90">
                        ${variant === 'international' ? 'PROMOTION' : 'โปรโมชั่น'}
                      </div>
                    </div>
                  `
                  e.currentTarget.parentElement?.appendChild(fallback)
                }}
              />
              {/* Image overlay for contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
            </div>
          ) : (
            // Fallback gradient with icon
            <div className="w-full h-full flex items-center justify-center">
              <div className={`text-center ${currentVariant.text.primary}`}>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                    {getDiscountIcon()}
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2">{formatDiscount()}</div>
                <div className="text-lg font-medium opacity-90">
                  {variant === 'international' ? 'PROMOTION' : 'โปรโมชั่น'}
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-xl shadow-lg transition z-10"
          >
            <X className="w-4 h-4 text-stone-600" />
          </button>

          {/* Brand icon */}
          <div className="absolute top-4 left-4">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Discount badge - มุมล่างขวา */}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {getDiscountIcon()}
              <span className="font-bold text-lg text-stone-900">{formatDiscount()}</span>
            </div>
          </div>
        </div>

        {/* Content - Service Details Style - เพิ่ม padding */}
        <div className="p-8 space-y-8">

          {/* Title - Service Details Typography - ขนาดใหญ่ขึ้น */}
          <div className="text-center">
            <h2 className={`text-4xl font-light ${currentVariant.text.primary} mb-4 tracking-tight`}>{name}</h2>
            {description && (
              <p className={`text-xl ${currentVariant.text.muted} font-light leading-relaxed max-w-2xl mx-auto`}>{description}</p>
            )}
          </div>

          {/* Promo Code Card - Service Details Card Style */}
          <div className={`${currentVariant.cardBg} rounded-xl p-4 border-2 ${currentVariant.cardBorder}`}>
            <div className="text-center">
              <div className={`text-xs font-medium ${currentVariant.text.muted} mb-3 uppercase tracking-wide`}>
                {variant === 'international' ? 'PROMO CODE' : 'รหัสโปรโมชั่น'}
              </div>
              <div className="flex items-center justify-center gap-3">
                <code className={`text-xl font-mono font-bold ${currentVariant.text.primary} bg-white px-4 py-3 rounded-xl shadow-sm border border-stone-200`}>
                  {promotion.code}
                </code>
                <button
                  onClick={copyCode}
                  className={`p-3 rounded-xl border-2 transition ${
                    copied
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copied && (
                <div className="text-sm text-emerald-600 mt-3 font-medium">
                  {variant === 'international' ? 'CODE COPIED!' : 'คัดลอกแล้ว!'}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid - Service Details Style */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-2xl font-bold ${currentVariant.statsColors[0]}`}>
                  {formatDiscount()}
                </div>
                <div className={`text-xs ${currentVariant.text.muted} uppercase tracking-wide mt-1`}>
                  {variant === 'international' ? 'Discount' : 'ส่วนลด'}
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${currentVariant.statsColors[1]}`}>
                  {daysLeft}
                </div>
                <div className={`text-xs ${currentVariant.text.muted} uppercase tracking-wide mt-1`}>
                  {variant === 'international' ? 'Days Left' : 'วันเหลือ'}
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${currentVariant.statsColors[2]}`}>
                  {promotion.usage_count || 0}
                </div>
                <div className={`text-xs ${currentVariant.text.muted} uppercase tracking-wide mt-1`}>
                  {variant === 'international' ? 'Used' : 'ใช้แล้ว'}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Progress - Service Details Style */}
          {promotion.usage_limit && (
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <div className="flex justify-between text-sm text-stone-700 font-medium mb-3">
                <span>{variant === 'international' ? 'Usage Progress' : 'การใช้งาน'}</span>
                <span>{Math.round(usagePercentage)}%</span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    variant === 'thai' ? 'bg-amber-500' : 'bg-stone-600'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Terms - Service Details Card Style */}
          {(promotion.min_order_amount || promotion.max_discount) && (
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <h3 className={`text-lg font-medium ${currentVariant.text.primary} mb-3`}>
                {variant === 'international' ? 'Terms & Conditions' : 'เงื่อนไข'}
              </h3>
              <div className="space-y-2">
                {promotion.min_order_amount && (
                  <div className={`text-sm ${currentVariant.text.secondary} flex justify-between`}>
                    <span>{variant === 'international' ? 'Minimum Order:' : 'ยอดขั้นต่ำ:'}</span>
                    <span className={`font-semibold ${currentVariant.text.accent}`}>
                      {variant === 'international'
                        ? `$${promotion.min_order_amount}`
                        : `฿${promotion.min_order_amount.toLocaleString()}`
                      }
                    </span>
                  </div>
                )}
                {promotion.max_discount && (
                  <div className={`text-sm ${currentVariant.text.secondary} flex justify-between`}>
                    <span>{variant === 'international' ? 'Maximum Discount:' : 'ลดสูงสุด:'}</span>
                    <span className={`font-semibold ${currentVariant.text.accent}`}>
                      {variant === 'international'
                        ? `$${promotion.max_discount}`
                        : `฿${promotion.max_discount.toLocaleString()}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions - Service Details Button Style */}
          <div className="space-y-4">
            <Link
              to="/services"
              onClick={onClose}
              className={`block w-full ${currentVariant.accent} ${currentVariant.accentText} text-center py-4 rounded-xl font-medium ${currentVariant.accentHover} shadow-md`}
            >
              {variant === 'international' ? 'BOOK NOW' : 'จองเลย'}
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const text = variant === 'international'
                    ? `${name} - Use code: ${promotion.code}`
                    : `${name} - ใช้รหัส: ${promotion.code}`
                  if (navigator.share) {
                    navigator.share({ title: name, text })
                  } else {
                    navigator.clipboard.writeText(text)
                  }
                }}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 border border-stone-200"
              >
                <Share2 className="w-4 h-4" />
                {variant === 'international' ? 'SHARE' : 'แชร์'}
              </button>

              <button
                onClick={onClose}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 border border-stone-200"
              >
                <X className="w-4 h-4" />
                {variant === 'international' ? 'CLOSE' : 'ปิด'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UniversalPromotionModal