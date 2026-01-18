import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Star,
  Clock,
  Image as ImageIcon,
  Sparkles,
  Hand,
  Flower2,
} from 'lucide-react'

const categories = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

const services = [
  {
    id: 1,
    name: 'Thai Massage (2 hours)',
    nameTh: 'นวดไทย 2 ชั่วโมง',
    category: 'massage',
    price: 800,
    hotelPrice: 640,
    duration: 120,
    rating: 4.8,
    reviews: 120,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80',
    status: 'active',
  },
  {
    id: 2,
    name: 'Oil Massage (2 hours)',
    nameTh: 'นวดน้ำมัน 2 ชั่วโมง',
    category: 'massage',
    price: 1000,
    hotelPrice: 800,
    duration: 120,
    rating: 4.9,
    reviews: 85,
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80',
    status: 'active',
  },
  {
    id: 3,
    name: 'Gel Manicure',
    nameTh: 'เจลนาิเคียร์',
    category: 'nail',
    price: 450,
    hotelPrice: 360,
    duration: 60,
    rating: 4.7,
    reviews: 90,
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80',
    status: 'active',
  },
  {
    id: 4,
    name: 'Luxury Spa Package',
    nameTh: 'แพ็คเกจสปา',
    category: 'spa',
    price: 2500,
    hotelPrice: 2000,
    duration: 150,
    rating: 5.0,
    reviews: 25,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200&q=80',
    status: 'active',
  },
  {
    id: 5,
    name: 'Foot Massage (1 hour)',
    nameTh: 'นวดเท้า 1 ชั่วโมง',
    category: 'massage',
    price: 400,
    hotelPrice: 320,
    duration: 60,
    rating: 4.7,
    reviews: 200,
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=200&q=80',
    status: 'active',
  },
  {
    id: 6,
    name: 'Facial Treatment',
    nameTh: 'ทรีตเมนท์หน้า',
    category: 'spa',
    price: 1200,
    hotelPrice: 960,
    duration: 90,
    rating: 4.8,
    reviews: 60,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&q=80',
    status: 'inactive',
  },
]

function Services() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.nameTh.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการบริการ</h1>
          <p className="text-stone-500">Service Management</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
          <Plus className="w-5 h-5" />
          เพิ่มบริการใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
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

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </button>
              )
            })}
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
          <div
            key={service.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100 hover:shadow-xl transition"
          >
            {/* Image */}
            <div className="relative h-40">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                  service.status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-stone-500 text-white'
                }`}
              >
                {service.status === 'active' ? 'ใช้งาน' : 'ระงับ'}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-stone-900 mb-1">{service.name}</h3>
              <p className="text-sm text-stone-500 mb-3">{service.nameTh}</p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">{service.rating}</span>
                <span className="text-xs text-stone-400">({service.reviews} รีวิว)</span>
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                <Clock className="w-4 h-4" />
                <span>{service.duration} นาที</span>
              </div>

              {/* Prices */}
              <div className="space-y-2 mb-4 p-3 bg-stone-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ราคาปกติ:</span>
                  <span className="font-semibold text-stone-900">฿{service.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ราคาโรงแรม:</span>
                  <span className="font-semibold text-amber-700">฿{service.hotelPrice}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>ส่วนลด:</span>
                  <span className="font-medium">
                    {Math.round(((service.price - service.hotelPrice) / service.price) * 100)}%
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition">
                  <Edit className="w-4 h-4" />
                  แก้ไข
                </button>
                <button className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Services
