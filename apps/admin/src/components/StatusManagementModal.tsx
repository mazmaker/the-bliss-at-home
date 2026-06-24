import { useState } from 'react'
import { X, AlertCircle, UserCheck, UserX, Clock, Ban, UserCog } from 'lucide-react'
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
      color: 'text-bliss-600',
      bg: 'bg-bliss-100',
      border: 'border-bliss-300',
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <UserCog className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white leading-tight">จัดการสถานะพนักงาน</h2>
                <p className="text-xs text-bliss-200">
                  {staff.name_th}{staff.name_en ? ` (${staff.name_en})` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
              disabled={isSaving}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Current Status */}
          <div className="p-4 bg-bliss-50 border border-bliss-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-bliss-600" />
              <span className="font-medium text-bliss-900">สถานะปัจจุบัน</span>
            </div>
            <p className="text-sm text-bliss-700">
              {statusOptions.find(opt => opt.value === staff.status)?.label || staff.status}
            </p>
          </div>

          {/* ── Section: เลือกสถานะใหม่ ── */}
          <div className="rounded-xl border border-bliss-200 p-5">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
              <UserCog className="w-5 h-5 text-bliss-600" />
              <h4 className="text-lg font-bold text-bliss-900">เลือกสถานะใหม่</h4>
            </div>

            <div className="space-y-3">
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
                        ? `${option.border} ${option.bg} ring-2 ring-bliss-500 ring-offset-1`
                        : isCurrent
                        ? 'border-bliss-200 bg-bliss-50 opacity-50 cursor-not-allowed'
                        : 'border-bliss-200 hover:border-bliss-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${option.bg}`}>
                        <Icon className={`w-5 h-5 ${option.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-bliss-900">{option.label}</span>
                          {isCurrent && (
                            <span className="text-xs px-2 py-0.5 bg-bliss-200 text-bliss-600 rounded-full">
                              ปัจจุบัน
                            </span>
                          )}
                          {isSelected && !isCurrent && (
                            <span className="text-xs px-2 py-0.5 bg-bliss-600 text-white rounded-full">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-bliss-600 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reason (for suspended status) */}
          {selectedStatus === 'suspended' && (
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                เหตุผลในการระงับการใช้งาน <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="กรุณาระบุเหตุผลที่ชัดเจน เช่น ละเมิดกฎระเบียบ, ได้รับข้อร้องเรียน, etc."
                className="w-full px-4 py-3 border border-bliss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
                disabled={isSaving}
              />
              <p className="text-xs text-bliss-500 mt-1">
                เหตุผลนี้จะถูกบันทึกในประวัติและอาจแสดงให้พนักงานทราบ
              </p>
            </div>
          )}

          {/* Optional Reason (for other statuses) */}
          {selectedStatus !== 'suspended' && selectedStatus !== staff.status && (
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เหตุผลในการเปลี่ยนสถานะ (ถ้ามี)"
                className="w-full px-4 py-3 border border-bliss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bliss-500 resize-none"
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
                <p className="font-medium mb-1">โปรดตรวจสอบก่อนบันทึก</p>
                <p>
                  การเปลี่ยนสถานะจะมีผลทันที และอาจส่งผลต่อการให้บริการของพนักงาน
                  กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-bliss-200 bg-bliss-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium bg-white text-bliss-700 border border-bliss-300 rounded-xl hover:bg-bliss-100 transition"
            disabled={isSaving}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedStatus === staff.status}
            className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
