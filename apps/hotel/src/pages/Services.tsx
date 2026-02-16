import { useState } from 'react'
import { Search, Clock, Star, Info } from 'lucide-react'

function Services() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'massage' | 'nail' | 'spa'>('all')

  const services = [
    {
      id: 'SVC001',
      name: 'Thai Massage (2 hours)',
      nameTh: 'นวดไทย (2 ชั่วโมง)',
      category: 'massage',
      duration: 120,
      regularPrice: 800,
      hotelPrice: 640,
      discount: 20,
      rating: 4.8,
      reviews: 234,
      image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400',
      description: 'นวดแผนไทยแท้โดยผู้เชี่ยวชาญ',
    },
    {
      id: 'SVC002',
      name: 'Oil Massage (2 hours)',
      nameTh: 'นวดน้ำมัน (2 ชั่วโมง)',
      category: 'massage',
      duration: 120,
      regularPrice: 1000,
      hotelPrice: 800,
      discount: 20,
      rating: 4.9,
      reviews: 189,
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
      description: 'นวดน้ำมันอโรเมติกาบำบัดคลายเครียด',
    },
    {
      id: 'SVC003',
      name: 'Gel Manicure',
      nameTh: 'เล็บเจล',
      category: 'nail',
      duration: 60,
      regularPrice: 450,
      hotelPrice: 360,
      discount: 20,
      rating: 4.7,
      reviews: 312,
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
      description: 'ทำเล็บเจลเกรดพรีเมียมพร้อมดีไซน์ทันสมัย',
    },
    {
      id: 'SVC004',
      name: 'Luxury Spa Package',
      nameTh: 'แพ็กเกจสปาหรู',
      category: 'spa',
      duration: 150,
      regularPrice: 2500,
      hotelPrice: 2000,
      discount: 20,
      rating: 5.0,
      reviews: 145,
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
      description: 'แพ็กเกจสปาครบวงจร นวด สครับ และทรีตเมนท์หน้า',
    },
    {
      id: 'SVC005',
      name: 'Foot Massage (1 hour)',
      nameTh: 'นวดเท้า (1 ชั่วโมง)',
      category: 'massage',
      duration: 60,
      regularPrice: 400,
      hotelPrice: 320,
      discount: 20,
      rating: 4.6,
      reviews: 456,
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400',
      description: 'นวดเท้าผ่อนคลาย กำจัดความเมื่อยล้า',
    },
    {
      id: 'SVC006',
      name: 'Facial Treatment',
      nameTh: 'ทรีตเมนท์หน้า',
      category: 'spa',
      duration: 90,
      regularPrice: 1200,
      hotelPrice: 960,
      discount: 20,
      rating: 4.8,
      reviews: 98,
      image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
      description: 'ทรีตเมนท์บำบัดผิวหน้าด้วยผลิตภัณฑ์ออร์แกนิค',
    },
  ]

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.nameTh.includes(searchQuery)
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categoryLabels = {
    all: 'ทั้งหมด',
    massage: 'นวดนวด',
    nail: 'เล็บ',
    spa: 'สปา',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">บริการทั้งหมด</h1>
        <p className="text-stone-500">All Services</p>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-amber-700 to-amber-800 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">ราคาพิเศษสำหรับโรงแรม</h3>
            <p className="text-sm opacity-90">
              โรงแรมของคุณได้รับส่วนลด 20% จากราคาปกติ สำหรับการจองทั้งหมด
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาบริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'massage', 'nail', 'spa'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  categoryFilter === category
                    ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredServices.length} บริการ
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100 hover:shadow-xl transition">
            {/* Image */}
            <div className="relative h-48 bg-stone-200">
              <img
                src={service.image}
                alt={service.nameTh}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                  ส่วนลด {service.discount}%
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-semibold text-stone-900 mb-1">{service.nameTh}</h3>
              <p className="text-sm text-stone-500 mb-3">{service.name}</p>
              <p className="text-sm text-stone-600 mb-4 line-clamp-2">{service.description}</p>

              {/* Duration & Rating */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-stone-600">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration} นาที</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="font-medium">{service.rating}</span>
                  <span className="text-stone-400">({service.reviews})</span>
                </div>
              </div>

              {/* Price */}
              <div className="bg-stone-50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">ราคาบริการ</span>
                  <span className="text-lg font-bold text-amber-700">฿{service.hotelPrice}</span>
                </div>
              </div>

              {/* Book Button */}
              <button className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
                จองบริการนี้
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Services
