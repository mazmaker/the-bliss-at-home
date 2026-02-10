import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ServiceForm } from '../components/ServiceForm'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Star,
  Clock,
  Sparkles,
  Hand,
  Flower2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
  Eye,
} from 'lucide-react'

interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category: 'massage' | 'nail' | 'spa'
  duration: number
  duration_options?: number[] // New multiple duration options
  base_price: number
  hotel_price: number
  staff_commission_rate: number
  image_url?: string
  slug?: string
  is_active: boolean
  sort_order?: number
  created_at: string
  updated_at: string
}

const categories = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'massage', name: 'นวด', icon: Sparkles },
  { id: 'nail', name: 'เล็บ', icon: Hand },
  { id: 'spa', name: 'สปา', icon: Flower2 },
]

function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [softDeleteConfirm, setSoftDeleteConfirm] = useState<{id: string, hasBookings: boolean} | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch services from Supabase
  const fetchServices = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true })

      if (error) throw error

      setServices(data || [])
    } catch (err) {
      console.error('Error fetching services:', err)
      setError('ไม่สามารถโหลดข้อมูลบริการได้')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleAdd = () => {
    setEditingService(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ Checking service for deletion:', id)

      // Check if service has any bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', id)
        .limit(1)

      if (bookingError) {
        console.error('❌ Error checking bookings:', bookingError)
        throw new Error('ไม่สามารถตรวจสอบการจองได้')
      }

      const hasBookings = bookings && bookings.length > 0

      if (hasBookings) {
        console.log('⚠️ Service has bookings, requesting confirmation for soft delete')
        // Show confirmation popup for soft delete
        setSoftDeleteConfirm({ id, hasBookings: true })
        setDeleteConfirmId(null) // Hide normal delete confirmation
      } else {
        console.log('✅ No bookings found, proceeding with hard delete')
        // Hard delete: no bookings exist
        const { error: deleteError } = await supabase
          .from('services')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error('❌ Hard delete error:', deleteError)
          throw deleteError
        }

        console.log('✅ Service deleted successfully')
        setSuccessMessage('ลบบริการเรียบร้อยแล้ว')
        fetchServices()
        setDeleteConfirmId(null)
      }
    } catch (err) {
      console.error('💥 Error handling service deletion:', err)
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถลบบริการได้'
      setError(`การดำเนินการไม่สำเร็จ: ${errorMsg}`)
      setDeleteConfirmId(null)
    }
  }

  const handleConfirmSoftDelete = async () => {
    if (!softDeleteConfirm) return

    try {
      console.log('✅ User confirmed soft delete, proceeding...')

      const { error: updateError } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', softDeleteConfirm.id)

      if (updateError) {
        console.error('❌ Soft delete error:', updateError)
        throw updateError
      }

      console.log('✅ Service deactivated successfully')
      setSuccessMessage('บริการถูกปิดใช้งานแล้ว (มีการจองที่เกี่ยวข้อง)')
      fetchServices()
    } catch (err) {
      console.error('💥 Error in soft delete:', err)
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถปิดใช้งานบริการได้'
      setError(`การปิดใช้งานไม่สำเร็จ: ${errorMsg}`)
    } finally {
      setSoftDeleteConfirm(null)
    }
  }

  const handleFormSuccess = () => {
    setSuccessMessage(editingService ? 'แก้ไขบริการเรียบร้อยแล้ว' : 'เพิ่มบริการใหม่เรียบร้อยแล้ว')
    fetchServices()
  }

  const toggleServiceStatus = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error

      setSuccessMessage(`${service.is_active ? 'ปิด' : 'เปิด'}ใช้งานบริการเรียบร้อยแล้ว`)
      fetchServices()
    } catch (err) {
      console.error('Error toggling service status:', err)
      setError('ไม่สามารถเปลี่ยนสถานะบริการได้')
    }
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

  const handlePreview = (service: Service) => {
    // Generate slug from service name if not available
    let slug = service.slug

    if (!slug) {
      // Generate slug from English name
      slug = service.name_en
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Show warning if no slug exists in database
      setSuccessMessage(`⚠️ บริการนี้ยังไม่มี URL slug ในฐานข้อมูล กำลังใช้ slug ชั่วคราว: ${slug}`)
    }

    if (!slug) {
      setError('ไม่สามารถสร้าง URL สำหรับพรีวิวได้')
      return
    }

    // Open Customer app service page in new tab
    const previewUrl = `http://localhost:3002/services/${slug}`
    window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const filteredServices = services.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      service.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.name_th.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการบริการ</h1>
          <p className="text-stone-500">Service Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchServices}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
          >
            <Plus className="w-5 h-5" />
            เพิ่มบริการใหม่
          </button>
        </div>
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
            <div className="relative h-40 bg-gray-100">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name_en}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      service.name_en
                    )}&background=f59e0b&color=fff&size=200`
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                  {service.category === 'massage' && <Sparkles className="w-16 h-16 text-amber-600" />}
                  {service.category === 'nail' && <Hand className="w-16 h-16 text-amber-600" />}
                  {service.category === 'spa' && <Flower2 className="w-16 h-16 text-amber-600" />}
                </div>
              )}
              <div
                className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                  service.is_active
                    ? 'bg-green-500 text-white'
                    : 'bg-stone-500 text-white'
                }`}
              >
                {service.is_active ? 'ใช้งาน' : 'ระงับ'}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-stone-900 mb-1">{service.name_en}</h3>
              <p className="text-sm text-stone-500 mb-3">{service.name_th}</p>

              {/* Category Badge */}
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium mb-3">
                {categories.find(c => c.id === service.category)?.name || service.category}
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                <Clock className="w-4 h-4" />
                <span>{formatDurationOptions(service)}</span>
              </div>

              {/* Prices */}
              <div className="space-y-2 mb-4 p-3 bg-stone-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ราคาปกติ:</span>
                  <span className="font-semibold text-stone-900">฿{service.base_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ราคาโรงแรม:</span>
                  <span className="font-semibold text-amber-700">฿{service.hotel_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>ส่วนลด:</span>
                  <span className="font-medium">
                    {Math.round(((service.base_price - service.hotel_price) / service.base_price) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-blue-600">
                  <span>คอมมิชชั่น Staff:</span>
                  <span className="font-medium">{service.staff_commission_rate}%</span>
                </div>
                <div className="flex justify-between text-xs text-blue-700">
                  <span>รายได้ Staff:</span>
                  <span className="font-medium">
                    ฿{Math.round((service.base_price * (service.staff_commission_rate / 100)) * 100) / 100}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleServiceStatus(service)}
                  className={`flex items-center justify-center px-3 py-2 text-sm rounded-lg transition ${
                    service.is_active
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {service.is_active ? 'ระงับ' : 'เปิดใช้'}
                </button>
                <button
                  onClick={() => handlePreview(service)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition"
                  title="พรีวิวหน้าบริการ"
                >
                  <Eye className="w-4 h-4" />
                  พรีวิว
                </button>
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition"
                >
                  <Edit className="w-4 h-4" />
                  แก้ไข
                </button>
                <button
                  onClick={() => setDeleteConfirmId(service.id)}
                  className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === service.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">ยืนยันการลบ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      ลบ
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-2">
            {searchQuery || selectedCategory !== 'all'
              ? 'ไม่พบบริการที่ค้นหา'
              : 'ยังไม่มีบริการ'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {searchQuery || selectedCategory !== 'all'
              ? 'ลองค้นหาด้วยคำอื่นหรือเปลี่ยนหมวดหมู่'
              : 'เริ่มต้นด้วยการเพิ่มบริการใหม่'}
          </p>
          {(!searchQuery && selectedCategory === 'all') && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
            >
              <Plus className="w-5 h-5" />
              เพิ่มบริการแรก
            </button>
          )}
        </div>
      )}

      {/* Soft Delete Confirmation Modal */}
      {softDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    ไม่สามารถลบได้
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <div className="mb-4">
                  <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-800">มีการจองที่เกี่ยวข้อง</p>
                      <p className="text-sm text-orange-700 mt-1">
                        บริการนี้มีการจองที่ยังไม่เสร็จสิ้น ไม่สามารถลบออกจากระบบได้
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <p>คุณสามารถเลือกทำอย่างใดอย่างหนึ่ง:</p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span><strong>ปิดใช้งาน:</strong> บริการจะหยุดรับการจองใหม่ แต่การจองเก่ายังทำงานต่อได้</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span><strong>ยกเลิก:</strong> กลับไปแก้ไขหรือดำเนินการอื่น</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                <button
                  onClick={() => setSoftDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmSoftDelete}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition font-medium"
                >
                  ปิดใช้งานบริการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      <ServiceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingService(undefined)
        }}
        onSuccess={handleFormSuccess}
        editData={editingService}
      />
    </div>
  )
}

export default Services