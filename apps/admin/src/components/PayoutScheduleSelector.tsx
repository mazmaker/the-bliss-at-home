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
  showComparisonTable?: boolean
  className?: string
}

const PayoutScheduleSelector: React.FC<PayoutScheduleSelectorProps> = ({
  value,
  customInterval = 30,
  onScheduleChange,
  onCustomIntervalChange,
  disabled = false,
  showNextPayoutPreview = true,
  showComparisonTable = true,
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

  const getScheduleBadge = (scheduleValue: PayoutSchedule): { text: string; color: string } => {
    switch (scheduleValue) {
      case 'weekly':
        return { text: 'แนะนำ', color: 'bg-green-100 text-green-800' }
      case 'monthly':
        return { text: 'จัดการง่าย', color: 'bg-purple-100 text-purple-800' }
      case 'custom_days':
        return { text: 'ยืดหยุ่น', color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { text: '', color: '' }
    }
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
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-lg">{option.icon}</span>
                    <h3 className="text-sm font-medium text-gray-900">
                      {option.label}
                    </h3>
                    {value === option.value ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        ปัจจุบัน
                      </span>
                    ) : option.isDefault ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        แนะนำ
                      </span>
                    ) : null}
                    {(() => {
                      const badge = getScheduleBadge(option.value)
                      return badge.text ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                          {badge.text}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {option.description}
                  </p>
                  {option.detailedDescription && (
                    <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                      📋 {option.detailedDescription}
                    </p>
                  )}
                  {option.examples && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">ตัวอย่าง:</span> {option.examples}
                      </p>
                    </div>
                  )}
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

      {/* Comparison Table */}
      {showComparisonTable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
            📊 เปรียบเทียบรอบการจ่าย
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="text-left py-2 text-blue-800">รอบ</th>
                  <th className="text-left py-2 text-blue-800">ความถี่</th>
                  <th className="text-left py-2 text-blue-800">กระแสเงิน</th>
                  <th className="text-left py-2 text-blue-800">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-blue-700">
                <tr className="bg-blue-100 rounded">
                  <td className="py-1">ทุกสัปดาห์</td>
                  <td className="py-1">สูงสุด</td>
                  <td className="py-1">ดีที่สุด</td>
                  <td className="py-1">ปานกลาง</td>
                </tr>
                <tr>
                  <td className="py-1">ทุก 2 สัปดาห์</td>
                  <td className="py-1">สูง</td>
                  <td className="py-1">ดี</td>
                  <td className="py-1">ปานกลาง</td>
                </tr>
                <tr>
                  <td className="py-1">รายเดือน</td>
                  <td className="py-1">ต่ำ</td>
                  <td className="py-1">ปานกลาง</td>
                  <td className="py-1">ง่ายที่สุด</td>
                </tr>
                <tr>
                  <td className="py-1">กำหนดเอง</td>
                  <td className="py-1">ยืดหยุ่น</td>
                  <td className="py-1">ตามต้องการ</td>
                  <td className="py-1">กำหนดเอง</td>
                </tr>
              </tbody>
            </table>
          </div>
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