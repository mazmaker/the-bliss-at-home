import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, ChevronLeft, Sparkles, Search, Hand, Flower2, Palette, Loader2, AlertCircle, Check } from 'lucide-react'
import { useServiceBySlug } from '@bliss/supabase/hooks/useServices'
import { useTranslation } from '@bliss/i18n'
import { getPriceForDuration, getAvailableDurations } from '../components/ServiceDurationPicker'

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

  const isThai = i18n.language === 'th'

  // Transform service data
  const service = useMemo(() => {
    if (!serviceData) return null

    const durations = getAvailableDurations(serviceData)

    return {
      id: serviceData.id,
      name: isThai
        ? (serviceData.name_th || serviceData.name_en)
        : (serviceData.name_en || serviceData.name_th),
      name_sub: isThai
        ? serviceData.name_en
        : serviceData.name_th,
      base_price: Number(serviceData.base_price || 0),
      category: serviceData.category,
      duration: serviceData.duration || 60,
      durations,
      image_url: serviceData.image_url,
      description: isThai
        ? (serviceData.description_th || serviceData.description_en || '')
        : (serviceData.description_en || serviceData.description_th || ''),
      addOns: serviceData.addons?.map(addon => ({
        id: addon.id,
        name: isThai
          ? (addon.name_th || addon.name_en)
          : (addon.name_en || addon.name_th),
        description: isThai
          ? (addon.description_th || addon.description_en || '')
          : (addon.description_en || addon.description_th || ''),
        price: Number(addon.price || 0),
      })) || [],
      raw: serviceData,
    }
  }, [serviceData, isThai])

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
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
          <p className="text-stone-600 mt-2">{t('common:loading.services')}</p>
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
          <h2 className="text-2xl font-medium text-stone-900 mt-4">{t('common:errors.cannotLoadService')}</h2>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
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
          <Search className="w-16 h-16 text-stone-400 mx-auto" />
          <h2 className="text-2xl font-medium text-stone-900 mt-4">{t('common:errors.serviceNotFound')}</h2>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
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
        <Link to="/services" className="inline-flex items-center text-stone-600 hover:text-amber-700 mb-6 font-medium transition">
          <ChevronLeft className="w-5 h-5" />
          {t('services:details.backToServices')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Info */}
          <div className="lg:col-span-2">
            {/* Image */}
            <div className="rounded-2xl h-80 overflow-hidden mb-6 border border-stone-200 bg-gray-100">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      service.name
                    )}&background=f59e0b&color=fff&size=600`
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                  <IconComponent className="w-24 h-24 text-amber-600" />
                </div>
              )}
            </div>

            {/* Service Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-100">
              <div className="mb-4">
                <h1 className="text-3xl font-light text-stone-900 mb-1 tracking-tight">{service.name}</h1>
                {service.name_sub && (
                  <p className="text-lg text-stone-400 font-light">{service.name_sub}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-stone-600 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                  <IconComponent className="w-4 h-4" />
                  {categoryNames[service.category]}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-stone-500">
                  <Clock className="w-4 h-4" />
                  {service.durations.length > 1
                    ? `${service.durations[0]}-${service.durations[service.durations.length - 1]} ${t('services:details.min')}`
                    : `${service.durations[0]} ${t('services:details.min')}`
                  }
                </span>
                <span className="text-sm text-stone-500">
                  {t('services:details.startingFrom')}{' '}
                  <span className="font-semibold text-amber-700">
                    ฿{getPriceForDuration(service.raw, service.durations[0]).toLocaleString()}
                  </span>
                </span>
              </div>

              {/* Description */}
              {service.description ? (
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium mb-3 text-stone-900">{t('services:details.description')}</h3>
                  <p className="text-stone-700 font-light leading-relaxed whitespace-pre-line">{service.description}</p>
                </div>
              ) : (
                <p className="text-stone-400 italic text-sm">{t('services:details.noDescription')}</p>
              )}
            </div>

            {/* Duration & Pricing Card */}
            {service.durations.length > 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-100">
                <h3 className="text-xl font-medium text-stone-900 mb-4">{t('services:details.durationAndPricing')}</h3>
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
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-stone-900">{dur} {t('services:details.minutes')}</span>
                            <span className="text-sm text-stone-500 ml-2">
                              ({dur / 60 >= 1 ? `${Math.floor(dur / 60)}${dur % 60 > 0 ? `.${dur % 60}` : ''} ${isThai ? 'ชั่วโมง' : 'hr'}` : ''})
                            </span>
                          </div>
                        </div>
                        <span className={`text-lg font-semibold ${isSelected ? 'text-amber-700' : 'text-stone-700'}`}>
                          ฿{price.toLocaleString()}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add-ons Card */}
            {addOns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
                <h3 className="text-xl font-medium text-stone-900 mb-4">{t('services:details.addons')}</h3>
                <div className="space-y-3">
                  {addOns.map((addOn) => (
                    <button
                      key={addOn.id}
                      onClick={() => toggleAddOn(addOn.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition ${
                        selectedAddOns.includes(addOn.id)
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-stone-900">{addOn.name}</h4>
                          {addOn.description && (
                            <p className="text-sm text-stone-500 font-light mt-0.5">{addOn.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-700">+฿{addOn.price.toLocaleString()}</span>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedAddOns.includes(addOn.id)
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-stone-300'
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
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-stone-100">
              <h3 className="text-xl font-medium text-stone-900 mb-6">{t('services:details.bookingSummary')}</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-stone-200">
                {/* Service + Duration */}
                <div className="flex justify-between text-stone-600">
                  <div>
                    <span>{service.name}</span>
                    <span className="text-stone-400 text-sm ml-1">({activeDuration} {t('services:details.min')})</span>
                  </div>
                  <span className="font-medium">฿{servicePrice.toLocaleString()}</span>
                </div>
                {/* Selected Add-ons */}
                {selectedAddOns.map(id => {
                  const addon = addOns.find(a => a.id === id)
                  if (!addon) return null
                  return (
                    <div key={id} className="flex justify-between text-stone-500 text-sm">
                      <span>+ {addon.name}</span>
                      <span>฿{addon.price.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-medium text-stone-900">{t('services:details.total')}</span>
                <span className="text-2xl font-semibold text-amber-700">฿{totalPrice.toLocaleString()}</span>
              </div>

              <Link
                to={`/booking?service=${slug}&duration=${activeDuration}${selectedAddOns.length > 0 ? `&addons=${selectedAddOns.join(',')}` : ''}`}
                className="block w-full bg-gradient-to-r from-amber-700 to-amber-800 text-white text-center py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 shadow-md"
              >
                {t('services:details.bookService')}
              </Link>

              <div className="mt-6 pt-6 border-t border-stone-200 text-center">
                <p className="text-sm text-stone-500">{t('services:details.questions')}</p>
                <button className="text-amber-700 font-medium text-sm hover:underline mt-1">
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
