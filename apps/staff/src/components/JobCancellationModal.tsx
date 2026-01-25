/**
 * Job Cancellation Modal Component
 * Allows staff to cancel a job with a reason
 */

import { useState } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { CANCELLATION_REASONS, type CancellationReason } from '@bliss/supabase'

interface JobCancellationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, notes?: string) => Promise<void>
  jobId: string
  serviceName?: string
}

export function JobCancellationModal({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  serviceName,
}: JobCancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedReason) {
      setError('กรุณาเลือกเหตุผลในการยกเลิก')
      return
    }

    if (selectedReason.code === 'OTHER' && !notes.trim()) {
      setError('กรุณาระบุรายละเอียดเพิ่มเติม')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onConfirm(selectedReason.code, notes.trim() || undefined)
      // Reset form
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-600 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold">ยกเลิกงาน</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {serviceName && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">งาน</p>
              <p className="font-medium text-gray-900">{serviceName}</p>
              <p className="text-xs text-gray-400 mt-1">#{jobId}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <p className="font-medium text-gray-900 mb-3">เลือกเหตุผลในการยกเลิก</p>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason.code}
                  onClick={() => setSelectedReason(reason)}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-xl text-left transition border-2 ${
                    selectedReason?.code === reason.code
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <p className="font-medium text-gray-900">{reason.label_th}</p>
                  <p className="text-xs text-gray-500">{reason.label_en}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes input (required for "OTHER" reason) */}
          {(selectedReason?.code === 'OTHER' || notes) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รายละเอียดเพิ่มเติม
                {selectedReason?.code === 'OTHER' && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                placeholder="กรุณาระบุรายละเอียด..."
                className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                rows={3}
              />
            </div>
          )}

          <div className="p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800">
            <p className="font-medium mb-1">⚠️ โปรดทราบ</p>
            <ul className="text-xs space-y-1 text-yellow-700">
              <li>• การยกเลิกงานบ่อยครั้งอาจส่งผลต่อคะแนนของคุณ</li>
              <li>• หากมีปัญหาเร่งด่วน กรุณาติดต่อแอดมิน</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedReason}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังยกเลิก...
              </>
            ) : (
              'ยืนยันยกเลิกงาน'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default JobCancellationModal
