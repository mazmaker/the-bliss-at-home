import { useState, useMemo, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Search, Filter, Tag, Calendar, Percent, Gift, Star, Clock, ArrowLeft } from 'lucide-react'
import { useActivePromotions } from '@bliss/supabase/hooks/usePromotions'
import { useTranslation } from '@bliss/i18n'
import { UniversalPromotionModal } from '../components/UniversalPromotionModal-Branded'

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
  status?: string | null
  applies_to?: string | null
  target_categories?: string[] | null
  image_url?: string | null
}

const PromotionsPage = () => {
  const { t, i18n } = useTranslation(['home', 'common'])
  const { data: promotions, isLoading } = useActivePromotions()
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'discount' | 'expiring'>('newest')

  const isEn = i18n.language === 'en' || i18n.language === 'cn'

  // Handle URL parameter - auto open modal if ID in URL
  useEffect(() => {
    if (id && promotions) {
      const promotion = promotions.find((promo: Promotion) => promo.id === id)
      setSelectedPromo(promotion || null)
    } else {
      setSelectedPromo(null)
    }
  }, [id, promotions])

  // Handle promotion click - update URL
  const handlePromotionClick = (promo: Promotion) => {
    navigate(`/promotions/${promo.id}`)
  }

  // Handle modal close - go back to main page
  const handleCloseModal = () => {
    navigate('/promotions')
  }

  const filteredAndSortedPromotions = useMemo(() => {
    if (!promotions) return []

    let filtered = promotions.filter((promo: Promotion) => {
      const name = isEn ? promo.name_en : promo.name_th
      const description = isEn ? (promo.description_en || promo.description_th) : (promo.description_th || promo.description_en)

      const matchesSearch = !searchTerm ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (description && description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        promo.code.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterType === 'all' || promo.discount_type === filterType

      return matchesSearch && matchesFilter
    })

    // Sort promotions
    filtered.sort((a: Promotion, b: Promotion) => {
      switch (sortBy) {
        case 'discount':
          return b.discount_value - a.discount_value
        case 'expiring':
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
        case 'newest':
        default:
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      }
    })

    return filtered
  }, [promotions, searchTerm, filterType, sortBy, isEn])

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-5 h-5" />
      case 'fixed_amount': return <Tag className="w-5 h-5" />
      case 'buy_x_get_y': return <Gift className="w-5 h-5" />
      default: return <Tag className="w-5 h-5" />
    }
  }

  const formatDiscount = (promo: Promotion) => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}%`
      case 'fixed_amount':
        return `฿${promo.discount_value.toLocaleString()}`
      case 'buy_x_get_y':
        return `${promo.discount_value}`
      default:
        return promo.discount_value.toString()
    }
  }

  const getDaysLeft = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดโปรโมชั่น...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">โปรโมชั่นทั้งหมด</h1>
              <p className="text-gray-600">ข้อเสนอพิเศษสำหรับคุณ</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาโปรโมชั่น..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทุกประเภท</option>
              <option value="percentage">ลดเปอร์เซ็นต์</option>
              <option value="fixed_amount">ลดยอดคงที่</option>
              <option value="buy_x_get_y">ซื้อแล้วได้ฟรี</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="discount">ส่วนลดสูงสุด</option>
              <option value="expiring">หมดอายุเร็วสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredAndSortedPromotions.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">ไม่พบโปรโมชั่น</h3>
            <p className="text-gray-500">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPromotions.map((promo: Promotion) => {
              const name = isEn ? promo.name_en : promo.name_th
              const description = isEn ? (promo.description_en || promo.description_th) : (promo.description_th || promo.description_en)
              const daysLeft = getDaysLeft(promo.end_date)

              return (
                <div
                  key={promo.id}
                  onClick={() => handlePromotionClick(promo)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border hover:border-amber-200"
                >
                  {/* Image or Gradient Header */}
                  <div className="relative h-40 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600">
                    {promo.image_url ? (
                      <img src={promo.image_url} alt={name} className="w-full h-full object-cover" />
                    ) : null}

                    {/* Discount Badge */}
                    <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg">
                      <div className="flex items-center gap-1">
                        {getDiscountIcon(promo.discount_type)}
                        <span className="font-bold text-gray-800 text-sm">{formatDiscount(promo)}</span>
                      </div>
                    </div>

                    {/* Days Left Badge */}
                    {daysLeft > 0 && daysLeft <= 7 && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {daysLeft} วันสุดท้าย
                      </div>
                    )}

                    {/* Discount Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-3xl font-bold">{formatDiscount(promo)}</div>
                        <div className="text-sm opacity-90">OFF</div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">{name}</h3>

                    {description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
                    )}

                    {/* Promo Code */}
                    <div className="bg-amber-50 rounded-lg p-2 mb-3 border border-amber-200">
                      <p className="text-xs text-gray-600 mb-1">รหัสโปรโมชั่น</p>
                      <code className="font-mono font-bold text-amber-700">{promo.code}</code>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        ถึง {new Date(promo.end_date).toLocaleDateString('th-TH')}
                      </span>

                      {promo.usage_count !== undefined && promo.usage_limit && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          ใช้แล้ว {promo.usage_count}/{promo.usage_limit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Promotion Detail Modal */}
      <UniversalPromotionModal
        promotion={selectedPromo}
        variant="thai"
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default PromotionsPage