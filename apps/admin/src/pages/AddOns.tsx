import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AddOnForm, type ServiceOption } from '../components/AddOnForm'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
  PackagePlus,
} from 'lucide-react'

interface ServiceAddon {
  id: string
  service_id?: string | null
  service_ids?: string[] | null
  applies_to_all?: boolean
  name_th: string
  name_en: string
  name_cn?: string | null
  description_th?: string | null
  description_en?: string | null
  description_cn?: string | null
  price: number
  icon?: string | null
  image_url?: string | null
  is_active: boolean | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

function AddOns() {
  const [addons, setAddons] = useState<ServiceAddon[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedService, setSelectedService] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | undefined>()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [softDeleteConfirm, setSoftDeleteConfirm] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Human-readable "linked services" label for an add-on (multi-service / applies-to-all)
  const linkedServicesLabel = (addon: ServiceAddon): string => {
    if (addon.applies_to_all) return 'ทุกบริการ'
    const ids = addon.service_ids || []
    if (ids.length === 0) return 'ไม่ผูกบริการ'
    const names = ids
      .map((id) => services.find((sv) => sv.id === id)?.name_th)
      .filter(Boolean) as string[]
    if (names.length === 0) return `${ids.length} บริการ`
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
  }

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name_th, name_en')
      .order('sort_order', { ascending: true })
      .order('name_en', { ascending: true })
    if (error) {
      console.error('Error fetching services:', error)
      return
    }
    setServices((data as ServiceOption[]) || [])
  }

  const fetchAddons = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_addons')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true })
      if (error) throw error
      setAddons((data as ServiceAddon[]) || [])
    } catch (err) {
      console.error('Error fetching add-ons:', err)
      setError('ไม่สามารถโหลดข้อมูลบริการเสริมได้')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
    fetchAddons()
  }, [])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleAdd = () => {
    setEditingAddon(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (addon: ServiceAddon) => {
    setEditingAddon(addon)
    setIsFormOpen(true)
  }

  // Two-tier delete: soft-delete (is_active=false) if referenced by any booking; hard-delete otherwise.
  // Guards against the booking_addons.addon_id ON DELETE CASCADE wiping historical booking add-ons.
  const handleDelete = async (id: string) => {
    try {
      const { data: refs, error: refErr } = await supabase
        .from('booking_addons')
        .select('id')
        .eq('addon_id', id)
        .limit(1)

      if (refErr) {
        console.error('Error checking booking_addons:', refErr)
        throw new Error('ไม่สามารถตรวจสอบการจองที่เกี่ยวข้องได้')
      }

      const hasBookings = refs && refs.length > 0

      if (hasBookings) {
        setSoftDeleteConfirm(id)
        setDeleteConfirmId(null)
      } else {
        const { error: deleteError } = await supabase
          .from('service_addons')
          .delete()
          .eq('id', id)
        if (deleteError) throw deleteError
        setSuccessMessage('ลบบริการเสริมเรียบร้อยแล้ว')
        fetchAddons()
        setDeleteConfirmId(null)
      }
    } catch (err) {
      console.error('Error deleting add-on:', err)
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถลบบริการเสริมได้'
      setError(`การดำเนินการไม่สำเร็จ: ${errorMsg}`)
      setDeleteConfirmId(null)
    }
  }

  const handleConfirmSoftDelete = async () => {
    if (!softDeleteConfirm) return
    try {
      const { error: updateError } = await supabase
        .from('service_addons')
        .update({ is_active: false })
        .eq('id', softDeleteConfirm)
      if (updateError) throw updateError
      setSuccessMessage('บริการเสริมถูกปิดใช้งานแล้ว (มีการจองที่เกี่ยวข้อง)')
      fetchAddons()
    } catch (err) {
      console.error('Error in soft delete:', err)
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถปิดใช้งานบริการเสริมได้'
      setError(`การปิดใช้งานไม่สำเร็จ: ${errorMsg}`)
    } finally {
      setSoftDeleteConfirm(null)
    }
  }

  const toggleStatus = async (addon: ServiceAddon) => {
    try {
      const { error } = await supabase
        .from('service_addons')
        .update({ is_active: !addon.is_active })
        .eq('id', addon.id)
      if (error) throw error
      setSuccessMessage(`${addon.is_active ? 'ปิด' : 'เปิด'}ใช้งานบริการเสริมเรียบร้อยแล้ว`)
      fetchAddons()
    } catch (err) {
      console.error('Error toggling add-on status:', err)
      setError('ไม่สามารถเปลี่ยนสถานะบริการเสริมได้')
    }
  }

  const handleFormSuccess = () => {
    setSuccessMessage(editingAddon ? 'แก้ไขบริการเสริมเรียบร้อยแล้ว' : 'เพิ่มบริการเสริมใหม่เรียบร้อยแล้ว')
    fetchAddons()
  }

  const filteredAddons = addons.filter((a) => {
    const matchesService =
      selectedService === 'all' ||
      a.applies_to_all === true ||
      (a.service_ids || []).includes(selectedService)
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      q === '' ||
      a.name_en.toLowerCase().includes(q) ||
      a.name_th.toLowerCase().includes(q)
    return matchesService && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-bliss-600 animate-spin mx-auto mb-2" />
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
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bliss-900">บริการเสริม (Add-on)</h1>
          <p className="text-bliss-500">Service Add-ons Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAddons}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-bliss-200 text-bliss-700 rounded-xl font-medium hover:bg-bliss-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium hover:from-bliss-800 hover:to-bliss-900 transition"
          >
            <Plus className="w-5 h-5" />
            เพิ่มบริการเสริม
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-bliss-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
            <input
              type="text"
              placeholder="ค้นหาบริการเสริม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:bg-white transition"
            />
          </div>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-4 py-2 bg-bliss-100 border-0 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:bg-white transition min-w-[200px]"
          >
            <option value="all">ทุกบริการ</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_th}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-bliss-500">พบ {filteredAddons.length} บริการเสริม</div>

      {/* Add-ons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAddons.map((addon) => (
          <div
            key={addon.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-bliss-100 hover:shadow-xl transition"
          >
            {/* Image / icon */}
            <div className="relative h-40 bg-gray-100">
              {addon.image_url ? (
                <img
                  src={addon.image_url}
                  alt={addon.name_en}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bliss-100 to-bliss-200">
                  {addon.icon ? (
                    <span className="text-5xl">{addon.icon}</span>
                  ) : (
                    <PackagePlus className="w-14 h-14 text-bliss-600" />
                  )}
                </div>
              )}
              <div
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-semibold shadow-md ${
                  addon.is_active ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'
                }`}
              >
                {addon.is_active ? 'ใช้งาน' : 'ระงับ'}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-bliss-900 mb-1">{addon.name_th}</h3>
              <p className="text-sm text-bliss-500 mb-2">{addon.name_en}</p>

              <div className="inline-flex items-center gap-1 px-2 py-1 bg-bliss-100 text-bliss-700 rounded-md text-xs font-medium mb-3">
                <Package className="w-3 h-3" />
                {linkedServicesLabel(addon)}
              </div>

              {addon.description_th && (
                <p className="text-xs text-bliss-500 mb-3 line-clamp-2">{addon.description_th}</p>
              )}

              <div className="flex items-center justify-between mb-4 p-3 bg-bliss-50 rounded-xl">
                <span className="text-sm text-bliss-600">ราคา</span>
                <span className="font-semibold text-bliss-700">
                  +฿{Number(addon.price).toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleStatus(addon)}
                  className={`flex items-center justify-center px-3 py-2 text-sm rounded-lg transition ${
                    addon.is_active
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {addon.is_active ? 'ระงับ' : 'เปิดใช้'}
                </button>
                <button
                  onClick={() => handleEdit(addon)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-bliss-100 text-bliss-700 text-sm rounded-lg hover:bg-bliss-200 transition"
                >
                  <Edit className="w-4 h-4" />
                  แก้ไข
                </button>
                <button
                  onClick={() => setDeleteConfirmId(addon.id)}
                  className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === addon.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-2">ยืนยันการลบ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(addon.id)}
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
      {filteredAddons.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <PackagePlus className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-2">
            {searchQuery || selectedService !== 'all' ? 'ไม่พบบริการเสริมที่ค้นหา' : 'ยังไม่มีบริการเสริม'}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {searchQuery || selectedService !== 'all'
              ? 'ลองค้นหาด้วยคำอื่นหรือเปลี่ยนบริการ'
              : 'เริ่มต้นด้วยการเพิ่มบริการเสริมใหม่'}
          </p>
          {!searchQuery && selectedService === 'all' && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl font-medium hover:from-bliss-800 hover:to-bliss-900 transition"
            >
              <Plus className="w-5 h-5" />
              เพิ่มบริการเสริมแรก
            </button>
          )}
        </div>
      )}

      {/* Soft Delete Confirmation Modal */}
      {softDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  ไม่สามารถลบได้
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-orange-800">มีการจองที่เกี่ยวข้อง</p>
                    <p className="text-sm text-orange-700 mt-1">
                      บริการเสริมนี้ถูกใช้ในการจองแล้ว ลบออกไม่ได้เพราะจะทำให้ประวัติการจอง/ใบเสร็จเสียหาย
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  แนะนำให้ <strong>ปิดใช้งาน</strong> แทน — บริการเสริมจะหยุดแสดงให้ลูกค้าใหม่ แต่การจองเก่ายังทำงานต่อได้
                </p>
              </div>
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
                  ปิดใช้งานบริการเสริม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Form Modal */}
      <AddOnForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingAddon(undefined)
        }}
        onSuccess={handleFormSuccess}
        editData={editingAddon as any}
        services={services}
      />
    </div>
  )
}

export default AddOns
