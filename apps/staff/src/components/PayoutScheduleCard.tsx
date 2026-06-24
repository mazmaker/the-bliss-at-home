import React from 'react'
import {
  PayoutSchedule,
  StaffPayoutInfo,
  getPayoutDisplayInfo,
  formatPayoutDate,
  getDaysUntilPayout,
  isPayoutDue
} from '../types/staff'

interface PayoutScheduleCardProps {
  payoutInfo: StaffPayoutInfo
  className?: string
  showDetails?: boolean
}

const PayoutScheduleCard: React.FC<PayoutScheduleCardProps> = ({
  payoutInfo,
  className = '',
  showDetails = true
}) => {
  const displayInfo = getPayoutDisplayInfo(
    payoutInfo.payout_schedule,
    payoutInfo.custom_payout_interval
  )

  const daysUntil = getDaysUntilPayout(payoutInfo.next_payout_date)
  const isDue = isPayoutDue(payoutInfo.next_payout_date)

  const getPayoutStatusMessage = () => {
    if (isDue) {
      return {
        message: 'ถึงกำหนดรับเงินแล้ว!',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }

    if (daysUntil === 0) {
      return {
        message: 'รับเงินวันนี้',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    if (daysUntil === 1) {
      return {
        message: 'รับเงินพรุ่งนี้',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    }

    if (daysUntil <= 7) {
      return {
        message: `อีก ${daysUntil} วัน`,
        color: 'text-bliss-600',
        bgColor: 'bg-bliss-50',
        borderColor: 'border-bliss-200'
      }
    }

    return {
      message: `อีก ${daysUntil} วัน`,
      color: 'text-bliss-600',
      bgColor: 'bg-bliss-50',
      borderColor: 'border-bliss-200'
    }
  }

  const statusInfo = getPayoutStatusMessage()

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-bliss-100">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-bliss-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg text-bliss-600">•</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-bliss-900 text-lg truncate">{displayInfo.title}</h3>
                <p className="text-sm text-bliss-600 mt-1">{displayInfo.description}</p>
              </div>
            </div>

            {/* Badge moved below to avoid overlap */}
            <div className="mt-2">
              <div className="inline-block bg-bliss-50 border border-bliss-200 px-3 py-1 rounded-lg">
                <span className="text-sm font-semibold text-bliss-700">{displayInfo.frequency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={`p-4 ${statusInfo.bgColor} ${statusInfo.borderColor} border-l-4`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isDue ? 'bg-red-500 animate-pulse' : daysUntil <= 1 ? 'bg-yellow-500' : 'bg-bliss-500'}`}></div>
              <p className={`font-semibold text-lg ${statusInfo.color}`}>
                {statusInfo.message}
              </p>
            </div>
            {payoutInfo.next_payout_date && (
              <p className="text-sm text-bliss-700 mt-2 ml-5">
                • {formatPayoutDate(payoutInfo.next_payout_date)}
              </p>
            )}
          </div>

          {isDue && (
            <div className="text-right">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xl text-red-600 font-bold">$</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="p-4 bg-bliss-50 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-bliss-500">รอบปัจจุบัน:</span>
              <p className="font-medium text-bliss-900">{displayInfo.title}</p>
            </div>
            <div>
              <span className="text-bliss-500">ความถี่:</span>
              <p className="font-medium text-bliss-900">{displayInfo.frequency}</p>
            </div>
          </div>

          {payoutInfo.last_payout_processed_at && (
            <div className="pt-2 border-t border-bliss-200">
              <span className="text-bliss-500 text-sm">รับเงินครั้งล่าสุด:</span>
              <p className="font-medium text-bliss-900 text-sm">
                {formatPayoutDate(payoutInfo.last_payout_processed_at)}
              </p>
            </div>
          )}

          {/* Custom interval info */}
          {payoutInfo.payout_schedule === 'custom_days' && payoutInfo.custom_payout_interval && (
            <div className="pt-2 border-t border-bliss-200">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 font-bold">•</span>
                <span className="text-sm text-bliss-700">
                  กำหนดรับเงินทุก {payoutInfo.custom_payout_interval} วัน
                </span>
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="pt-2 border-t border-bliss-200">
            <p className="text-xs text-bliss-500">
              • เงินจะถูกโอนเข้าบัญชีหลังจากแอดมินอนุมัติ
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutScheduleCard