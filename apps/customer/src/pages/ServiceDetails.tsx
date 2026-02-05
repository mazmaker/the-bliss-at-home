import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Clock, ChevronLeft, Plus, Minus, Sparkles, Search, Hand, Flower2, Palette, Loader2, AlertCircle } from 'lucide-react'
import { useServiceBySlug } from '@bliss/supabase/hooks/useServices'

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
  facial: Palette,
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
      name_en: serviceData.name_en || serviceData.name_th,
      name_th: serviceData.name_th,
      base_price: Number(serviceData.base_price || 0),
      hotel_price: Number(serviceData.hotel_price || serviceData.base_price || 0),
      category: serviceData.category,
      rating: 4.5, // Default rating
      reviews: 0, // Default reviews
      duration: serviceData.duration || 60,
      image_url: serviceData.image_url,
      description_en: serviceData.description_en || '',
      description_th: serviceData.description_th || '',
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
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
          <p className="text-stone-600 mt-2">กำลังโหลดข้อมูล...</p>
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
          <h2 className="text-2xl font-medium text-stone-900 mt-4">ไม่สามารถโหลดข้อมูลบริการได้</h2>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← กลับไปดูบริการทั้งหมด
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
          <h2 className="text-2xl font-medium text-stone-900 mt-4">ไม่พบบริการที่ต้องการ</h2>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← กลับไปดูบริการทั้งหมด
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

  const basePrice = service.base_price
  const addOnsPrice = selectedAddOns.reduce((sum, id) => {
    const addOn = addOns.find((a: any) => a.id === id)
    return sum + (addOn?.price || 0)
  }, 0)
  const totalPrice = (basePrice + addOnsPrice) * quantity

  // Category display names
  const categoryNames = {
    massage: 'นวด',
    nail: 'ทำเล็บ',
    spa: 'สปา',
    facial: 'ทรีตเมนท์ใบหน้า',
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Link to="/services" className="inline-flex items-center text-stone-600 hover:text-amber-700 mb-6 font-medium transition">
          <ChevronLeft className="w-5 h-5" />
          กลับไปดูบริการ
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl h-80 overflow-hidden mb-6 border border-stone-200 bg-gray-100">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name_en}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      service.name_en
                    )}&background=f59e0b&color=fff&size=600`
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                  <IconComponent className="w-24 h-24 text-amber-600" />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-stone-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-light text-stone-900 mb-2 tracking-tight">{service.name_en}</h1>
                  <p className="text-lg text-stone-500 font-light">{service.name_th}</p>
                </div>
                {/* Rating section removed since we don't have review data yet */}
              </div>

              <div className="flex items-center gap-6 text-stone-600 mb-6">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {service.duration} นาที
                </span>
                <span className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-amber-700" />
                  {categoryNames[service.category]}
                </span>
              </div>

              <div className="prose max-w-none">
                {service.description_en && (
                  <>
                    <h3 className="text-lg font-medium mb-3 text-stone-900">Description</h3>
                    <p className="text-stone-700 font-light leading-relaxed">{service.description_en}</p>
                  </>
                )}

                {service.description_th && (
                  <>
                    <h3 className="text-lg font-medium mt-6 mb-3 text-stone-900">รายละเอียด</h3>
                    <p className="text-stone-700 font-light leading-relaxed">{service.description_th}</p>
                  </>
                )}

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

            {addOns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
                <h3 className="text-xl font-medium text-stone-900 mb-4">เสริมพิเศษ</h3>
                <div className="space-y-3">
                  {addOns.map((addOn: any) => (
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
              <h3 className="text-xl font-medium text-stone-900 mb-6">สรุปการจอง</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-3">จำนวน</label>
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
                  <span>บริการ</span>
                  <span>฿{basePrice.toLocaleString()}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>เสริมพิเศษ</span>
                    <span>฿{addOnsPrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>จำนวน</span>
                  <span>x{quantity}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-medium text-stone-900">รวมทั้งหมด</span>
                <span className="text-2xl font-semibold text-amber-700">฿{totalPrice.toLocaleString()}</span>
              </div>

              <Link
                to={`/booking?service=${slug}&addons=${selectedAddOns.join(',')}&qty=${quantity}`}
                className="block w-full bg-gradient-to-r from-amber-700 to-amber-800 text-white text-center py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 shadow-md"
              >
                จองบริการ
              </Link>

              {/* Show hotel discount if user is from hotel */}
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">สำหรับโรงแรม:</span> ราคาพิเศษ ฿{service.hotel_price.toLocaleString()}
                  <span className="text-green-700 font-medium ml-1">
                    (ประหยัด {Math.round(((basePrice - service.hotel_price) / basePrice) * 100)}%)
                  </span>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-stone-200 text-center">
                <p className="text-sm text-stone-500">มีคำถาม?</p>
                <button className="text-amber-700 font-medium text-sm hover:underline mt-1">
                  สอบถามเพิ่มเติม
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