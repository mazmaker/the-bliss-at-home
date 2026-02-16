import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  Copy,
  CheckCircle,
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
  usage_limit_per_user?: number | null
  usage_count?: number | null
  start_date: string
  end_date: string
  status?: string | null
  applies_to?: string | null
  target_categories?: string[] | null
  image_url?: string | null
}

interface PromotionDetailModalProps {
  promotion: Promotion | null
  onClose: () => void
}

export function PromotionDetailModal({ promotion, onClose }: PromotionDetailModalProps) {
  const { t, i18n } = useTranslation(['home'])
  const [copied, setCopied] = useState(false)

  if (!promotion) return null

  const isEn = i18n.language === 'en' || i18n.language === 'cn'
  const name = isEn ? promotion.name_en : promotion.name_th
  const secondaryName = isEn ? promotion.name_th : promotion.name_en
  const description = isEn
    ? (promotion.description_en || promotion.description_th)
    : (promotion.description_th || promotion.description_en)

  const formatDiscount = () => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}%`
      case 'fixed_amount':
        return `฿${promotion.discount_value.toLocaleString()}`
      case 'buy_x_get_y':
        return `${promotion.discount_value}`
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

  const copyCode = async () => {
    await navigator.clipboard.writeText(promotion.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = new Date() > new Date(promotion.end_date)
  const daysLeft = Math.ceil(
    (new Date(promotion.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : 'th-TH'

  const appliesTo = promotion.applies_to === 'all_services'
    ? t('home:promotions.allServices')
    : promotion.applies_to === 'categories'
      ? t('home:promotions.selectedCategories')
      : t('home:promotions.selectedServices')

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Section */}
        <div className="relative h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-t-2xl sm:rounded-t-3xl overflow-hidden">
          {promotion.image_url ? (
            <>
              <img
                src={promotion.image_url}
                alt={name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    {getDiscountIcon()}
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                    {formatDiscount()}
                  </h1>
                  <p className="text-base sm:text-lg opacity-90 font-semibold drop-shadow">OFF</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {getDiscountIcon()}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  {formatDiscount()}
                </h1>
                <p className="text-base sm:text-lg opacity-90">OFF</p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
              {t('home:promotions.statusActive')}
            </div>
          </div>

          {/* Discount Badge */}
          <div className="absolute bottom-4 right-4 bg-white rounded-2xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              {getDiscountIcon()}
              <span className="text-2xl font-bold text-gray-800">{formatDiscount()}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{name}</h2>
            <p className="text-lg sm:text-xl text-gray-600">{secondaryName}</p>
            {description && (
              <p className="text-gray-500 mt-3 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Promo Code */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t('home:promotions.promoCode')}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <code className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-amber-700 bg-white px-4 py-2 rounded-lg border border-amber-300 min-w-0 break-all text-center sm:text-left">
                  {promotion.code}
                </code>
                <button
                  onClick={copyCode}
                  className="p-3 sm:p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition touch-manipulation"
                  title={t('home:promotions.copyCode')}
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-amber-600" />
                  )}
                </button>
              </div>
              {copied && <p className="text-sm text-green-600 mt-1">{t('home:promotions.copied')}</p>}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Period */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">{t('home:promotions.periodTitle')}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">{t('home:promotions.startDate')}:</span>
                  <span className="ml-2 font-medium">
                    {new Date(promotion.start_date).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t('home:promotions.endDate')}:</span>
                  <span className="ml-2 font-medium">
                    {new Date(promotion.end_date).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                {!isExpired && daysLeft > 0 && (
                  <div className="text-orange-600 font-medium">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {t('home:promotions.daysLeft', { count: daysLeft })}
                  </div>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">{t('home:promotions.usageTitle')}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">{t('home:promotions.used')}:</span>
                  <span className="ml-2 font-medium">{(promotion.usage_count ?? 0).toLocaleString()}</span>
                  {promotion.usage_limit && (
                    <span className="text-gray-500">/{promotion.usage_limit.toLocaleString()}</span>
                  )}
                </div>
                {promotion.usage_limit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(((promotion.usage_count ?? 0) / promotion.usage_limit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
                {promotion.usage_limit_per_user && (
                  <div className="text-xs text-gray-500">
                    {t('home:promotions.limitPerUser', { count: promotion.usage_limit_per_user })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {t('home:promotions.termsTitle')}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              {promotion.min_order_amount && Number(promotion.min_order_amount) > 0 && (
                <div className="flex justify-between">
                  <span>{t('home:promotions.minOrder')}:</span>
                  <span className="font-medium">฿{Number(promotion.min_order_amount).toLocaleString()}</span>
                </div>
              )}
              {promotion.max_discount && promotion.discount_type === 'percentage' && (
                <div className="flex justify-between">
                  <span>{t('home:promotions.maxDiscount')}:</span>
                  <span className="font-medium">฿{Number(promotion.max_discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('home:promotions.appliesTo')}:</span>
                <span className="font-medium">{appliesTo}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Link
              to="/services"
              onClick={onClose}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-4 rounded-xl font-medium transition flex items-center justify-center gap-3 touch-manipulation text-lg"
            >
              {t('home:promotions.bookNow')}
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const text = `${name}\n${t('home:promotions.useCode')}: ${promotion.code}\n${t('home:promotions.discount')} ${formatDiscount()}`
                  if (navigator.share) {
                    navigator.share({ title: name, text })
                  } else {
                    navigator.clipboard.writeText(text)
                  }
                }}
                className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition flex items-center justify-center gap-2 touch-manipulation"
              >
                <Share2 className="w-5 h-5" />
                {t('home:promotions.share')}
              </button>

              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2 touch-manipulation"
              >
                <X className="w-5 h-5" />
                {t('home:promotions.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromotionDetailModal
