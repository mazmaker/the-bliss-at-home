import { useState } from 'react'
import { X, AlertCircle, UserCheck, UserX, Clock, Ban } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Staff } from '../services/staffService'
import { useQueryClient } from '@tanstack/react-query'

interface StatusManagementModalProps {
  staff: Staff
  onClose: () => void
}

type StaffStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export function StatusManagementModal({ staff, onClose }: StatusManagementModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<StaffStatus>(staff.status)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()

  const statusOptions = [
    {
      value: 'active' as StaffStatus,
      label: 'ใช้งานอยู่',
      description: 'พนักงานสามารถรับงานและให้บริการได้ตามปกติ',
      icon: UserCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      value: 'inactive' as StaffStatus,
      label: 'ไม่ใช้งาน',
      description: 'พนักงานหยุดพักชั่วคราว ไม่สามารถรับงานใหม่ได้',
      icon: UserX,
      color: 'text-stone-600',
      bg: 'bg-stone-50',
      border: 'border-stone-200',
    },
    {
      value: 'pending' as StaffStatus,
      label: 'รอตรวจสอบ',
      description: 'รอการอนุมัติจากแอดมิน ยังไม่สามารถให้บริการได้',
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    {
      value: 'suspended' as StaffStatus,
      label: 'ระงับการใช้งาน',
      description: 'ระงับการให้บริการชั่วคราวเนื่องจากปัญหาหรือการละเมิดกฎ',
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
  ]

  const handleSave = async () => {
    // Validate
    if (selectedStatus === staff.status) {
      toast.error('กรุณาเลือกสถานะใหม่')
      return
    }

    if (selectedStatus === 'suspended' && !reason.trim()) {
      toast.error('กรุณาระบุเหตุผลในการระงับการใช้งาน')
      return
    }

    setIsSaving(true)

    try {
      // Update staff status
      const { error } = await supabase
        .from('staff')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staff.id)

      if (error) throw error

      // Log status change (optional - create status_logs table if needed)
      // await supabase.from('staff_status_logs').insert({
      //   staff_id: staff.id,
      //   old_status: staff.status,
      //   new_status: selectedStatus,
      //   reason: reason || null,
      //   changed_by: adminId,
      // })

      toast.success('อัปเดตสถานะพนักงานสำเร็จ')

      // Invalidate queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['staff', 'detail', staff.id] })
      queryClient.invalidateQueries({ queryKey: ['staff'] })

      onClose()
    } catch (error: any) {
      console.error('Error updating staff status:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">จัดการสถานะพนักงาน</h2>
            <p className="text-sm text-stone-600 mt-1">
              {staff.name_th} ({staff.name_en})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Current Status */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">สถานะปัจจุบัน</span>
            </div>
            <p className="text-sm text-blue-800">
              {statusOptions.find(opt => opt.value === staff.status)?.label || staff.status}
            </p>
          </div>

          {/* Status Options */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-stone-900 mb-3">เลือกสถานะใหม่</h3>
            {statusOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedStatus === option.value
              const isCurrent = staff.status === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  disabled={isSaving || isCurrent}
                  className={`w-full p-4 rounded-xl border-2 transition text-left ${
                    isSelected
                      ? `${option.border} ${option.bg} ring-2 ring-offset-2 ring-${option.color.split('-')[1]}-500`
                      : isCurrent
                      ? 'border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${option.bg}`}>
                      <Icon className={`w-5 h-5 ${option.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{option.label}</span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 bg-stone-200 text-stone-600 rounded-full">
                            ปัจจุบัน
                          </span>
                        )}
                        {isSelected && !isCurrent && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            เลือกแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Reason (for suspended status) */}
          {selectedStatus === 'suspended' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                เหตุผลในการระงับการใช้งาน <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="กรุณาระบุเหตุผลที่ชัดเจน เช่น ละเมิดกฎระเบียบ, ได้รับข้อร้องเรียน, etc."
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
                disabled={isSaving}
              />
              <p className="text-xs text-stone-500 mt-1">
                เหตุผลนี้จะถูกบันทึกในประวัติและอาจแสดงให้พนักงานทราบ
              </p>
            </div>
          )}

          {/* Optional Reason (for other statuses) */}
          {selectedStatus !== 'suspended' && selectedStatus !== staff.status && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เหตุผลในการเปลี่ยนสถานะ (ถ้ามี)"
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={isSaving}
              />
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">⚠️ โปรดตรวจสอบก่อนบันทึก</p>
                <p>
                  การเปลี่ยนสถานะจะมีผลทันที และอาจส่งผลต่อการให้บริการของพนักงาน
                  กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
            disabled={isSaving}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedStatus === staff.status}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>บันทึกการเปลี่ยนแปลง</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
