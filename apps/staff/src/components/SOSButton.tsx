/**
 * SOS Emergency Button Component
 * Floating button for staff to report emergencies
 */

import { useState, useCallback } from 'react'
import { AlertTriangle, Phone, X, Loader2 } from 'lucide-react'
import { useSOS } from '@bliss/supabase'

interface SOSButtonProps {
  currentJobId?: string | null
}

export function SOSButton({ currentJobId }: SOSButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { sendSOS, isReporting, error } = useSOS()

  const handleSOS = useCallback(async () => {
    try {
      await sendSOS(currentJobId || null, 'SOS Emergency from Staff')
      setShowConfirm(false)
      setShowSuccess(true)
      // Auto-hide success after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to send SOS:', err)
    }
  }, [sendSOS, currentJobId])

  const emergencyNumber = '191' // Thai emergency number

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-red-700 active:scale-95 transition-all"
        aria-label="SOS Emergency"
      >
        <AlertTriangle className="w-7 h-7" />
      </button>

      {/* SOS Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-red-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-bold">SOS ฉุกเฉิน</h3>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-gray-600 text-sm">
                หากคุณต้องการความช่วยเหลือฉุกเฉิน กรุณาเลือกวิธีการติดต่อ
              </p>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  เกิดข้อผิดพลาด: {error.message}
                </div>
              )}

              {/* Emergency Call */}
              <a
                href={`tel:${emergencyNumber}`}
                className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-700 hover:bg-red-100 transition"
              >
                <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">โทรแจ้งเหตุฉุกเฉิน</p>
                  <p className="text-sm">{emergencyNumber}</p>
                </div>
              </a>

              {/* Report to Admin */}
              <button
                onClick={handleSOS}
                disabled={isReporting}
                className="w-full flex items-center gap-3 p-4 bg-amber-50 rounded-xl text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center">
                  {isReporting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-semibold">แจ้งเหตุต่อแอดมิน</p>
                  <p className="text-sm">
                    {isReporting ? 'กำลังส่ง...' : 'ส่งตำแหน่งและแจ้งเตือน'}
                  </p>
                </div>
              </button>

              <p className="text-xs text-gray-400 text-center">
                ระบบจะส่งตำแหน่งปัจจุบันของคุณไปยังทีมงาน
              </p>
            </div>

            {/* Cancel */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-green-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-down">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="font-semibold">ส่งแจ้งเตือนสำเร็จ</p>
              <p className="text-sm opacity-90">ทีมงานจะติดต่อกลับโดยเร็ว</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SOSButton
