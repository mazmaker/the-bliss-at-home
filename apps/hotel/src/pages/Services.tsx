import { useState } from 'react'
import { Search, Clock, Info, RefreshCw, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import BookingModal from '../components/BookingModal'

// Service interface matching database structure
interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string | null
  description_en?: string | null
  category: 'massage' | 'nail' | 'spa' | 'facial'
  duration: number
  duration_options?: number[] | null // Multiple duration options
  base_price: number
  hotel_price: number
  image_url?: string | null
  is_active: boolean | null
  sort_order?: number | null
  created_at: string | null
  updated_at: string | null
}

// Fetch services from database
const fetchServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch services: ${error.message}`)
  }

  return data || []
}

function Services() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'massage' | 'nail' | 'spa'>('all')
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  // Query services from database
  const { data: services = [], isLoading, error, refetch } = useQuery({
    queryKey: ['hotel-services'],
    queryFn: fetchServices,
  })

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchQuery === '' ||
      service.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.name_th?.includes(searchQuery)
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categoryLabels = {
    all: 'ทั้งหมด',
    massage: 'นวด',
    nail: 'เล็บ',
    spa: 'สปา',
  }

  // Helper function to format duration options display
  const formatDurationOptions = (service: Service) => {
    // Use duration_options if available and valid
    if (service.duration_options && Array.isArray(service.duration_options) && service.duration_options.length > 0) {
      // Sort durations and format as "60, 90, 120 นาที"
      const sortedDurations = [...service.duration_options].sort((a, b) => a - b)
      return `${sortedDurations.join(', ')} นาที`
    }

    // Fallback to single duration
    return `${service.duration} นาที`
  }

  // Function to open booking modal
  const handleBookService = (service: Service) => {
    setSelectedService(service)
    setIsBookingModalOpen(true)
  }

  // Function to close booking modal
  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false)
    setSelectedService(null)
  }


  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดบริการ...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-stone-900 font-medium mb-1">เกิดข้อผิดพลาด</p>
          <p className="text-stone-600 text-sm mb-4">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
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
              ราคาที่แสดงเป็นราคาพิเศษสำหรับโรงแรม พร้อมให้บริการลูกค้าของคุณ
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
        {filteredServices.map((service) => {
          return (
            <div key={service.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100 hover:shadow-xl transition">
              {/* Image */}
              <div className="relative h-48 bg-stone-200">
                <img
                  src={service.image_url || 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400'}
                  alt={service.name_th}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-stone-900 mb-1">{service.name_th}</h3>
                <p className="text-sm text-stone-500 mb-3">{service.name_en}</p>
                <p className="text-sm text-stone-600 mb-4 line-clamp-2">{service.description_th || service.description_en}</p>

                {/* Duration */}
                <div className="flex items-center gap-1 mb-4 text-sm text-stone-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatDurationOptions(service)}</span>
                </div>

                {/* Price */}
                <div className="bg-stone-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">ราคา</span>
                    <span className="text-lg font-bold text-amber-700">฿{service.hotel_price}</span>
                  </div>
                </div>

                {/* Book Button */}
                <button
                  onClick={() => handleBookService(service)}
                  className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
                >
                  จองบริการนี้
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && !isLoading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-2">ไม่พบบริการที่ค้นหา</p>
          <p className="text-gray-500 text-sm">ลองค้นหาด้วยคำอื่นหรือเปลี่ยนหมวดหมู่</p>
        </div>
      )}

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          service={selectedService}
        />
      )}
    </div>
  )
}

export default Services
