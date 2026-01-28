import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Clock, ChevronLeft, Plus, Minus, Heart, Sparkles, Search, Hand, Flower2 } from 'lucide-react'
import { useServiceBySlug } from '@bliss/supabase/hooks/useServices'

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
}

function ServiceDetails() {
  const { slug } = useParams()
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)

  const { data: serviceData, isLoading, error } = useServiceBySlug(slug)

  // Transform service data to match expected format
  const service = useMemo(() => {
    if (!serviceData) return null

    return {
      id: serviceData.id,
      name: serviceData.name_en || serviceData.name_th,
      nameTh: serviceData.name_th,
      price: Number(serviceData.base_price || 0),
      category: serviceData.category,
      rating: 4.5, // Default rating
      reviews: 0, // Default reviews
      duration: serviceData.duration || 60,
      image: serviceData.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
      description: serviceData.description_en || serviceData.description_th || '',
      benefits: [], // Parse from description or separate field
      addOns: serviceData.addons?.map(addon => ({
        id: addon.id,
        name: addon.name_en || addon.name_th,
        price: Number(addon.price || 0),
        description: addon.description_en || addon.description_th || '',
      })) || [],
    }
  }, [serviceData])

  const IconComponent = service ? categoryIcons[service.category] || Sparkles : Sparkles

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="text-stone-600 mt-4">Loading service...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Failed to load service</p>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← Back to Services
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
          <h2 className="text-2xl font-medium text-stone-900 mt-4">Service Not Found</h2>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← Back to Services
          </Link>
        </div>
      </div>
    )
  }

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const basePrice = service.price
  const addOnsPrice = selectedAddOns.reduce((sum, id) => {
    const addOn = service.addOns.find((a: any) => a.id === id)
    return sum + (addOn?.price || 0)
  }, 0)
  const totalPrice = (basePrice + addOnsPrice) * quantity

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Link to="/services" className="inline-flex items-center text-stone-600 hover:text-amber-700 mb-6 font-medium transition">
          <ChevronLeft className="w-5 h-5" />
          Back to Services
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl h-80 overflow-hidden mb-6 border border-stone-200">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-light text-stone-900 mb-2 tracking-tight">{service.name}</h1>
                  <p className="text-lg text-stone-500 font-light">{service.nameTh}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="text-lg font-semibold">{service.rating}</span>
                  </div>
                  <p className="text-sm text-stone-500">{service.reviews} reviews</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-stone-600 mb-6">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {service.duration} min
                </span>
                <span className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-amber-700" />
                  {service.category === 'massage' ? 'Massage' : service.category === 'nail' ? 'Nail Care' : 'Spa'}
                </span>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-medium mb-3 text-stone-900">Description</h3>
                <p className="text-stone-700 font-light leading-relaxed">{service.description}</p>

                {service.benefits.length > 0 && (
                  <>
                    <h3 className="text-lg font-medium mt-6 mb-3 text-stone-900">Benefits</h3>
                    <ul className="space-y-2 text-stone-700">
                      {service.benefits.map((benefit: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {service.addOns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
                <h3 className="text-xl font-medium text-stone-900 mb-4">Enhancements</h3>
                <div className="space-y-3">
                  {service.addOns.map((addOn: any) => (
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
                          <p className="text-sm text-stone-500 font-light">{addOn.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-700">+฿{addOn.price}</span>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedAddOns.includes(addOn.id)
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-stone-300'
                          }`}>
                            {selectedAddOns.includes(addOn.id) && '✓'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-stone-100">
              <h3 className="text-xl font-medium text-stone-900 mb-6">Order Summary</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-3">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border-2 border-stone-300 flex items-center justify-center hover:border-amber-500 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-stone-300 flex items-center justify-center hover:border-amber-500 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-stone-200">
                <div className="flex justify-between text-stone-600">
                  <span>Service</span>
                  <span>฿{basePrice}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Enhancements</span>
                    <span>฿{addOnsPrice}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Quantity</span>
                  <span>x{quantity}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-medium text-stone-900">Total</span>
                <span className="text-2xl font-semibold text-amber-700">฿{totalPrice.toLocaleString()}</span>
              </div>

              <div className="space-y-3">
                <Link
                  to={`/booking?service=${slug}&addons=${selectedAddOns.join(',')}&qty=${quantity}`}
                  className="block w-full bg-gradient-to-r from-amber-700 to-amber-800 text-white text-center py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 shadow-md"
                >
                  Book Service
                </Link>
                <button className="w-full border-2 border-stone-300 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 hover:border-amber-500 transition flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  Save for Later
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-stone-200 text-center">
                <p className="text-sm text-stone-500">Have questions?</p>
                <button className="text-amber-700 font-medium text-sm hover:underline mt-1">
                  Chat with us
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
