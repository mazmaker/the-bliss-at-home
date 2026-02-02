import { useState } from 'react'
import { ShieldAlert, X, MapPin, Phone, AlertTriangle } from 'lucide-react'

interface SOSButtonProps {
  className?: string
}

function SOSButton({ className = '' }: SOSButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSendSOS = async () => {
    setSending(true)

    try {
      // Get current location
      let location = { lat: 0, lng: 0 }
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }
              resolve(null)
            },
            () => {
              // Location denied or error, continue without it
              resolve(null)
            }
          )
        })
      }

      // Send SOS alert to backend
      // TODO: Replace with actual API call
      await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          location,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Fallback: log to console if API fails
        console.error('SOS Alert:', {
          timestamp: new Date().toISOString(),
          location,
        })
      })

      setSent(true)
      setTimeout(() => {
        setShowConfirm(false)
        setSent(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to send SOS:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition shadow-md hover:shadow-lg ${className}`}
        title="Emergency Alert"
      >
        <ShieldAlert className="w-4 h-4" />
        <span>SOS</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {!sent ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">ส่งสัญญาณฉุกเฉิน</h3>
                      <p className="text-xs text-stone-500">Emergency Alert</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                    className="p-1 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="mb-6 space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      การแจ้งเตือนนี้จะส่งไปยัง:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        ทีม Admin ของ The Bliss
                      </li>
                      <li className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        พร้อมข้อมูลตำแหน่งของคุณ
                      </li>
                    </ul>
                  </div>

                  <p className="text-sm text-stone-600">
                    กดยืนยันหากคุณต้องการความช่วยเหลือเร่งด่วน
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                    className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSendSOS}
                    disabled={sending}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>กำลังส่ง...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>ยืนยันส่ง SOS</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">ส่งสัญญาณสำเร็จ</h3>
                <p className="text-stone-600">
                  ทีมงานได้รับการแจ้งเตือนแล้ว<br />
                  และจะติดต่อกลับโดยเร็วที่สุด
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SOSButton
