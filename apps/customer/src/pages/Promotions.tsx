import { useState, useMemo, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Search, Filter, Tag, Calendar, Percent, Gift, Star, Clock, ArrowLeft, Copy } from 'lucide-react'
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('home:promotions.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-bliss-50 shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t('home:promotions.pageTitle')}</h1>
              <p className="text-gray-600">{t('home:promotions.pageSubtitle')}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('home:promotions.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
            >
              <option value="all">{t('home:promotions.filterAll')}</option>
              <option value="percentage">{t('home:promotions.filterPercentage')}</option>
              <option value="fixed_amount">{t('home:promotions.filterFixedAmount')}</option>
              <option value="buy_x_get_y">{t('home:promotions.filterBuyXGetY')}</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
            >
              <option value="newest">{t('home:promotions.sortNewest')}</option>
              <option value="discount">{t('home:promotions.sortHighestDiscount')}</option>
              <option value="expiring">{t('home:promotions.sortExpiring')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {filteredAndSortedPromotions.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">{t('home:promotions.empty.heading')}</h3>
            <p className="text-gray-500">{t('home:promotions.empty.message')}</p>
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
                  className="cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                  style={{ borderRadius: '28px', overflow: 'hidden', background: '#F8F5F1', boxShadow: '0 6px 32px rgba(0,0,0,0.10)' }}
                >
                  {/* ── Banner Area ── */}
                  <div className="relative" style={{ height: '340px', background: '#F8F5F1' }}>

                    {promo.image_url && (
                      <img src={promo.image_url} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                    )}

                    {/* Background SVG — 3 layers */}
                    {!promo.image_url && (
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 340" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <radialGradient id={`wg_${promo.id}`} cx="44%" cy="42%" r="58%">
                            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.82"/>
                            <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.32"/>
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                          </radialGradient>
                          <radialGradient id={`cg_${promo.id}`} cx="52%" cy="56%" r="68%">
                            <stop offset="0%"   stopColor="#FFF0DC" stopOpacity="0.55"/>
                            <stop offset="65%"  stopColor="#FFF0DC" stopOpacity="0.18"/>
                            <stop offset="100%" stopColor="#FFF0DC" stopOpacity="0"/>
                          </radialGradient>
                        </defs>

                        {/* Layer 2 — Cream transparent sweep */}
                        <ellipse cx="205" cy="168" rx="235" ry="210" fill={`url(#cg_${promo.id})`}/>

                        {/* Layer 1 — Large white transparent sweep */}
                        <ellipse cx="195" cy="148" rx="215" ry="190" fill={`url(#wg_${promo.id})`}/>

                        {/* Layer 3 — 2 thin gold curves, bottom only */}
                        <path d="M-10,274 C110,242 268,254 420,220" fill="none" stroke="#D8B36A" strokeWidth="1" opacity="0.42"/>
                        <path d="M-10,290 C110,257 268,269 420,235" fill="none" stroke="#D8B36A" strokeWidth="1" opacity="0.26"/>
                      </svg>
                    )}

                    {/* Ribbon badge — bookmark */}
                    <div
                      className="absolute top-0 right-7 flex flex-col items-center justify-center text-white"
                      style={{
                        width: '68px',
                        paddingTop: '14px',
                        paddingBottom: '22px',
                        background: '#837858',
                        clipPath: 'polygon(0 0, 100% 0, 100% 83%, 50% 100%, 0 83%)',
                        boxShadow: '0 6px 18px rgba(131,120,88,0.45)',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1.35, letterSpacing: '0.02em' }}>ส่วนลด</span>
                      <span style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1.15 }}>{formatDiscount(promo)}</span>
                    </div>

                    {/* Days Left Badge */}
                    {daysLeft > 0 && daysLeft <= 7 && (
                      <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ background: '#837858' }}>
                        <Clock className="w-3 h-3" />
                        {t('home:promotions.daysLeftBadge', { daysLeft })}
                      </div>
                    )}

                    {/* Large discount number */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '56px' }}>
                      {promo.discount_type === 'percentage' ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '11.5rem',
                            fontWeight: 500,
                            color: '#837858',
                            fontFamily: '"Noto Serif Thai", serif',
                            lineHeight: 0.85,
                            letterSpacing: '-4px',
                          }}>
                            {Number(promo.discount_value)}
                          </span>
                          <span style={{
                            fontSize: '3.2rem',
                            fontWeight: 500,
                            color: '#837858',
                            fontFamily: '"Noto Serif Thai", serif',
                            marginTop: '22px',
                            marginLeft: '4px',
                            letterSpacing: '-1px',
                          }}>
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="text-center" style={{ color: '#837858' }}>
                          <div style={{ fontSize: '4.5rem', fontWeight: 900, fontFamily: '"Noto Serif Thai", Georgia, serif' }}>{formatDiscount(promo)}</div>
                        </div>
                      )}
                    </div>

                    {/* OFF with golden lines */}
                    <div className="absolute left-0 right-0 flex items-center px-8" style={{ bottom: '26px', gap: '12px' }}>
                      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to right, transparent, #D8B36A)' }} />
                      <span style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '0.5em', color: '#1a100a', fontFamily: '"Cormorant Garamond", serif', paddingLeft: '4px' }}>OFF</span>
                      <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to left, transparent, #D8B36A)' }} />
                    </div>
                  </div>

                  {/* ── Coupon Box ── */}
                  <div style={{ background: '#F8F5F1', padding: '14px 16px 20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '18px', padding: '18px 20px', boxShadow: '0 2px 18px rgba(0,0,0,0.07)' }}>

                      {/* Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-4 h-4 flex-shrink-0" style={{ color: '#837858' }} />
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#837858' }}>{name}</span>
                      </div>

                      {/* Promo code */}
                      <div className="mb-4">
                        <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>{t('home:promotions.promoCode')}</p>
                        <div
                          className="flex items-center justify-between"
                          style={{
                            background: '#f6f3f0',
                            border: '1.5px dashed #837858',
                            borderRadius: '12px',
                            padding: '13px 16px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard?.writeText(promo.code)
                          }}
                        >
                          <span style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#837858',
                            fontFamily: '"Noto Serif Thai", Georgia, serif',
                            letterSpacing: '0.04em',
                          }}>
                            {promo.code}
                          </span>
                          <Copy className="w-5 h-5 flex-shrink-0" style={{ color: '#837858', opacity: 0.65 }} />
                        </div>
                      </div>

                      {/* Expiry */}
                      <div className="flex items-center gap-2" style={{ color: '#BBBBBB', fontSize: '13px' }}>
                        <Calendar className="w-4 h-4" />
                        <span>ถึง {new Date(promo.end_date).toLocaleDateString('th-TH')}</span>
                      </div>
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