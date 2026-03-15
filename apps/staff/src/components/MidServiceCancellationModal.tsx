/**
 * Mid-Service Cancellation Modal
 * Specialized modal for cancelling a job that is already in_progress.
 * Requires mandatory notes and shows elapsed service time.
 */

import { useState } from 'react'
import { X, AlertTriangle, Loader2, Clock } from 'lucide-react'
import { MID_SERVICE_CANCELLATION_REASONS, type CancellationReason } from '@bliss/supabase'

interface MidServiceCancellationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, notes: string) => Promise<void>
  jobId: string
  serviceName?: string
  startedAt: string
  durationMinutes: number
}

function formatElapsed(startedAt: string): { minutes: number; text: string } {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
  if (elapsed < 1) return { minutes: 0, text: 'น้อยกว่า 1 นาที' }
  if (elapsed < 60) return { minutes: elapsed, text: `${elapsed} นาที` }
  const hours = Math.floor(elapsed / 60)
  const mins = elapsed % 60
  return { minutes: elapsed, text: `${hours} ชั่วโมง ${mins} นาที` }
}

export function MidServiceCancellationModal({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  serviceName,
  startedAt,
  durationMinutes,
}: MidServiceCancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elapsed = formatElapsed(startedAt)

  const handleConfirm = async () => {
    if (!selectedReason) {
      setError('กรุณาเลือกเหตุผลในการยกเลิก')
      return
    }

    if (!notes.trim()) {
      setError('กรุณาระบุรายละเอียดเพิ่มเติม (จำเป็น)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(selectedReason.code, notes.trim())
      setSelectedReason(null)
      setNotes('')
      onClose()
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null)
      setNotes('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-700 px-4 py-3 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">ยกเลิกระหว่างให้บริการ</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {/* Service info + elapsed time */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            {serviceName && (
              <div>
                <p className="text-xs text-red-600">งาน</p>
                <p className="font-medium text-red-900 text-sm">{serviceName}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-red-800">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                ให้บริการไปแล้ว: {elapsed.text} (จากทั้งหมด {durationMinutes} นาที)
              </span>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Reason selection */}
          <div>
            <p className="font-medium text-gray-900 mb-2 text-sm">เหตุผลในการยกเลิก <span className="text-red-500">*</span></p>
            <div className="space-y-1.5">
              {MID_SERVICE_CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason.code}
                  onClick={() => setSelectedReason(reason)}
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 rounded-lg text-left transition border-2 ${
                    selectedReason?.code === reason.code
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <p className="font-medium text-gray-900 text-sm">{reason.label_th}</p>
                  <p className="text-xs text-gray-500">{reason.label_en}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes - always required for mid-service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียดเพิ่มเติม <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="กรุณาระบุรายละเอียดว่าเกิดอะไรขึ้น..."
              className="w-full p-2 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
            <p className="font-bold">การยกเลิกระหว่างให้บริการถือเป็นเรื่องร้ายแรง</p>
            <p>Admin จะได้รับแจ้งเตือนทันที และจะถูกบันทึกในประวัติการทำงานของคุณ</p>
          </div>
        </div>

        {/* Actions - always visible */}
        <div className="p-3 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 text-sm"
          >
            กลับไปทำงาน
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedReason || !notes.trim()}
            className="flex-1 py-2.5 bg-red-700 text-white rounded-xl font-medium hover:bg-red-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังยกเลิก...
              </>
            ) : (
              'ยืนยันยกเลิก'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MidServiceCancellationModal
