import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  PayoutSchedule,
  Staff,
  UpdatePayoutScheduleRequest,
  calculateNextPayoutDate
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
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                แก้ไขรอบการจ่ายเงิน
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                พนักงาน: {staff.name_th}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current schedule info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">รอบการจ่ายปัจจุบัน</h3>
                <div className="text-sm text-blue-700">
                  <p>รอบ: {staff.payout_schedule}</p>
                  {staff.custom_payout_interval && (
                    <p>ระยะเวลา: {staff.custom_payout_interval} วัน</p>
                  )}
                  {staff.next_payout_date && (
                    <p>วันจ่ายครั้งถัดไป: {new Intl.DateTimeFormat('th-TH').format(new Date(staff.next_payout_date))}</p>
                  )}
                </div>
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
                />
                {errors.schedule && (
                  <p className="mt-1 text-sm text-red-600">{errors.schedule}</p>
                )}
                {errors.customInterval && (
                  <p className="mt-1 text-sm text-red-600">{errors.customInterval}</p>
                )}
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่เริ่มต้นการจ่าย
                </label>
                <input
                  type="date"
                  value={payoutStartDate}
                  onChange={(e) => setPayoutStartDate(e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  วันที่เริ่มนับรอบการจ่ายใหม่
                </p>
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              {/* Preview */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">ตัวอย่างการจ่ายครั้งถัดไป</h3>
                <p className="text-sm text-green-700">
                  {getNextPayoutPreview()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  *คำนวณจากวันที่เริ่มต้นที่เลือก
                </p>
              </div>

              {/* Submit error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !hasChanges()}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'กำลังอัปเดต...' : 'อัปเดตรอบการจ่าย'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PayoutScheduleModal