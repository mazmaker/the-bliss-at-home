import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Star,
  Clock,
  ChevronLeft,
  Plus,
  Minus,
  Heart,
  Sparkles,
  Search,
  Hand,
  Flower2,
  Palette,
  Loader2,
  AlertCircle,
} from 'lucide-react'

// Map category to icon
const categoryIcons: Record<string, React.ComponentType<{className?: string}>> = {
  massage: Sparkles,
  nail: Hand,
  spa: Flower2,
  facial: Palette,
}

interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category: 'massage' | 'nail' | 'spa' | 'facial'
  duration: number
  base_price: number
  hotel_price: number
  image_url?: string
  slug: string
  is_active: boolean
}

// Mock service data
const mockServices: Record<string, Service> = {
  'thai-massage-2hr': {
    id: '1',
    name_th: 'นวดไทยแบบดั้งเดิม 2 ชั่วโมง',
    name_en: 'Traditional Thai Massage 2 Hours',
    description_th: 'นวดไทยแบบดั้งเดิมด้วยเทคนิคการกดจุดและยืดเส้น ช่วยคลายกล้ามเนื้อ ผ่องคลายความเครียด และเพิ่มความยืดหยุ่นให้ร่างกาย',
    description_en: 'Traditional Thai massage using ancient techniques of acupressure and stretching. Helps relax muscles, relieve stress, and improve flexibility.',
    category: 'massage',
    duration: 120,
    base_price: 800,
    hotel_price: 650,
    image_url: null,
    slug: 'thai-massage-2hr',
    is_active: true,
  },
  'oil-massage-90min': {
    id: '2',
    name_th: 'นวดน้ำมันหอมระเหย 90 นาที',
    name_en: 'Aromatherapy Oil Massage 90 Minutes',
    description_th: 'นวดด้วยน้ำมันหอมระเหยจากธรรมชาติ ช่วยผ่อนคลายความเครียด เพิ่มความชุ่มชื้นให้ผิว และสร้างความรู้สึกสงบ',
    description_en: 'Massage with natural essential oils to relieve stress, moisturize skin, and create a sense of tranquility.',
    category: 'massage',
    duration: 90,
    base_price: 650,
    hotel_price: 520,
    image_url: null,
    slug: 'oil-massage-90min',
    is_active: true,
  },
  'classic-manicure': {
    id: '3',
    name_th: 'เพ้นท์เล็บคลาสสิค',
    name_en: 'Classic Manicure',
    description_th: 'บริการทำเล็บมือแบบคลาสสิค ตัดแต่งเล็บ ดูแลผิวหนังรอบเล็บ และทาสีเล็บตามต้องการ',
    description_en: 'Classic manicure service including nail trimming, cuticle care, and nail polish application.',
    category: 'nail',
    duration: 60,
    base_price: 300,
    hotel_price: 250,
    image_url: null,
    slug: 'classic-manicure',
    is_active: true,
  },
  'spa-facial-deluxe': {
    id: '4',
    name_th: 'ทรีตเมนท์ใบหน้าระดับพรีเมี่ยม',
    name_en: 'Deluxe Spa Facial',
    description_th: 'ทรีตเมนท์ใบหน้าแบบครบวงจร รวมการทำความสะอาดผิว มาส์กหน้า และบำรุงผิวด้วยผลิตภัณฑ์คุณภาพสูง',
    description_en: 'Complete facial treatment including deep cleansing, face mask, and skin nourishment with premium products.',
    category: 'facial',
    duration: 75,
    base_price: 950,
    hotel_price: 800,
    image_url: null,
    slug: 'spa-facial-deluxe',
    is_active: true,
  },
}

// Mock add-ons data
const mockAddOns: Record<string, any[]> = {
  massage: [
    { id: 1, name: 'Herbal Ball', price: 100, description: 'Traditional herbal compress' },
    { id: 2, name: 'Aromatherapy Oil', price: 150, description: 'Essential oil blend' },
    { id: 3, name: 'Extra 30 min', price: 200, description: 'Extend session by 30 minutes' },
  ],
  nail: [
    { id: 1, name: 'Nail Art', price: 100, description: 'Custom nail design' },
    { id: 2, name: 'Paraffin Treatment', price: 150, description: 'Paraffin wax treatment' },
  ],
  spa: [
    { id: 1, name: 'Face Mask', price: 200, description: 'Premium face mask treatment' },
    { id: 2, name: 'Body Scrub', price: 300, description: 'Exfoliating body treatment' },
  ],
  facial: [
    { id: 1, name: 'Gold Mask', price: 500, description: 'Luxury gold face mask' },
    { id: 2, name: 'LED Therapy', price: 300, description: 'LED light therapy' },
  ],
}

function ServiceDetails() {
  const { slug } = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAddOns, setSelectedAddOns] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    // Simulate loading from mock data
    const loadService = () => {
      if (!slug) {
        setError('ไม่พบ URL บริการ')
        setIsLoading(false)
        return
      }

      // Simulate API delay
      setTimeout(() => {
        const foundService = mockServices[slug]
        if (foundService) {
          setService(foundService)
          setError('')
        } else {
          setError('ไม่พบบริการที่ต้องการ')
        }
        setIsLoading(false)
      }, 500) // 500ms delay to simulate loading
    }

    loadService()
  }, [slug])

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

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-medium text-stone-900 mt-4">{error}</h2>
            </>
          ) : (
            <>
              <Search className="w-16 h-16 text-stone-400 mx-auto" />
              <h2 className="text-2xl font-medium text-stone-900 mt-4">ไม่พบบริการ</h2>
            </>
          )}
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← กลับไปดูบริการทั้งหมด
          </Link>
        </div>
      </div>
    )
  }

  const IconComponent = categoryIcons[service.category] || Sparkles
  const addOns = mockAddOns[service.category] || []

  const toggleAddOn = (id: number) => {
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

              <div className="space-y-3">
                <Link
                  to={`/booking?service=${slug}&addons=${selectedAddOns.join(',')}&qty=${quantity}`}
                  className="block w-full bg-gradient-to-r from-amber-700 to-amber-800 text-white text-center py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 shadow-md"
                >
                  จองบริการ
                </Link>
                <button className="w-full border-2 border-stone-300 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 hover:border-amber-500 transition flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4" />
                  บันทึกไว้ดูภายหลัง
                </button>
              </div>

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