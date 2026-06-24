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
        return { text: 'แนะนำ', color: 'bg-bliss-100 text-bliss-800' }
      case 'monthly':
        return { text: 'จัดการง่าย', color: 'bg-bliss-100 text-bliss-800' }
      case 'custom_days':
        return { text: 'ยืดหยุ่น', color: 'bg-bliss-100 text-bliss-800' }
      default:
        return { text: '', color: '' }
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-bliss-700 mb-3">
          รอบการจ่ายเงิน
        </label>

        <div className="grid grid-cols-1 gap-3">
          {PAYOUT_SCHEDULE_OPTIONS.map((option: PayoutScheduleOption) => (
            <div key={option.value} className="relative">
              <label className={`flex items-start space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                value === option.value
                  ? 'border-bliss-500 bg-bliss-50'
                  : 'border-bliss-200 hover:border-bliss-300 hover:bg-bliss-50'
              }`}>
                <input
                  type="radio"
                  name="payout-schedule"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onScheduleChange(e.target.value as PayoutSchedule)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm font-bold text-bliss-700 bg-bliss-100 px-2 py-0.5 rounded-md whitespace-nowrap">{option.icon}</span>
                    <h3 className="text-sm font-semibold text-bliss-900">
                      {option.label}
                    </h3>
                    {value === option.value ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-bliss-600 text-white">
                        ปัจจุบัน
                      </span>
                    ) : option.isDefault ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bliss-100 text-bliss-800">
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
                  <p className="mt-1 text-sm text-bliss-500">
                    {option.description}
                  </p>
                  {option.detailedDescription && (
                    <p className="mt-2 text-xs text-bliss-600 leading-relaxed">
                      {option.detailedDescription}
                    </p>
                  )}
                  {option.examples && (
                    <div className="mt-2 p-2 bg-bliss-50 rounded-md">
                      <p className="text-xs text-bliss-600">
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
        <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-bliss-700 mb-2">
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
              className="block w-24 rounded-md border-bliss-300 shadow-sm focus:border-bliss-500 focus:ring-bliss-500 sm:text-sm"
            />
            <span className="text-sm text-bliss-600">วัน</span>
          </div>
          <p className="mt-1 text-xs text-bliss-500">
            ระบุจำนวนวันระหว่างการจ่าย (1-90 วัน)
          </p>
        </div>
      )}

      {/* Next payout preview */}
      {showNextPayoutPreview && (
        <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-bliss-600">•</span>
            <h4 className="text-sm font-medium text-bliss-800">
              วันที่จ่ายครั้งถัดไป (ตัวอย่าง)
            </h4>
          </div>
          <p className="mt-1 text-sm text-bliss-700">
            {getNextPayoutPreview()}
          </p>
          <p className="mt-1 text-xs text-bliss-600">
            *คำนวณจากวันที่ปัจจุบัน
          </p>
        </div>
      )}

      {/* Comparison Table */}
      {showComparisonTable && (
        <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-bliss-900 mb-3 flex items-center gap-2">
            เปรียบเทียบรอบการจ่าย
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bliss-200">
                  <th className="text-left py-2 text-bliss-800">รอบ</th>
                  <th className="text-left py-2 text-bliss-800">ความถี่</th>
                  <th className="text-left py-2 text-bliss-800">กระแสเงิน</th>
                  <th className="text-left py-2 text-bliss-800">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-bliss-700">
                <tr className="bg-bliss-100 rounded">
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
        <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-3">
          <div className="text-xs text-bliss-500">
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