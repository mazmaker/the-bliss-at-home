import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Star, ChevronRight, Sparkles, Home, Gem, ChevronLeft, Flower2 } from 'lucide-react'
import { useServices } from '@bliss/supabase/hooks/useServices'
import { useActivePromotions } from '@bliss/supabase/hooks/usePromotions'
import { useAllServiceReviewStats } from '@bliss/supabase/hooks/useReviews'
import { useTranslation } from '@bliss/i18n'
import { PromotionDetailModal } from '../components/PromotionDetailModal'
import { getPriceForDuration } from '../components/ServiceDurationPicker'
import { DiscountPrice } from '../components/DiscountPrice'
import EmergencyBookingBanner from '../components/EmergencyBookingBanner'
import { getMinimumPriceInfo, pickLang } from '../utils/serviceUtils'
import { getServiceImage } from '../utils/imageUtils'

function HomePage() {
  const { t, i18n } = useTranslation(['home', 'common', 'services'])
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [promoIndex, setPromoIndex] = useState(0)
  const [selectedPromo, setSelectedPromo] = useState<any>(null)
  const isPaused = useRef(false)
  const { data: services, isLoading, error } = useServices()
  const { data: promotions } = useActivePromotions()
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

  const promoBgs = ['#ebe6d0', '#dfd9b9', '#ebe6d0', '#dfd9b9', '#ebe6d0']

  // Calculate actual service counts by category
  const getServiceCountByCategory = (categoryId: string) => {
    if (!services) return 0
    return services.filter(service => service.category === categoryId).length
  }

  const categories = [
    {
      id: 'massage',
      name: t('home:categories.massage'),
      icon: Sparkles,
      color: 'champagne',
      services: getServiceCountByCategory('massage')
    },
    {
      id: 'spa',
      name: t('home:categories.spa'),
      icon: Flower2,
      color: 'sage',
      services: getServiceCountByCategory('spa')
    },
  ]

  // Get top 4 popular services sorted by actual display price
  const popularServices = services
    ?.map((service) => {
      // Use minimum available duration price instead of hardcoded 60min
      const minPriceInfo = getMinimumPriceInfo(service)
      return {
        ...service,
        displayPrice: minPriceInfo.price,
        minDuration: minPriceInfo.duration
      }
    })
    .sort((a, b) => (b.displayPrice || 0) - (a.displayPrice || 0))
    .slice(0, 4)
    .map((service) => ({
      id: service.id,
      name: pickLang(service, 'name', i18n.language),
      price: service.displayPrice,
      minDuration: service.minDuration,
      category: service.category,
      rating: serviceReviewStats?.[service.id]?.avg_rating || 0,
      reviewCount: serviceReviewStats?.[service.id]?.review_count || 0,
      slug: service.slug,
      image: getServiceImage(service.image_url, service.category),
    })) || []

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="text-center mb-12 max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-bliss-900 mb-6">
            {t('home:hero.title1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-bliss-600 via-bliss-400 to-bliss-600 font-normal">
              {t('home:hero.title2')}
            </span>
          </h2>
          <p className="text-lg text-bliss-700 max-w-2xl mx-auto font-light leading-relaxed">
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
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-2 flex items-center gap-2 border border-bliss-100"
          >
            <div className="flex-1 flex items-center gap-2 px-4 py-3">
              <Search className="w-5 h-5 text-bliss-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home:hero.searchPlaceholder')}
                className="flex-1 outline-none text-bliss-700 placeholder-bliss-400 bg-transparent"
              />
            </div>
            <button type="submit" className="bg-bliss-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('home:hero.searchButton')}
            </button>
          </form>
        </div>
      </section>

      {/* Emergency Booking Banner */}
      <section className="px-4">
        <div className="max-w-6xl mx-auto relative">
          <EmergencyBookingBanner
            onContactAdmin={() => {
              // LINE / Facebook open directly from the banner (config/contact single source);
              // no extra routing needed.
            }}
          />
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
                const name = pickLang(promo, 'name', i18n.language)
                const description = pickLang(promo, 'description', i18n.language)
                return (
                  <div
                    key={promo.id}
                    onClick={() => setSelectedPromo(promo)}
                    className="w-full flex-shrink-0 p-8 md:p-12 relative overflow-hidden min-h-[180px] flex flex-col justify-center cursor-pointer group/slide"
                    style={{ backgroundColor: promoBgs[index % promoBgs.length] }}
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: 'rgba(86,91,52,0.07)' }} />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full translate-y-1/2 -translate-x-1/2" style={{ background: 'rgba(86,91,52,0.05)' }} />
                    <div className="absolute inset-0 group-hover/slide:bg-black/5 transition-colors duration-300" />
                    <div className="relative max-w-2xl mx-auto text-center">
                      <h3 className="text-4xl md:text-5xl font-bold" style={{ color: '#e3342f' }}>{name}</h3>
                      {description && <p className="text-sm md:text-base mt-2 font-light mx-auto" style={{ color: '#464a28' }}>{description}</p>}
                      <p className="text-xs mt-3 font-mono inline-block px-2 py-1 rounded" style={{ background: 'rgba(86,91,52,0.12)', color: '#565b34' }}>{t('home:promotions.code')}: {promo.code}</p>
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
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-bliss-50 rounded-full shadow-lg flex items-center justify-center transition z-10"
              >
                <ChevronLeft className="w-5 h-5 text-bliss-700" />
              </button>
              <button
                onClick={nextPromo}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-bliss-50 rounded-full shadow-lg flex items-center justify-center transition z-10"
              >
                <ChevronRight className="w-5 h-5 text-bliss-700" />
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
                    index === promoIndex ? 'w-6 bg-bliss-600' : 'w-2 bg-bliss-300 hover:bg-bliss-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      )}


      {/* Popular Services */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-light text-bliss-900 tracking-wide">{t('home:popular.title')}</h3>
            <Link to="/services" className="text-bliss-600 hover:text-bliss-700 font-medium text-sm flex items-center gap-1">
              {t('common:buttons.viewAll')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto"></div>
              <p className="text-bliss-700 mt-4">{t('home:popular.loading')}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">{t('home:popular.error')}</p>
            </div>
          )}

          {!isLoading && !error && popularServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-bliss-700">{t('home:popular.empty')}</p>
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
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden group block border border-bliss-100"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-bliss-900 mb-2">{service.name}</h4>
                  {service.reviewCount > 0 ? (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-bliss-600 fill-bliss-600" />
                      <span className="text-sm text-bliss-700">{service.rating.toFixed(1)}</span>
                      <span className="text-sm text-bliss-400">({service.reviewCount})</span>
                    </div>
                  ) : (
                    <p className="text-sm text-bliss-400 mb-2">{t('services:reviews.noReviews')}</p>
                  )}
                  <div className="flex flex-col gap-1">
                    <DiscountPrice
                      originalPrice={service.price || 0}
                      size="sm"
                      className=""
                    />
                    <span className="text-xs text-bliss-500">{t('services:durationLabel', { duration: service.minDuration })}</span>
                  </div>
                  <span className="bg-bliss-600 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-bliss-700 transition mt-2 inline-block text-center w-full">
                    {t('home:popular.book')}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
        </div>
      </section>


      {/* Why Choose Us */}
      <section className="mb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-light text-bliss-900 mb-8 text-center tracking-wide">{t('home:whyChooseUs.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-bliss-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-bliss-600" />
            </div>
            <h4 className="font-medium text-bliss-900 mb-2">{t('home:whyChooseUs.experts')}</h4>
            <p className="text-bliss-700 text-sm font-light">{t('home:whyChooseUs.expertsDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-bliss-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-bliss-700" />
            </div>
            <h4 className="font-medium text-bliss-900 mb-2">{t('home:whyChooseUs.atYourDoor')}</h4>
            <p className="text-bliss-700 text-sm font-light">{t('home:whyChooseUs.atYourDoorDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-bliss-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gem className="w-8 h-8 text-bliss-600" />
            </div>
            <h4 className="font-medium text-bliss-900 mb-2">{t('home:whyChooseUs.premiumQuality')}</h4>
            <p className="text-bliss-700 text-sm font-light">{t('home:whyChooseUs.premiumQualityDesc')}</p>
          </div>
        </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl p-8 md:p-12 text-center border border-bliss-300" style={{ backgroundColor: '#ebe6d0' }}>
            <h3 className="text-3xl font-light mb-4 tracking-wide" style={{ color: '#1a1a1a' }}>{t('home:cta.title')}</h3>
            <p className="mb-6 max-w-2xl mx-auto font-light" style={{ color: '#464a28' }}>
              {t('home:cta.subtitle1')}
              <br />
              {t('home:cta.subtitle2')}
            </p>
            <Link to="/services" className="inline-block px-8 py-4 rounded-full font-medium text-lg hover:opacity-90 transition transform hover:scale-105 text-white" style={{ backgroundColor: '#565b34' }}>
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
