import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, ChevronLeft, Sparkles, Search, Hand, Flower2, Palette, Loader2, AlertCircle, Check, Star } from 'lucide-react'
import { useServiceBySlug } from '@bliss/supabase/hooks/useServices'
import { useServiceReviewStats, useServiceReviews } from '@bliss/supabase/hooks/useReviews'
import { useTranslation } from '@bliss/i18n'
import { getPriceForDuration, getAvailableDurations } from '../components/ServiceDurationPicker'
import { pickLang } from '../utils/serviceUtils'
import { LINE_CONTACT_URL } from '../config/contact'

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
  facial: Palette,
}

function ServiceDetails() {
  const { t, i18n } = useTranslation(['services', 'common'])
  const { slug } = useParams()
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [selectedDuration, setSelectedDuration] = useState<number>(0)

  const { data: serviceData, isLoading, error } = useServiceBySlug(slug)
  const serviceId = serviceData?.id
  const { data: reviewStats } = useServiceReviewStats(serviceId)
  const { data: reviews } = useServiceReviews(serviceId, 5)

  const isThai = i18n.language === 'th'

  // Transform service data
  const service = useMemo(() => {
    if (!serviceData) return null

    const durations = getAvailableDurations(serviceData)

    return {
      id: serviceData.id,
      name: pickLang(serviceData, 'name', i18n.language),
      name_sub: i18n.language === 'th' ? serviceData.name_en : serviceData.name_th,
      base_price: Number(serviceData.base_price || 0),
      category: serviceData.category,
      duration: serviceData.duration || 60,
      durations,
      image_url: serviceData.image_url,
      description: pickLang(serviceData, 'description', i18n.language),
      addOns: serviceData.addons?.map(addon => ({
        id: addon.id,
        // add-on is out of scope for CN (no *_cn columns); pickLang falls back en→th
        name: pickLang(addon, 'name', i18n.language),
        description: pickLang(addon, 'description', i18n.language),
        price: Number(addon.price || 0),
      })) || [],
      raw: serviceData,
    }
  }, [serviceData, i18n.language])

  // Auto-select default duration
  useMemo(() => {
    if (service && selectedDuration === 0) {
      setSelectedDuration(service.duration || service.durations[0])
    }
  }, [service])

  const IconComponent = service ? categoryIcons[service.category] || Sparkles : Sparkles

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-bliss-600 mx-auto" />
          <p className="text-bliss-700 mt-2">{t('common:loading.services')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-medium text-bliss-900 mt-4">{t('common:errors.cannotLoadService')}</h2>
          <Link to="/services" className="inline-block mt-4 text-bliss-600 hover:text-bliss-700 font-medium">
            {t('common:errors.backToServices')}
          </Link>
        </div>
      </div>
    )
  }

  // Not found state
  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Search className="w-16 h-16 text-bliss-400 mx-auto" />
          <h2 className="text-2xl font-medium text-bliss-900 mt-4">{t('common:errors.serviceNotFound')}</h2>
          <Link to="/services" className="inline-block mt-4 text-bliss-600 hover:text-bliss-700 font-medium">
            {t('common:errors.backToServices')}
          </Link>
        </div>
      </div>
    )
  }

  const addOns = service.addOns || []

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const activeDuration = selectedDuration || service.durations[0]
  const servicePrice = getPriceForDuration(service.raw, activeDuration)
  const addOnsPrice = selectedAddOns.reduce((sum, id) => {
    const addOn = addOns.find(a => a.id === id)
    return sum + (addOn?.price || 0)
  }, 0)
  const totalPrice = servicePrice + addOnsPrice

  // Category display names
  const categoryNames: Record<string, string> = {
    massage: t('services:details.categoryMassage'),
    nail: t('services:details.categoryNail'),
    spa: t('services:details.categorySpa'),
    facial: t('services:details.categoryFacial'),
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Link to="/services" className="inline-flex items-center text-bliss-700 hover:text-bliss-600 mb-6 font-medium transition">
          <ChevronLeft className="w-5 h-5" />
          {t('services:details.backToServices')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Info */}
          <div className="lg:col-span-2">
            {/* Image */}
            <div className="rounded-2xl aspect-[21/9] overflow-hidden mb-6 border border-bliss-200 bg-gray-100">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      service.name
                    )}&background=565b34&color=fff&size=600`
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bliss-200">
                  <IconComponent className="w-24 h-24 text-bliss-600" />
                </div>
              )}
            </div>

            {/* Service Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-bliss-100">
              <div className="mb-4">
                <h1 className="text-3xl font-light text-bliss-900 mb-1 tracking-tight">{service.name}</h1>
                {service.name_sub && (
                  <p className="text-lg text-bliss-400 font-light">{service.name_sub}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-bliss-700 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bliss-100 text-bliss-600 text-sm font-medium">
                  <IconComponent className="w-4 h-4" />
                  {categoryNames[service.category]}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-bliss-500">
                  <Clock className="w-4 h-4" />
                  {service.durations.length > 1
                    ? `${service.durations[0]}-${service.durations[service.durations.length - 1]} ${t('services:details.min')}`
                    : `${service.durations[0]} ${t('services:details.min')}`
                  }
                </span>
                <span className="text-sm text-bliss-500">
                  {t('services:details.startingFrom')}{' '}
                  <span className="font-semibold text-bliss-600">
                    ฿{getPriceForDuration(service.raw, service.durations[0]).toLocaleString()}
                  </span>
                </span>
              </div>

              {/* Description */}
              {service.description ? (
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium mb-3 text-bliss-900">{t('services:details.description')}</h3>
                  <p className="text-bliss-700 font-light leading-relaxed whitespace-pre-line">{service.description}</p>
                </div>
              ) : (
                <p className="text-bliss-400 italic text-sm">{t('services:details.noDescription')}</p>
              )}
            </div>

            {/* Duration & Pricing Card */}
            {service.durations.length > 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-bliss-100">
                <h3 className="text-xl font-medium text-bliss-900 mb-4">{t('services:details.durationAndPricing')}</h3>
                <div className="grid gap-3">
                  {service.durations.map((dur) => {
                    const price = getPriceForDuration(service.raw, dur)
                    const isSelected = activeDuration === dur
                    return (
                      <button
                        key={dur}
                        onClick={() => setSelectedDuration(dur)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition ${
                          isSelected
                            ? 'border-bliss-600 bg-bliss-100'
                            : 'border-bliss-200 hover:border-bliss-400 hover:bg-bliss-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-bliss-600 bg-bliss-600' : 'border-bliss-300'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-bliss-900">{dur} {t('services:details.minutes')}</span>
                            <span className="text-sm text-bliss-500 ml-2">
                              ({dur / 60 >= 1 ? `${Math.floor(dur / 60)}${dur % 60 > 0 ? `.${dur % 60}` : ''} ${t('services:details.hour')}` : ''})
                            </span>
                          </div>
                        </div>
                        <span className={`text-lg font-semibold ${isSelected ? 'text-bliss-600' : 'text-bliss-700'}`}>
                          ฿{price.toLocaleString()}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-bliss-100 space-y-1.5">
                  <p className="text-xs text-bliss-400">• {t('services:details.priceIncludesServiceAndTransport')}</p>
                  <p className="text-xs text-bliss-400">• {t('services:details.oilSurchargeNote')}</p>
                </div>
              </div>
            )}

            {/* Add-ons Card */}
            {addOns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-bliss-100">
                <h3 className="text-xl font-medium text-bliss-900 mb-4">{t('services:details.addons')}</h3>
                <div className="space-y-3">
                  {addOns.map((addOn) => (
                    <button
                      key={addOn.id}
                      onClick={() => toggleAddOn(addOn.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition ${
                        selectedAddOns.includes(addOn.id)
                          ? 'border-bliss-600 bg-bliss-100'
                          : 'border-bliss-200 hover:border-bliss-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-bliss-900">{addOn.name}</h4>
                          {addOn.description && (
                            <p className="text-sm text-bliss-500 font-light mt-0.5">{addOn.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-bliss-600">+฿{addOn.price.toLocaleString()}</span>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedAddOns.includes(addOn.id)
                              ? 'border-bliss-600 bg-bliss-600 text-white'
                              : 'border-bliss-300'
                          }`}>
                            {selectedAddOns.includes(addOn.id) && <Check className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Reviews Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6 border border-bliss-100">
              <h3 className="text-xl font-medium text-bliss-900 mb-4">
                {t('services:reviews.title')}
              </h3>

              {reviewStats && reviewStats.review_count > 0 ? (
                <>
                  {/* Aggregate Stats */}
                  <div className="flex items-start gap-6 mb-6 p-4 bg-bliss-100/60 rounded-xl">
                    <div className="text-center flex-shrink-0">
                      <div className="text-3xl font-bold text-bliss-600">{reviewStats.avg_rating}</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(reviewStats.avg_rating)) ? 'text-bliss-600 fill-bliss-600' : 'text-bliss-300'}`} />
                        ))}
                      </div>
                      <div className="text-xs text-bliss-500 mt-1">
                        {t('services:reviews.totalReviews', { count: reviewStats.review_count })}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { label: t('services:reviews.cleanliness'), value: reviewStats.avg_cleanliness },
                        { label: t('services:reviews.professionalism'), value: reviewStats.avg_professionalism },
                        { label: t('services:reviews.skill'), value: reviewStats.avg_skill },
                      ].map(sub => sub.value && (
                        <div key={sub.label} className="flex items-center gap-2 text-sm">
                          <span className="text-bliss-700 w-32 flex-shrink-0">{sub.label}</span>
                          <div className="flex-1 h-2 bg-bliss-200 rounded-full overflow-hidden">
                            <div className="h-2 bg-bliss-600 rounded-full" style={{ width: `${(Number(sub.value) / 5) * 100}%` }} />
                          </div>
                          <span className="text-bliss-700 w-6 text-right font-medium">{sub.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    {reviews?.map(review => (
                      <div key={review.id} className="border-b border-bliss-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-bliss-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-bliss-600">{review.customer_display_name.charAt(0)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-bliss-900 text-sm">{review.customer_display_name}</span>
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-bliss-600 fill-bliss-600' : 'text-bliss-300'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-bliss-400">
                            {new Date(review.created_at).toLocaleDateString(isThai ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {review.review && (
                          <p className="text-bliss-700 text-sm font-light leading-relaxed ml-10">{review.review}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-bliss-400 text-sm italic">{t('services:reviews.noReviews')}</p>
              )}
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-bliss-100">
              <h3 className="text-xl font-medium text-bliss-900 mb-6">{t('services:details.bookingSummary')}</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-bliss-200">
                {/* Service + Duration */}
                <div className="flex justify-between text-bliss-700">
                  <div>
                    <span>{service.name}</span>
                    <span className="text-bliss-400 text-sm ml-1">({activeDuration} {t('services:details.min')})</span>
                  </div>
                  <span className="font-medium">฿{servicePrice.toLocaleString()}</span>
                </div>
                {/* Selected Add-ons */}
                {selectedAddOns.map(id => {
                  const addon = addOns.find(a => a.id === id)
                  if (!addon) return null
                  return (
                    <div key={id} className="flex justify-between text-bliss-500 text-sm">
                      <span>+ {addon.name}</span>
                      <span>฿{addon.price.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-medium text-bliss-900">{t('services:details.total')}</span>
                <span className="text-2xl font-semibold text-bliss-600">฿{totalPrice.toLocaleString()}</span>
              </div>

              <Link
                to={`/booking?service=${slug}&duration=${activeDuration}${selectedAddOns.length > 0 ? `&addons=${selectedAddOns.join(',')}` : ''}`}
                className="block w-full bg-bliss-600 text-white text-center py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 shadow-md"
              >
                {t('services:details.bookService')}
              </Link>

              <div className="mt-6 pt-6 border-t border-bliss-200 text-center">
                <p className="text-sm text-bliss-500">{t('services:details.questions')}</p>
                <button
                  onClick={() => window.open(LINE_CONTACT_URL, '_blank', 'noopener,noreferrer')}
                  className="text-bliss-600 font-medium text-sm hover:underline mt-1"
                >
                  {t('services:details.askMore')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetails
