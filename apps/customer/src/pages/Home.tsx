import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Star, ChevronRight, Sparkles, Home, Gem, ChevronLeft, Hand, Flower2 } from 'lucide-react'
import { useServices } from '@bliss/supabase/hooks/useServices'
import { useActivePromotions } from '@bliss/supabase/hooks/usePromotions'
import { useTopReviews, useAllServiceReviewStats } from '@bliss/supabase/hooks/useReviews'
import { useTranslation } from '@bliss/i18n'
import { PromotionDetailModal } from '../components/PromotionDetailModal'

function HomePage() {
  const { t, i18n } = useTranslation(['home', 'common', 'services'])
  const isEn = i18n.language === 'en' || i18n.language === 'cn'
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [promoIndex, setPromoIndex] = useState(0)
  const [selectedPromo, setSelectedPromo] = useState<any>(null)
  const isPaused = useRef(false)
  const { data: services, isLoading, error } = useServices()
  const { data: promotions } = useActivePromotions()
  const { data: topReviews } = useTopReviews(6)
  const { data: serviceReviewStats } = useAllServiceReviewStats()

  const promoCount = promotions?.length || 0

  const nextPromo = useCallback(() => {
    setPromoIndex((prev) => (prev + 1) % promoCount)
  }, [promoCount])

  const prevPromo = useCallback(() => {
    setPromoIndex((prev) => (prev - 1 + promoCount) % promoCount)
  }, [promoCount])

  // Auto-play carousel (pauses on hover)
  useEffect(() => {
    if (promoCount <= 1) return
    const timer = setInterval(() => {
      if (!isPaused.current) nextPromo()
    }, 4000)
    return () => clearInterval(timer)
  }, [promoCount, nextPromo])

  const gradients = [
    'from-amber-600 via-yellow-600 to-amber-700',
    'from-stone-700 via-stone-600 to-stone-800',
    'from-rose-600 via-pink-600 to-rose-700',
    'from-emerald-600 via-teal-600 to-emerald-700',
    'from-indigo-600 via-blue-600 to-indigo-700',
  ]

  const categories = [
    { id: 'massage', name: t('home:categories.massage'), icon: Sparkles, color: 'champagne', services: 15 },
    { id: 'nail', name: t('home:categories.nail'), icon: Hand, color: 'rose-gold', services: 12 },
    { id: 'spa', name: t('home:categories.spa'), icon: Flower2, color: 'sage', services: 8 },
  ]

  // Get top 4 popular services sorted by rating
  const popularServices = services
    ?.sort((a, b) => (b.base_price || 0) - (a.base_price || 0))
    .slice(0, 4)
    .map((service) => ({
      id: service.id,
      name: service.name_en || service.name_th,
      price: Number(service.base_price || 0),
      category: service.category,
      rating: serviceReviewStats?.[service.id]?.avg_rating || 0,
      reviewCount: serviceReviewStats?.[service.id]?.review_count || 0,
      slug: service.slug,
      image: service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    })) || []

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="text-center mb-12 max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-stone-900 mb-6">
            {t('home:hero.title1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 font-normal">
              {t('home:hero.title2')}
            </span>
          </h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto font-light leading-relaxed">
            {t('home:hero.subtitle1')}
            <br />
            {t('home:hero.subtitle2')}
          </p>
        </div>

        {/* Quick Search */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              navigate(searchQuery.trim() ? `/services?search=${encodeURIComponent(searchQuery.trim())}` : '/services')
            }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-2 flex items-center gap-2 border border-stone-100"
          >
            <div className="flex-1 flex items-center gap-2 px-4 py-3">
              <Search className="w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home:hero.searchPlaceholder')}
                className="flex-1 outline-none text-stone-700 placeholder-stone-400 bg-transparent"
              />
            </div>
            <button type="submit" className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('home:hero.searchButton')}
            </button>
          </form>
        </div>
      </section>

      {/* Promotions Slider */}
      {promotions && promotions.length > 0 && (
      <section className="mb-16 px-4">
        <div
          className="max-w-6xl mx-auto relative"
          onMouseEnter={() => { isPaused.current = true }}
          onMouseLeave={() => { isPaused.current = false }}
        >
          {/* Slider container */}
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${promoIndex * 100}%)` }}
            >
              {promotions.map((promo, index) => {
                const name = isEn ? promo.name_en : promo.name_th
                const description = isEn ? (promo.description_en || promo.description_th) : (promo.description_th || promo.description_en)
                const discountLabel = promo.discount_type === 'percentage'
                  ? `${t('home:promotions.discount')} ${Number(promo.discount_value)}%`
                  : promo.discount_type === 'fixed_amount'
                    ? `${t('home:promotions.discount')} ฿${Number(promo.discount_value).toLocaleString()}`
                    : promo.code
                return (
                  <div
                    key={promo.id}
                    onClick={() => setSelectedPromo(promo)}
                    className={`w-full flex-shrink-0 bg-gradient-to-r ${gradients[index % gradients.length]} p-8 md:p-12 text-white relative overflow-hidden min-h-[180px] flex flex-col justify-center cursor-pointer group/slide`}
                  >
                    {promo.image_url && (
                      <img src={promo.image_url} alt={name} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    )}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="absolute inset-0 bg-black/0 group-hover/slide:bg-black/10 transition-colors duration-300" />
                    <div className="relative max-w-2xl">
                      <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium mb-3">{discountLabel}</span>
                      <h3 className="text-2xl md:text-3xl font-semibold">{name}</h3>
                      {description && <p className="text-sm md:text-base opacity-90 mt-2 font-light max-w-lg">{description}</p>}
                      <p className="text-xs opacity-70 mt-3 font-mono bg-white/10 inline-block px-2 py-1 rounded">{t('home:promotions.code')}: {promo.code}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Navigation arrows */}
          {promotions.length > 1 && (
            <>
              <button
                onClick={prevPromo}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition z-10"
              >
                <ChevronLeft className="w-5 h-5 text-stone-700" />
              </button>
              <button
                onClick={nextPromo}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition z-10"
              >
                <ChevronRight className="w-5 h-5 text-stone-700" />
              </button>
            </>
          )}

          {/* Dots indicator */}
          {promotions.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {promotions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setPromoIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === promoIndex ? 'w-6 bg-amber-700' : 'w-2 bg-stone-300 hover:bg-stone-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Categories */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-stone-900 mb-8 tracking-wide">{t('home:categories.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <Link
                key={category.id}
                to={`/services?category=${category.id}`}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 text-left block border border-stone-100 group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-stone-100 rounded-xl flex items-center justify-center mb-4 group-hover:from-amber-100 group-hover:to-amber-50 transition">
                  <IconComponent className="w-7 h-7 text-amber-700" />
                </div>
                <h4 className="text-xl font-medium text-stone-900 mb-1">{category.name}</h4>
                <p className="text-stone-500 text-sm font-light">{t('home:categories.servicesCount', { count: category.services })}</p>
              </Link>
            )
          })}
        </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-light text-stone-900 tracking-wide">{t('home:popular.title')}</h3>
            <Link to="/services" className="text-amber-700 hover:text-amber-800 font-medium text-sm flex items-center gap-1">
              {t('common:buttons.viewAll')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
              <p className="text-stone-600 mt-4">{t('home:popular.loading')}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{t('home:popular.error')}</p>
            </div>
          )}

          {!isLoading && !error && popularServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-stone-600">{t('home:popular.empty')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!isLoading && !error && popularServices.map((service) => {
            const category = categories.find(c => c.id === service.category)
            const IconComponent = category?.icon || Sparkles
            return (
              <Link
                key={service.id}
                to={`/services/${service.slug}`}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden group block border border-stone-100"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-stone-900 mb-2">{service.name}</h4>
                  {service.reviewCount > 0 ? (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm text-stone-600">{service.rating.toFixed(1)}</span>
                      <span className="text-sm text-stone-400">({service.reviewCount})</span>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 mb-2">{t('services:reviews.noReviews')}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-amber-700">฿{service.price}</span>
                    <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-amber-100 hover:text-amber-800 transition">
                      {t('home:popular.book')}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        </div>
      </section>

      {/* Customer Reviews */}
      {topReviews && topReviews.length > 0 && (
        <section className="mb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-light text-stone-900 mb-2 text-center tracking-wide">{t('home:reviews.title')}</h3>
            <p className="text-stone-500 text-sm font-light text-center mb-8">{t('home:reviews.subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'}`}
                      />
                    ))}
                  </div>
                  {review.review && (
                    <p className="text-stone-600 text-sm font-light leading-relaxed mb-4 line-clamp-3">"{review.review}"</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-amber-800">{review.customer_display_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{review.customer_display_name}</p>
                      <p className="text-xs text-stone-400">{isEn ? review.service_name_en : review.service_name_th}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-stone-900 mb-8 text-center tracking-wide">{t('home:whyChooseUs.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">{t('home:whyChooseUs.experts')}</h4>
            <p className="text-stone-600 text-sm font-light">{t('home:whyChooseUs.expertsDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-stone-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">{t('home:whyChooseUs.atYourDoor')}</h4>
            <p className="text-stone-600 text-sm font-light">{t('home:whyChooseUs.atYourDoorDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gem className="w-8 h-8 text-amber-700" />
            </div>
            <h4 className="font-medium text-stone-900 mb-2">{t('home:whyChooseUs.premiumQuality')}</h4>
            <p className="text-stone-600 text-sm font-light">{t('home:whyChooseUs.premiumQualityDesc')}</p>
          </div>
        </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-stone-800 via-stone-700 to-stone-900 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
          <h3 className="text-3xl font-light mb-4 tracking-wide">{t('home:cta.title')}</h3>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto font-light">
            {t('home:cta.subtitle1')}
            <br />
            {t('home:cta.subtitle2')}
          </p>
          <Link to="/services" className="inline-block bg-white text-stone-800 px-8 py-4 rounded-full font-medium text-lg hover:shadow-2xl transition transform hover:scale-105">
            {t('common:buttons.bookNow')}
          </Link>
        </div>
        </div>
      </section>

      {/* Promotion Detail Modal */}
      <PromotionDetailModal
        promotion={selectedPromo}
        onClose={() => setSelectedPromo(null)}
      />
    </div>
  )
}

export default HomePage
