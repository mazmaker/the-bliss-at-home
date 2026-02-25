import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PromotionForm } from '../components/PromotionForm'
import { PromotionPreview } from '../components/PromotionPreview'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Clock,
  Percent,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Tag,
  Users,
  Gift,
  TrendingUp,
  FileText,
  Play,
  Pause,
  Copy,
  Eye,
} from 'lucide-react'

interface Promotion {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'buy_x_get_y'
  discount_value: number
  min_order_amount?: number
  max_discount?: number
  usage_limit?: number
  usage_limit_per_user?: number
  usage_count: number
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'expired' | 'disabled'
  applies_to: 'all_services' | 'specific_services' | 'categories'
  target_services?: string[]
  target_categories?: string[]
  auto_generate_code: boolean
  code_prefix: string
  code_length: number
  image_url?: string
  created_at: string
  updated_at: string
}

const promotionTypes = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'percentage', name: 'ลดเปอร์เซ็นต์', icon: Percent },
  { id: 'fixed_amount', name: 'ลดจำนวนคงที่', icon: Tag },
  { id: 'buy_x_get_y', name: 'แถม', icon: Gift },
]

const statusFilters = [
  { id: 'all', name: 'ทั้งหมด', icon: Filter },
  { id: 'draft', name: 'ร่าง', icon: FileText },
  { id: 'active', name: 'ใช้งานอยู่', icon: CheckCircle },
  { id: 'disabled', name: 'ระงับการใช้งาน', icon: Pause },
  { id: 'expired', name: 'หมดอายุ', icon: Clock },
]

function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)

  // Fetch promotions from Supabase
  const fetchPromotions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPromotions(data || [])
    } catch (err) {
      console.error('Error fetching promotions:', err)
      setError('ไม่สามารถโหลดข้อมูลโปรโมชั่นได้')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleAdd = () => {
    setEditingPromotion(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('ลบโปรโมชั่นเรียบร้อยแล้ว')
      fetchPromotions()
    } catch (err) {
      console.error('Error deleting promotion:', err)
      setError('ไม่สามารถลบโปรโมชั่นได้')
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleFormSuccess = () => {
    setSuccessMessage(editingPromotion ? 'แก้ไขโปรโมชั่นเรียบร้อยแล้ว' : 'เพิ่มโปรโมชั่นใหม่เรียบร้อยแล้ว')
    fetchPromotions()
  }

  const togglePromotionStatus = async (promotion: Promotion) => {
    try {
      let newStatus: string = promotion.status

      // Toggle logic based on current status
      if (promotion.status === 'active' || promotion.status === 'draft') {
        newStatus = 'disabled'
      } else if (promotion.status === 'disabled') {
        // Check if it should be active or expired
        const now = new Date()
        const endDate = new Date(promotion.end_date)
        newStatus = now <= endDate ? 'active' : 'expired'
      }

      const { error } = await supabase
        .from('promotions')
        .update({ status: newStatus })
        .eq('id', promotion.id)

      if (error) throw error

      setSuccessMessage(`${newStatus === 'disabled' ? 'ระงับ' : 'เปิดใช้'}โปรโมชั่นเรียบร้อยแล้ว`)
      fetchPromotions()
    } catch (err) {
      console.error('Error toggling promotion status:', err)
      setError('ไม่สามารถเปลี่ยนสถานะโปรโมชั่นได้')
    }
  }

  const activatePromotion = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ status: 'active' })
        .eq('id', promotion.id)

      if (error) throw error

      setSuccessMessage('เปิดใช้โปรโมชั่นเรียบร้อยแล้ว')
      fetchPromotions()
    } catch (err) {
      console.error('Error activating promotion:', err)
      setError('ไม่สามารถเปิดใช้โปรโมชั่นได้')
    }
  }

  const getPromotionStatus = (promotion: Promotion) => {
    // Check if promotion has expired
    const now = new Date()
    const endDate = new Date(promotion.end_date)

    if (now > endDate && promotion.status !== 'expired') {
      // Auto-update expired promotions
      updatePromotionStatus(promotion.id, 'expired')
      return 'expired'
    }

    return promotion.status
  }

  const updatePromotionStatus = async (promotionId: string, status: string) => {
    try {
      await supabase
        .from('promotions')
        .update({ status })
        .eq('id', promotionId)
    } catch (err) {
      console.error('Error updating promotion status:', err)
    }
  }

  const filteredPromotions = promotions.filter((promotion) => {
    const matchesType = selectedType === 'all' || promotion.discount_type === selectedType

    const status = getPromotionStatus(promotion)
    const matchesStatus = selectedStatus === 'all' || status === selectedStatus

    const matchesSearch =
      searchQuery === '' ||
      promotion.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promotion.name_th.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promotion.code.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesType && matchesStatus && matchesSearch
  })

  const formatDiscount = (promotion: Promotion) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}%`
      case 'fixed_amount':
        return `฿${promotion.discount_value.toLocaleString()}`
      case 'buy_x_get_y':
        return `แถม ${promotion.discount_value} ชิ้น`
      default:
        return promotion.discount_value.toString()
    }
  }

  const getStatusColor = (promotion: Promotion) => {
    const status = getPromotionStatus(promotion)
    switch (status) {
      case 'draft':
        return 'bg-gray-500 text-white'
      case 'active':
        return 'bg-green-500 text-white'
      case 'disabled':
        return 'bg-orange-500 text-white'
      case 'expired':
        return 'bg-red-500 text-white'
      default:
        return 'bg-stone-500 text-white'
    }
  }

  const isExpired = (endDate: string) => {
    return new Date() > new Date(endDate)
  }

  const getStatusText = (promotion: Promotion) => {
    const status = getPromotionStatus(promotion)
    switch (status) {
      case 'draft':
        return 'ร่าง'
      case 'active':
        return 'ใช้งานอยู่'
      case 'disabled':
        return 'ระงับ'
      case 'expired':
        return 'หมดอายุ'
      default:
        return 'ไม่ทราบ'
    }
  }

  const getStatusActions = (promotion: Promotion) => {
    const status = getPromotionStatus(promotion)
    const actions = []

    switch (status) {
      case 'draft':
        actions.push({
          label: 'เปิดใช้',
          onClick: () => activatePromotion(promotion),
          className: 'bg-green-100 text-green-700 hover:bg-green-200',
          icon: Play
        })
        break
      case 'active':
        actions.push({
          label: 'ระงับ',
          onClick: () => togglePromotionStatus(promotion),
          className: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
          icon: Pause
        })
        break
      case 'disabled':
        actions.push({
          label: 'เปิดใช้',
          onClick: () => togglePromotionStatus(promotion),
          className: 'bg-green-100 text-green-700 hover:bg-green-200',
          icon: Play
        })
        break
      case 'expired':
        // No actions for expired promotions
        break
    }

    return actions
  }



  const openPreviewModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setPreviewModalOpen(true)
  }

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
          <h1 className="text-2xl font-bold text-stone-900">จัดการโปรโมชั่น</h1>
          <p className="text-stone-500">Promotions Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPromotions}
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
            เพิ่มโปรโมชั่นใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาโปรโมชั่น (ชื่อ, รหัส)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Type Filters */}
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">ประเภทส่วนลด:</p>
            <div className="flex flex-wrap gap-2">
              {promotionTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                      selectedType === type.id
                        ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{type.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">สถานะ:</p>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => {
                const Icon = status.icon
                return (
                  <button
                    key={status.id}
                    onClick={() => setSelectedStatus(status.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                      selectedStatus === status.id
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{status.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredPromotions.length} โปรโมชั่น
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPromotions.map((promotion) => (
          <div
            key={promotion.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100 hover:shadow-xl transition"
          >
            {/* Image Section */}
            {promotion.image_url && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={promotion.image_url}
                  alt={promotion.name_en}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div
                  className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion)}`}
                >
                  {getStatusText(promotion)}
                </div>
              </div>
            )}

            {/* Header */}
            <div className={`relative p-4 ${promotion.image_url ? 'bg-white' : 'bg-gradient-to-r from-amber-100 to-amber-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900 mb-1">{promotion.name_en}</h3>
                  <p className="text-sm text-stone-600">{promotion.name_th}</p>
                </div>
                {!promotion.image_url && (
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion)}`}
                  >
                    {getStatusText(promotion)}
                  </div>
                )}
              </div>

              {/* Promotion Code */}
              <div className="mt-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-amber-200">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span className="font-mono font-bold text-amber-700">{promotion.code}</span>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(promotion.code)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded-lg hover:bg-amber-200 transition"
                  title="คัดลอกรหัสโปรโมชั่น"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Discount Info */}
              <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-stone-600">ส่วนลด:</span>
                  <span className="text-lg font-bold text-green-700">{formatDiscount(promotion)}</span>
                </div>

                {promotion.min_order_amount && (
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>ยอดขั้นต่ำ:</span>
                    <span>฿{promotion.min_order_amount.toLocaleString()}</span>
                  </div>
                )}

                {promotion.max_discount && promotion.discount_type === 'percentage' && (
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>ลดสูงสุด:</span>
                    <span>฿{promotion.max_discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="mb-4 p-3 bg-stone-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-stone-600">การใช้งาน:</span>
                  </div>
                  <span className="text-sm font-medium">
                    {promotion.usage_count}{promotion.usage_limit ? `/${promotion.usage_limit}` : ''}
                  </span>
                </div>

                {promotion.usage_limit && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((promotion.usage_count / promotion.usage_limit) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="mb-4 space-y-2 text-xs text-stone-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>เริ่ม:</span>
                  </div>
                  <span>{new Date(promotion.start_date).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>สิ้นสุด:</span>
                  </div>
                  <span className={isExpired(promotion.end_date) ? 'text-red-600 font-medium' : ''}>
                    {new Date(promotion.end_date).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>

              {/* Description */}
              {promotion.description_th && (
                <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">{promotion.description_th}</p>
                </div>
              )}

              {/* Professional Action Buttons */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {/* Status Actions */}
                  {getStatusActions(promotion).map((action, index) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition ${action.className}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{action.label}</span>
                      </button>
                    )
                  })}

                  <button
                    onClick={() => openPreviewModal(promotion)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition"
                  >
                    <Eye className="w-3 h-3" />
                    <span>พรีวิว</span>
                  </button>

                  <button
                    onClick={() => handleEdit(promotion)}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition"
                  >
                    <Edit className="w-3 h-3" />
                    <span>แก้ไข</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(promotion.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === promotion.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">ยืนยันการลบ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(promotion.id)}
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
      {filteredPromotions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <TrendingUp className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-2">
            {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'ไม่พบโปรโมชั่นที่ค้นหา'
              : 'ยังไม่มีโปรโมชั่น'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'ลองค้นหาด้วยคำอื่นหรือเปลี่ยนตัวกรอง'
              : 'เริ่มต้นด้วยการเพิ่มโปรโมชั่นใหม่'}
          </p>
          {(!searchQuery && selectedType === 'all' && selectedStatus === 'all') && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
            >
              <Plus className="w-5 h-5" />
              เพิ่มโปรโมชั่นแรก
            </button>
          )}
        </div>
      )}

      {/* Promotion Form Modal */}
      <PromotionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingPromotion(undefined)
        }}
        onSuccess={handleFormSuccess}
        editData={editingPromotion}
      />



      {/* Promotion Preview Modal */}
      <PromotionPreview
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false)
          setSelectedPromotion(null)
        }}
        promotion={selectedPromotion}
      />
    </div>
  )
}

export default Promotions