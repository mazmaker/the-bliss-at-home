import React from 'react'
import {
  PayoutSchedule,
  PayoutScheduleSummary,
  getPayoutScheduleLabel,
  getPayoutScheduleOption,
  getDaysUntilPayout,
  isPayoutDue
} from '../types/staff'

interface PayoutScheduleCardProps {
  staffId: string
  staffName: string
  payoutSchedule: PayoutSchedule
  customPayoutInterval?: number
  nextPayoutDate?: string
  lastPayoutProcessedAt?: string
  onEditSchedule?: (staffId: string) => void
  onProcessPayout?: (staffId: string) => void
  compact?: boolean
  showActions?: boolean
  className?: string
}

const PayoutScheduleCard: React.FC<PayoutScheduleCardProps> = ({
  staffId,
  staffName,
  payoutSchedule,
  customPayoutInterval,
  nextPayoutDate,
  lastPayoutProcessedAt,
  onEditSchedule,
  onProcessPayout,
  compact = false,
  showActions = true,
  className = ''
}) => {
  const scheduleOption = getPayoutScheduleOption(payoutSchedule)
  const scheduleLabel = getPayoutScheduleLabel(payoutSchedule, customPayoutInterval)
  const daysUntil = getDaysUntilPayout(nextPayoutDate)
  const isDue = isPayoutDue(nextPayoutDate)

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  const getPayoutStatus = () => {
    if (!nextPayoutDate) return { label: 'ไม่ระบุ', color: 'gray' }

    if (isDue) {
      return { label: 'ถึงกำหนดจ่าย', color: 'red' }
    }

    if (daysUntil <= 3) {
      return { label: `อีก ${daysUntil} วัน`, color: 'yellow' }
    }

    return { label: `อีก ${daysUntil} วัน`, color: 'green' }
  }

  const payoutStatus = getPayoutStatus()

  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-lg">{scheduleOption?.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{staffName}</p>
              <p className="text-xs text-gray-500">{scheduleLabel}</p>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              payoutStatus.color === 'red' ? 'bg-red-100 text-red-800' :
              payoutStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
              payoutStatus.color === 'green' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {payoutStatus.label}
            </span>
            <p className="text-xs text-gray-400 mt-1">{formatDate(nextPayoutDate)}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-2xl">{scheduleOption?.icon}</div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{staffName}</h3>
            <p className="text-sm text-gray-600 mt-1">{scheduleLabel}</p>

            {scheduleOption?.description && (
              <p className="text-xs text-gray-500 mt-1">
                {scheduleOption.description}
              </p>
            )}
          </div>
        </div>

        <div className="text-right ml-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            payoutStatus.color === 'red' ? 'bg-red-100 text-red-800' :
            payoutStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            payoutStatus.color === 'green' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {payoutStatus.label}
          </span>
        </div>
      </div>

      {/* Payout details */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-gray-500">จ่ายครั้งถัดไป</dt>
            <dd className="text-gray-900 font-medium">{formatDate(nextPayoutDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">จ่ายครั้งล่าสุด</dt>
            <dd className="text-gray-900 font-medium">{formatDate(lastPayoutProcessedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Custom interval display for custom_days */}
      {payoutSchedule === 'custom_days' && customPayoutInterval && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center space-x-1">
            <span className="text-yellow-600">⚙️</span>
            <span className="text-xs text-yellow-700 font-medium">
              รอบกำหนดเอง: {customPayoutInterval} วัน
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-4 flex items-center justify-end space-x-2">
          {onEditSchedule && (
            <button
              onClick={() => onEditSchedule(staffId)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              แก้ไขรอบ
            </button>
          )}

          {isDue && onProcessPayout && (
            <button
              onClick={() => onProcessPayout(staffId)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              จ่ายเงิน
            </button>
          )}
        </div>
      )}

      {/* Due indicator */}
      {isDue && (
        <div className="mt-3 flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded">
          <span className="text-red-600">🚨</span>
          <span className="text-sm text-red-700 font-medium">
            ถึงกำหนดจ่ายเงินแล้ว
          </span>
        </div>
      )}
    </div>
  )
}

export default PayoutScheduleCard