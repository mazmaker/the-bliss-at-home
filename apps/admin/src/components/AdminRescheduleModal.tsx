/**
 * AdminRescheduleModal (PART47-P6)
 * Admin-only reschedule of a booking's date/time. Reschedule became admin-only in P6: the
 * customer + hotel self-reschedule UIs were removed and the server route is now behind
 * `requireAdmin`. This modal is the ONLY reschedule entry point and works for BOTH regular
 * customer bookings and hotel bookings (the /admin/bookings list mixes them).
 *
 * It reuses the SAME server route (POST /api/bookings/:id/reschedule) — so it inherits keep-staff
 * (same therapist kept if free at the new slot), unassign+re-broadcast otherwise, the DB-trigger
 * date/time cascade, staff/admin notifications, and (P6-D3) the new customer/hotel notification.
 *
 * Admin OVERRIDE (P6-G3): the server lets an admin bypass the reschedule-eligibility policy
 * (≤3h lead + max-reschedules ceiling). So this modal does NOT hard-block an "ineligible" booking
 * the way the customer modal does — it shows an override notice and lets the admin proceed. The
 * past-time guard is kept (you cannot pick a slot before now).
 */

import { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  Clock,
  Ban,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { isRescheduleDateSelectable, isRescheduleTimeAvailable, isSameBookingSlot } from '@bliss/ui'
import { supabase } from '../lib/supabase'
import type { Booking } from '../hooks/useBookings'

// Normalize: prod sets VITE_API_URL WITH a trailing /api, but the fetch calls below already
// append /api/... — strip a trailing /api so the URL isn't doubled to /api/api (→ 404).
const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')).replace(/\/api\/?$/, '')

interface RescheduleEligibility {
  canReschedule: boolean
  hoursUntilBooking?: number
  reason?: string
}

interface RescheduleOutcome {
  staff_kept?: boolean
  staff_unassigned?: boolean
}

interface AdminRescheduleModalProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onRescheduled: () => void
}

// 09:00–20:00 in 30-min steps (matches the customer/hotel reschedule pickers)
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 9; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < 20) slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  return slots
}
const TIME_SLOTS = generateTimeSlots()

export default function AdminRescheduleModal({
  booking,
  isOpen,
  onClose,
  onRescheduled,
}: AdminRescheduleModalProps) {
  const [step, setStep] = useState<'check' | 'select' | 'confirm' | 'result'>('check')
  const [eligibility, setEligibility] = useState<RescheduleEligibility | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rescheduleResult, setRescheduleResult] = useState<RescheduleOutcome | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const currentDate = booking.booking_date || ''
  const currentTime = (booking.booking_time || '').slice(0, 5)
  const serviceName = booking.service?.name_th || booking.service?.name_en || 'บริการ'
  const isHotelBooking = !!booking.is_hotel_booking

  // Fetch eligibility for INFO only (admin can override) when the modal opens.
  useEffect(() => {
    if (isOpen && booking.id) {
      void checkEligibility()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking.id])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('check')
      setEligibility(null)
      setSelectedDate('')
      setSelectedTime('')
      setError('')
      setRescheduleResult(null)
      setCurrentMonth(new Date())
    }
  }, [isOpen])

  const checkEligibility = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/cancellation-policy/check/${booking.id}`)
      if (res.ok) {
        const data = await res.json()
        setEligibility(data.data || null)
      }
    } catch (e) {
      // Eligibility is advisory for admins — never block on a failed check.
      console.error('[AdminReschedule] eligibility check failed (non-blocking):', e)
    } finally {
      setLoading(false)
      // Admin override: always proceed to date/time selection regardless of canReschedule.
      setStep('select')
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1))
      return d
    })
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      setError('กรุณาเลือกวันและเวลาใหม่')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ new_date: selectedDate, new_time: selectedTime }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถเลื่อนนัดได้')
      }
      setRescheduleResult(data.data || null)
      setStep('result')
      onRescheduled() // refresh the bookings list behind the modal
    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาดในการเลื่อนนัด')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const overrideNeeded = eligibility != null && eligibility.canReschedule === false

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bliss-200 bg-gradient-to-r from-bliss-50 to-blue-50">
          <div>
            <h2 className="text-xl font-semibold text-bliss-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-bliss-600" />
              เลื่อนนัดการจอง
            </h2>
            <p className="text-sm text-bliss-600 mt-1">Booking #{booking.booking_number}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-white/50 rounded-lg transition">
            <X className="w-5 h-5 text-bliss-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Loading (eligibility check) */}
          {loading && step === 'check' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-bliss-600 animate-spin mx-auto mb-3" />
              <p className="text-bliss-700">กำลังตรวจสอบเงื่อนไข...</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Current booking context (customer vs hotel) */}
          {step !== 'check' && (
            <div className="bg-bliss-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  {isHotelBooking ? <Building2 className="w-4 h-4 text-bliss-400 mt-0.5" /> : <User className="w-4 h-4 text-bliss-400 mt-0.5" />}
                  <div>
                    <p className="text-bliss-500">{isHotelBooking ? 'โรงแรม' : 'ลูกค้า'}</p>
                    <p className="font-medium text-bliss-900">
                      {isHotelBooking
                        ? (booking.hotel?.name_th || 'โรงแรม')
                        : (booking.customers?.full_name || booking.customer?.full_name || 'ไม่ระบุ')}
                    </p>
                    {isHotelBooking && booking.hotel_room_number && (
                      <p className="text-xs text-bliss-600">🏠 ห้อง: {booking.hotel_room_number}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-bliss-400 mt-0.5" />
                  <div>
                    <p className="text-bliss-500">บริการ / นัดเดิม</p>
                    <p className="font-medium text-bliss-900">{serviceName}</p>
                    <p className="text-xs text-bliss-600">{formatDate(currentDate)} {currentTime}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin override notice — booking is normally not reschedulable but admin may override */}
          {step === 'select' && overrideNeeded && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
              <Ban className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">ปกติการจองนี้เลื่อนนัดไม่ได้ตามนโยบาย</p>
                <p className="text-amber-700 mt-0.5">{eligibility?.reason || 'เกินเงื่อนไข (เช่น เหลือเวลาน้อยกว่า 3 ชม. หรือเลื่อนครบจำนวนครั้งแล้ว)'}</p>
                <p className="text-amber-700 mt-1">ในฐานะแอดมิน คุณสามารถดำเนินการเลื่อนนัดได้ (override)</p>
              </div>
            </div>
          )}

          {/* Select date + time */}
          {step === 'select' && (
            <div className="space-y-5">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-2">เลือกวันที่ใหม่</label>
                <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-bliss-100 rounded-lg transition">
                      <ChevronLeft className="w-5 h-5 text-bliss-700" />
                    </button>
                    <span className="font-medium text-bliss-900">
                      {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-bliss-100 rounded-lg transition">
                      <ChevronRight className="w-5 h-5 text-bliss-700" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
                      <div key={i} className="text-center text-xs font-medium text-bliss-500 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((date, index) => {
                      if (!date) return <div key={`empty-${index}`} />
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      const dateStr = `${year}-${month}-${day}`
                      const isSelectable = isRescheduleDateSelectable(new Date(date))
                      const isSelected = selectedDate === dateStr
                      const isToday = new Date().toDateString() === date.toDateString()
                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            if (isSelectable) {
                              setSelectedDate(dateStr)
                              setSelectedTime('')
                            }
                          }}
                          disabled={!isSelectable}
                          className={`p-2 text-sm rounded-lg transition ${
                            isSelected
                              ? 'bg-bliss-600 text-white font-bold'
                              : isSelectable
                                ? 'hover:bg-bliss-200 text-bliss-700'
                                : 'text-bliss-300 cursor-not-allowed'
                          } ${isToday && !isSelected ? 'ring-2 ring-bliss-400' : ''}`}
                        >
                          {date.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Time */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1">เลือกเวลาใหม่</label>
                  <p className="text-xs text-bliss-500 mb-2">แอดมินเลื่อนได้ทุกช่วงเวลาในอนาคต (ข้ามเงื่อนไข 3 ชม. ได้ แต่เลือกเวลาที่ผ่านมาแล้วไม่ได้)</p>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {TIME_SLOTS.map((time) => {
                      const isSelected = selectedTime === time
                      // Admin override: block only slots strictly in the past (minLeadMinutes:0),
                      // NOT the 3h lead — plus the booking's own current slot (no-op reschedule).
                      const isPast = !isRescheduleTimeAvailable(selectedDate, time, { minLeadMinutes: 0 })
                      const isNoOp = isSameBookingSlot(selectedDate, time, currentDate, currentTime)
                      const isDisabled = isPast || isNoOp
                      return (
                        <button
                          key={time}
                          onClick={() => !isDisabled && setSelectedTime(time)}
                          disabled={isDisabled}
                          className={`px-3 py-2 text-sm rounded-lg border-2 transition ${
                            isSelected
                              ? 'border-bliss-600 bg-bliss-100 text-bliss-600 font-medium'
                              : isDisabled
                                ? 'border-bliss-100 text-bliss-300 cursor-not-allowed'
                                : 'border-bliss-200 hover:border-bliss-400 text-bliss-700'
                          }`}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && (
            <div className="text-center py-2">
              <div className="w-14 h-14 bg-bliss-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-bliss-600" />
              </div>
              <h3 className="text-lg font-bold text-bliss-900 mb-1">ยืนยันการเลื่อนนัด?</h3>
              <p className="text-bliss-600 text-sm mb-5">พนักงานคนเดิมจะถูกคงไว้หากยังว่างในเวลาใหม่ มิฉะนั้นงานจะถูกเปิดให้รับใหม่</p>
              <div className="bg-bliss-50 rounded-xl p-4 text-left space-y-3">
                <div>
                  <p className="text-xs text-bliss-500 mb-1">เวลาเดิม</p>
                  <p className="font-medium text-bliss-900 line-through opacity-60">{formatDate(currentDate)} {currentTime}</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-7 h-7 bg-bliss-200 rounded-full flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-bliss-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-bliss-500 mb-1">เวลาใหม่</p>
                  <p className="font-bold text-bliss-600 text-lg">{formatDate(selectedDate)} {selectedTime}</p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {step === 'result' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-bliss-900 mb-1">เลื่อนนัดสำเร็จ</h3>
              <p className="text-bliss-700 text-sm mb-4">การจอง #{booking.booking_number} ถูกเลื่อนเป็น {formatDate(selectedDate)} {selectedTime}</p>
              {rescheduleResult?.staff_kept && (
                <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-3 text-left flex items-start gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-bliss-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-bliss-700">พนักงานคนเดิมยังดูแลงานนี้ (ว่างในเวลาใหม่) และได้รับแจ้งแล้ว</p>
                </div>
              )}
              {rescheduleResult?.staff_unassigned && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left flex items-start gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">พนักงานเดิมไม่ว่างในเวลาใหม่ — เปิดงานให้พนักงานรับใหม่แล้ว</p>
                </div>
              )}
              <p className="text-xs text-bliss-500 mt-2">ระบบได้แจ้งเตือนผู้เกี่ยวข้อง (พนักงาน / ลูกค้าหรือโรงแรม) แล้ว</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-bliss-200 bg-bliss-50">
          {step === 'select' && (
            <>
              <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-white text-bliss-700 border border-bliss-300 rounded-lg font-medium hover:bg-bliss-50 transition disabled:opacity-50">
                ยกเลิก
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedDate || !selectedTime}
                className="px-4 py-2 bg-bliss-600 text-white rounded-lg font-medium hover:bg-bliss-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button onClick={() => setStep('select')} disabled={loading} className="px-4 py-2 bg-white text-bliss-700 border border-bliss-300 rounded-lg font-medium hover:bg-bliss-50 transition disabled:opacity-50">
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 bg-bliss-600 text-white rounded-lg font-medium hover:bg-bliss-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />กำลังดำเนินการ...</>) : 'ยืนยันเลื่อนนัด'}
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose} className="px-6 py-2 bg-bliss-600 text-white rounded-lg font-medium hover:bg-bliss-700 transition">
              ปิด
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
