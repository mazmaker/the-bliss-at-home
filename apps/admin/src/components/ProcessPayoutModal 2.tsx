import { useState } from 'react'
import { X, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { useStaffPayouts } from '../hooks/useStaffEarnings'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

interface ProcessPayoutModalProps {
  payoutId: string | null
  staffId: string
  onClose: () => void
}

export function ProcessPayoutModal({ payoutId, staffId, onClose }: ProcessPayoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transferReference, setTransferReference] = useState('')
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const { data: payouts } = useStaffPayouts(staffId)
  const selectedPayout = payouts?.find((p) => p.id === payoutId)

  const handleProcessPayout = async () => {
    if (!payoutId) {
      toast.error('กรุณาเลือกรายการจ่ายเงิน')
      return
    }

    if (!transferReference.trim()) {
      toast.error('กรุณากรอกหมายเลขอ้างอิงการโอน')
      return
    }

    setIsProcessing(true)

    try {
      // Update payout status
      const { error } = await supabase
        .from('payouts')
        .update({
          status: 'completed',
          transfer_reference: transferReference,
          transferred_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutId)

      if (error) throw error

      // Send LINE notification to staff
      await sendLineNotification(selectedPayout)

      toast.success('ดำเนินการจ่ายเงินสำเร็จ และส่งแจ้งเตือนให้พนักงานแล้ว')
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'payouts'] })
      queryClient.invalidateQueries({ queryKey: ['staff', staffId, 'earnings', 'summary'] })
      onClose()
    } catch (error: any) {
      console.error('Error processing payout:', error)
      toast.error(error.message || 'เกิดข้อผิดพลาดในการดำเนินการจ่ายเงิน')
    } finally {
      setIsProcessing(false)
    }
  }

  const sendLineNotification = async (payout: any) => {
    try {
      // Get staff info
      const { data: staffData } = await supabase
        .from('staff')
        .select('name_th, profile_id')
        .eq('id', staffId)
        .single()

      if (!staffData?.profile_id) return

      const totalAmount = parseFloat(payout.net_amount)
      const periodStart = new Date(payout.period_start)
      const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                         'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
      const periodText = `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`

      // Prepare LINE message
      const message = `🎉 แจ้งเตือนการจ่ายเงิน

เรียน คุณ${staffData.name_th}

💰 ยอดเงินที่โอนเข้าบัญชี: ฿${totalAmount.toLocaleString()}

📅 รอบการจ่าย: ${periodText}
📊 จำนวนงาน: ${payout.total_jobs} งาน
💵 รายได้สุทธิ: ฿${parseFloat(payout.net_amount).toLocaleString()}

📝 หมายเลขอ้างอิง: ${transferReference}
📆 วันที่โอน: ${new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}

ขอบคุณสำหรับการให้บริการที่ดีเสมอมา! 🙏`

      // TODO: Send via LINE API
      // For now, just log the message
      console.log('LINE Notification:', message)
      console.log('Send to staff profile:', staffData.profile_id)

      // In production, you would call your backend API to send LINE message
      // await fetch('/api/line/notify', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     profileId: staffData.profile_id,
      //     message: message
      //   })
      // })

    } catch (error) {
      console.error('Error sending LINE notification:', error)
      // Don't throw error - notification failure shouldn't stop the payout process
    }
  }

  if (!selectedPayout) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-900 mb-2">ไม่พบรายการจ่ายเงิน</h3>
            <p className="text-sm text-stone-600 mb-4">กรุณาเลือกรายการจ่ายเงินที่ต้องการดำเนินการ</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalAmount = parseFloat(selectedPayout.net_amount)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">ดำเนินการจ่ายเงิน</h2>
            <p className="text-sm text-stone-600 mt-1">ยืนยันการโอนเงินให้พนักงาน</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Payout Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-stone-900 mb-3">สรุปยอดจ่าย</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">ช่วงเวลา:</span>
                    <span className="font-medium text-stone-900">
                      {new Date(selectedPayout.period_start).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(selectedPayout.period_end).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">จำนวนงาน:</span>
                    <span className="font-medium text-stone-900">{selectedPayout.total_jobs} งาน</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">รายได้รวม:</span>
                    <span className="font-medium text-green-700">
                      ฿{parseFloat(selectedPayout.gross_earnings).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">ค่าธรรมเนียม (15%):</span>
                    <span className="font-medium text-red-700">
                      -฿{parseFloat(selectedPayout.platform_fee).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-amber-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-stone-900">ยอดโอนทั้งหมด:</span>
                      <span className="font-bold text-xl text-amber-700">฿{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Information */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                หมายเลขอ้างอิงการโอน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                placeholder="เช่น TXN123456789"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={isProcessing}
              />
              <p className="text-xs text-stone-500 mt-1">กรุณากรอกหมายเลขอ้างอิงจากธนาคาร</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">หมายเหตุ (ถ้ามี)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="บันทึกเพิ่มเติม..."
                rows={3}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Warning */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">โปรดตรวจสอบความถูกต้อง</p>
              <p className="text-blue-700">
                กรุณาตรวจสอบยอดเงินและข้อมูลการโอนให้ถูกต้องก่อนดำเนินการ
                การกระทำนี้จะเปลี่ยนสถานะเป็น "จ่ายแล้ว" และไม่สามารถย้อนกลับได้
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
            disabled={isProcessing}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleProcessPayout}
            disabled={isProcessing || !transferReference.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                ยืนยันการจ่ายเงิน
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
