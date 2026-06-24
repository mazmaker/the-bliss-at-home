import React, { useState, useEffect } from 'react'
import { X, CalendarClock } from 'lucide-react'
import {
  PayoutSchedule,
  Staff,
  UpdatePayoutScheduleRequest,
  calculateNextPayoutDate,
  getPayoutScheduleLabel
} from '../types/staff'
import PayoutScheduleSelector from './PayoutScheduleSelector'

interface PayoutScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  staff: Staff
  onUpdateSchedule: (request: UpdatePayoutScheduleRequest) => Promise<void>
  isLoading?: boolean
}

const PayoutScheduleModal: React.FC<PayoutScheduleModalProps> = ({
  isOpen,
  onClose,
  staff,
  onUpdateSchedule,
  isLoading = false
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<PayoutSchedule>(staff.payout_schedule)
  const [customInterval, setCustomInterval] = useState(staff.custom_payout_interval || 30)
  const [payoutStartDate, setPayoutStartDate] = useState(
    staff.payout_start_date ? new Date(staff.payout_start_date).toISOString().split('T')[0] :
    new Date().toISOString().split('T')[0]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/staff changes
  useEffect(() => {
    if (isOpen) {
      setSelectedSchedule(staff.payout_schedule)
      setCustomInterval(staff.custom_payout_interval || 30)
      setPayoutStartDate(
        staff.payout_start_date ? new Date(staff.payout_start_date).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0]
      )
      setErrors({})
    }
  }, [isOpen, staff])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedSchedule) {
      newErrors.schedule = 'กรุณาเลือกรอบการจ่ายเงิน'
    }

    if (selectedSchedule === 'custom_days') {
      if (!customInterval || customInterval < 1 || customInterval > 90) {
        newErrors.customInterval = 'กรุณาระบุจำนวนวัน 1-90 วัน'
      }
    }

    if (!payoutStartDate) {
      newErrors.startDate = 'กรุณาระบุวันที่เริ่มต้น'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const request: UpdatePayoutScheduleRequest = {
        staffId: staff.id,
        payoutSchedule: selectedSchedule,
        customPayoutInterval: selectedSchedule === 'custom_days' ? customInterval : undefined,
        payoutStartDate: payoutStartDate
      }

      await onUpdateSchedule(request)
      onClose()
    } catch (error) {
      console.error('Error updating payout schedule:', error)
      setErrors({ submit: 'เกิดข้อผิดพลาดในการอัปเดตรอบการจ่ายเงิน' })
    }
  }

  const getNextPayoutPreview = (): string => {
    const nextDate = calculateNextPayoutDate(
      selectedSchedule,
      selectedSchedule === 'custom_days' ? customInterval : undefined,
      undefined,
      payoutStartDate
    )

    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(nextDate)
  }

  const hasChanges = () => {
    return (
      selectedSchedule !== staff.payout_schedule ||
      customInterval !== (staff.custom_payout_interval || 30) ||
      payoutStartDate !== (staff.payout_start_date ? new Date(staff.payout_start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white leading-tight">แก้ไขรอบการจ่ายเงิน</h2>
                  <p className="text-xs text-bliss-200">พนักงาน: {staff.name_th}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Current schedule info */}
              <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-bliss-900 mb-2">รอบการจ่ายปัจจุบัน</h3>
                <div className="text-sm text-bliss-700 space-y-0.5">
                  <p>รอบ: {getPayoutScheduleLabel(staff.payout_schedule, staff.custom_payout_interval)}</p>
                  {staff.next_payout_date && (
                    <p>วันจ่ายครั้งถัดไป: {new Intl.DateTimeFormat('th-TH').format(new Date(staff.next_payout_date))}</p>
                  )}
                </div>
              </div>

              {/* ── Section: ตั้งค่ารอบการจ่าย ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <CalendarClock className="w-5 h-5 text-bliss-600" />
                  <h4 className="text-lg font-bold text-bliss-900">ตั้งค่ารอบการจ่าย</h4>
                </div>

                {/* Payout schedule selector */}
                <div>
                  <PayoutScheduleSelector
                    value={selectedSchedule}
                    customInterval={customInterval}
                    onScheduleChange={setSelectedSchedule}
                    onCustomIntervalChange={setCustomInterval}
                    disabled={isLoading}
                    showNextPayoutPreview={false}
                    showComparisonTable={false}
                  />
                  {errors.schedule && (
                    <p className="mt-1 text-sm text-red-600">{errors.schedule}</p>
                  )}
                  {errors.customInterval && (
                    <p className="mt-1 text-sm text-red-600">{errors.customInterval}</p>
                  )}
                </div>

                {/* Start date */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-bliss-700 mb-1.5">
                    วันที่เริ่มต้นการจ่าย
                  </label>
                  <input
                    type="date"
                    value={payoutStartDate}
                    onChange={(e) => setPayoutStartDate(e.target.value)}
                    disabled={isLoading}
                    className="block w-full px-4 py-2 rounded-lg border border-bliss-300 focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-bliss-500">
                    วันที่เริ่มนับรอบการจ่ายใหม่
                  </p>
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-bliss-100 border border-bliss-300 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-bliss-900 mb-2">ตัวอย่างการจ่ายครั้งถัดไป</h3>
                <p className="text-sm text-bliss-700">
                  {getNextPayoutPreview()}
                </p>
                <p className="text-xs text-bliss-500 mt-1">
                  *คำนวณจากวันที่เริ่มต้นที่เลือก
                </p>
              </div>

              {/* Submit error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-bliss-200 bg-bliss-50">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-bliss-700 bg-white border border-bliss-300 rounded-xl hover:bg-bliss-100 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isLoading || !hasChanges()}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'กำลังอัปเดต...' : 'อัปเดตรอบการจ่าย'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PayoutScheduleModal