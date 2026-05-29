import React, { useState } from 'react'
import {
  PayoutSchedule,
  PayoutScheduleOption,
  PAYOUT_SCHEDULE_OPTIONS,
  getPayoutScheduleOption,
  calculateNextPayoutDate
} from '../types/staff'

interface PayoutScheduleSelectorProps {
  value: PayoutSchedule
  customInterval?: number
  onScheduleChange: (schedule: PayoutSchedule) => void
  onCustomIntervalChange?: (interval: number) => void
  disabled?: boolean
  showNextPayoutPreview?: boolean
  className?: string
}

const PayoutScheduleSelector: React.FC<PayoutScheduleSelectorProps> = ({
  value,
  customInterval = 30,
  onScheduleChange,
  onCustomIntervalChange,
  disabled = false,
  showNextPayoutPreview = true,
  className = ''
}) => {
  const [localCustomInterval, setLocalCustomInterval] = useState(customInterval)

  const handleCustomIntervalChange = (interval: number) => {
    setLocalCustomInterval(interval)
    onCustomIntervalChange?.(interval)
  }

  const formatNextPayoutDate = (date: Date): string => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date)
  }

  const getNextPayoutPreview = (): string => {
    if (!showNextPayoutPreview) return ''

    const nextDate = calculateNextPayoutDate(
      value,
      value === 'custom_days' ? localCustomInterval : undefined,
      undefined,
      new Date().toISOString()
    )

    return formatNextPayoutDate(nextDate)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          รอบการจ่ายเงิน
        </label>

        <div className="grid grid-cols-1 gap-3">
          {PAYOUT_SCHEDULE_OPTIONS.map((option: PayoutScheduleOption) => (
            <div key={option.value} className="relative">
              <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="payout-schedule"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onScheduleChange(e.target.value as PayoutSchedule)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{option.icon}</span>
                    <h3 className="text-sm font-medium text-gray-900">
                      {option.label}
                    </h3>
                    {option.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        ปัจจุบัน
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {option.description}
                  </p>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom interval input for custom_days */}
      {value === 'custom_days' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            จำนวนวันที่กำหนดเอง
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="1"
              max="90"
              value={localCustomInterval}
              onChange={(e) => handleCustomIntervalChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <span className="text-sm text-gray-600">วัน</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            ระบุจำนวนวันระหว่างการจ่าย (1-90 วัน)
          </p>
        </div>
      )}

      {/* Next payout preview */}
      {showNextPayoutPreview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">•</span>
            <h4 className="text-sm font-medium text-green-800">
              วันที่จ่ายครั้งถัดไป (ตัวอย่าง)
            </h4>
          </div>
          <p className="mt-1 text-sm text-green-700">
            {getNextPayoutPreview()}
          </p>
          <p className="mt-1 text-xs text-green-600">
            *คำนวณจากวันที่ปัจจุบัน
          </p>
        </div>
      )}

      {/* Schedule info */}
      {value && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500">
            <strong>รายละเอียด:</strong>
            <br />
            • รอบการจ่าย: {getPayoutScheduleOption(value)?.label}
            <br />
            {value === 'custom_days' && (
              <>• ระยะเวลา: {localCustomInterval} วัน<br /></>
            )}
            {getPayoutScheduleOption(value)?.intervalDays && (
              <>• ความถี่: ทุก {getPayoutScheduleOption(value)!.intervalDays} วัน<br /></>
            )}
            • การจ่าย: จ่ายผ่านการอนุมัติของแอดมิน
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutScheduleSelector