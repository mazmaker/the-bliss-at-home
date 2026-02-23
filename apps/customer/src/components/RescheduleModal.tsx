/**
 * Customer Reschedule Modal
 * Allows customers to reschedule their bookings with policy-based rules
 */

import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { AlertTriangle, Clock, Ban, CheckCircle, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface CancellationEligibility {
  canCancel: boolean
  canReschedule: boolean
  refundPercentage: number
  rescheduleFee: number
  hoursUntilBooking: number
  tier: {
    label_th: string | null
    label_en: string | null
  } | null
  reason?: string
}

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newDate: string, newTime: string) => Promise<void>
  bookingId: string
  bookingNumber: string
  serviceName: string
  currentDate: string
  currentTime: string
  duration: number // in hours
}

// Generate time slots from 9:00 to 20:00
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function RescheduleModal({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  bookingNumber,
  serviceName,
  currentDate,
  currentTime,
  duration,
}: RescheduleModalProps) {
  const [step, setStep] = useState<'check' | 'select' | 'confirm' | 'result'>('check')
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Check eligibility when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      checkEligibility()
    }
  }, [isOpen, bookingId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('check')
      setSelectedDate('')
      setSelectedTime('')
      setError('')
      setSuccess(false)
      setCurrentMonth(new Date())
    }
  }, [isOpen])

  const checkEligibility = async () => {
    setLoading(true)
    setError('')

    try {
      // Check booking eligibility
      const checkRes = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/cancellation-policy/check/${bookingId}`
      )

      if (!checkRes.ok) {
        throw new Error('ไม่สามารถตรวจสอบสถานะการเลื่อนนัดได้')
      }

      const checkData = await checkRes.json()
      setEligibility(checkData.data)

      // Auto move to select step if eligible
      if (checkData.data.canReschedule) {
        setStep('select')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError('กรุณาเลือกวันและเวลาใหม่')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onConfirm(selectedDate, selectedTime)
      setSuccess(true)
      setStep('result')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเลื่อนนัด')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const isDateSelectable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Must be at least 3 hours from now
    const minDate = new Date()
    minDate.setHours(minDate.getHours() + 3)

    // Can't book more than 30 days ahead
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)

    // Can't select the current booking date
    const currentBookingDate = new Date(currentDate)
    currentBookingDate.setHours(0, 0, 0, 0)

    // Create a copy to avoid mutating the original date
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)

    return dateToCheck >= today && dateToCheck <= maxDate && dateToCheck.getTime() !== currentBookingDate.getTime()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เลื่อนนัดหมาย" size="md">
      <div className="py-4 max-h-[70vh] overflow-y-auto">
        {/* Loading State */}
        {loading && step === 'check' && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-stone-600">กำลังตรวจสอบเงื่อนไขการเลื่อนนัด...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Cannot Reschedule */}
        {!loading && eligibility && !eligibility.canReschedule && step === 'check' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">ไม่สามารถเลื่อนนัดได้</h3>
            <p className="text-stone-600 mb-4">
              {eligibility.reason || 'การจองนี้ไม่สามารถเลื่อนนัดได้ในขณะนี้'}
            </p>

            {eligibility.hoursUntilBooking > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">เหลือเวลา {eligibility.hoursUntilBooking.toFixed(1)} ชั่วโมงก่อนนัด</span>
                </div>
                <p className="text-sm text-amber-700">
                  ตามนโยบาย ต้องเลื่อนนัดล่วงหน้าอย่างน้อย 3 ชั่วโมงก่อนเวลานัด
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Date/Time Selection */}
        {step === 'select' && eligibility?.canReschedule && (
          <div className="space-y-6">
            {/* Current Booking Info */}
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-sm text-stone-500 mb-1">การจองปัจจุบัน</p>
              <p className="font-medium text-stone-900">{serviceName}</p>
              <p className="text-sm text-stone-600">{formatDate(currentDate)} เวลา {currentTime}</p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                เลือกวันใหม่
              </label>
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-stone-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-stone-600" />
                  </button>
                  <span className="font-medium text-stone-900">
                    {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-stone-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5 text-stone-600" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} />
                    }

                    // Use local date format to avoid timezone issues
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const dateStr = `${year}-${month}-${day}`
                    const isSelectable = isDateSelectable(new Date(date))
                    const isSelected = selectedDate === dateStr
                    const isToday = new Date().toDateString() === date.toDateString()

                    return (
                      <button
                        key={dateStr}
                        onClick={() => isSelectable && setSelectedDate(dateStr)}
                        disabled={!isSelectable}
                        className={`p-2 text-sm rounded-lg transition ${
                          isSelected
                            ? 'bg-amber-600 text-white font-bold'
                            : isSelectable
                            ? 'hover:bg-amber-100 text-stone-700'
                            : 'text-stone-300 cursor-not-allowed'
                        } ${isToday && !isSelected ? 'ring-2 ring-amber-300' : ''}`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  เลือกเวลาใหม่
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {TIME_SLOTS.map((time) => {
                    const isSelected = selectedTime === time

                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                            : 'border-stone-200 hover:border-amber-300 text-stone-700'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ดำเนินการต่อ
              </button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">ยืนยันการเลื่อนนัด</h3>
            <p className="text-stone-600 mb-6">
              กรุณาตรวจสอบรายละเอียดการเลื่อนนัดก่อนยืนยัน
            </p>

            <div className="bg-stone-50 rounded-xl p-4 text-left mb-6 space-y-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">วันเวลาเดิม</p>
                <p className="font-medium text-stone-900 line-through opacity-60">
                  {formatDate(currentDate)} เวลา {currentTime}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-1">วันเวลาใหม่</p>
                <p className="font-bold text-amber-700 text-lg">
                  {formatDate(selectedDate)} เวลา {selectedTime}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50"
              >
                กลับ
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  'ยืนยันเลื่อนนัด'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Result */}
        {step === 'result' && success && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">เลื่อนนัดเรียบร้อยแล้ว</h3>
            <p className="text-stone-600 mb-4">
              การจองหมายเลข {bookingNumber} ได้เปลี่ยนเป็นวันเวลาใหม่แล้ว
            </p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">นัดหมายใหม่</p>
                  <p className="text-sm text-green-700">
                    {formatDate(selectedDate)} เวลา {selectedTime}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
