import React, { useState, useEffect } from 'react'
import {
  getPayoutCountdown,
  PayoutCountdownInfo,
  formatPayoutDate
} from '../types/staff'

interface PayoutCountdownProps {
  nextPayoutDate?: string
  className?: string
  compact?: boolean
}

const PayoutCountdown: React.FC<PayoutCountdownProps> = ({
  nextPayoutDate,
  className = '',
  compact = false
}) => {
  const [countdown, setCountdown] = useState<PayoutCountdownInfo>(() =>
    getPayoutCountdown(nextPayoutDate)
  )

  useEffect(() => {
    if (!nextPayoutDate) return

    const interval = setInterval(() => {
      setCountdown(getPayoutCountdown(nextPayoutDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [nextPayoutDate])

  if (!nextPayoutDate) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <p className="text-bliss-500">ไม่มีข้อมูลวันที่รับเงิน</p>
      </div>
    )
  }

  if (countdown.isDue) {
    return (
      <div className={`text-center p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="animate-pulse text-2xl mb-2 text-red-600 font-bold">$</div>
        <p className="text-lg font-bold text-red-600 mb-1">ถึงกำหนดรับเงินแล้ว!</p>
        <p className="text-sm text-red-600">รอการอนุมัติจากแอดมิน</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-4 bg-gradient-to-r from-bliss-50 to-orange-50 rounded-xl border border-bliss-200 ${className}`}>
        <div className="flex-1">
          <p className="text-sm font-medium text-bliss-900 mb-1">รอบการจ่ายถัดไป</p>
          <p className="text-xs text-bliss-700">{formatPayoutDate(nextPayoutDate)}</p>
        </div>
        <div className="text-right bg-white rounded-lg px-3 py-2 shadow-sm">
          {countdown.isToday ? (
            <div>
              <p className="text-lg font-bold text-green-600">วันนี้!</p>
              <p className="text-xs text-green-500">พร้อมรับเงิน</p>
            </div>
          ) : countdown.isTomorrow ? (
            <div>
              <p className="text-lg font-bold text-bliss-600">พรุ่งนี้</p>
              <p className="text-xs text-bliss-500">เกือบถึงแล้ว</p>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="text-center">
                <p className="text-xl font-bold text-bliss-600">{countdown.days}</p>
                <p className="text-xs text-bliss-500">วัน</p>
              </div>
              {countdown.days <= 7 && (
                <>
                  <span className="text-bliss-400 font-bold">:</span>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-bliss-600">{countdown.hours.toString().padStart(2, '0')}</p>
                    <p className="text-xs text-bliss-500">ชม.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`text-center p-6 bg-gradient-to-br from-bliss-50 to-bliss-50 rounded-xl border border-bliss-200 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <p className="text-lg font-semibold text-bliss-800 mb-1">เวลาถึงรับเงิน</p>
        <p className="text-sm text-bliss-600">{formatPayoutDate(nextPayoutDate)}</p>
      </div>

      {/* Countdown Display */}
      {countdown.isToday ? (
        <div className="py-6">
          <div className="text-4xl mb-2 text-green-600 font-bold">$</div>
          <p className="text-2xl font-bold text-green-600">วันนี้!</p>
          <p className="text-sm text-green-600 mt-1">รอการอนุมัติจากแอดมิน</p>
        </div>
      ) : countdown.isTomorrow ? (
        <div className="py-6">
          <div className="text-4xl mb-2 text-yellow-600 font-bold">•</div>
          <p className="text-2xl font-bold text-yellow-600">พรุ่งนี้</p>
          <p className="text-sm text-yellow-600 mt-1">เตรียมพร้อมรับเงิน</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 py-4">
          {/* Days */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-bliss-600">{countdown.days}</p>
            <p className="text-xs text-bliss-600">วัน</p>
          </div>

          {/* Hours */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-bliss-600">{countdown.hours.toString().padStart(2, '0')}</p>
            <p className="text-xs text-bliss-600">ชม.</p>
          </div>

          {/* Minutes */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-bliss-600">{countdown.minutes.toString().padStart(2, '0')}</p>
            <p className="text-xs text-bliss-600">นาที</p>
          </div>

          {/* Seconds */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-bliss-600">{countdown.seconds.toString().padStart(2, '0')}</p>
            <p className="text-xs text-bliss-600">วินาทีs</p>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {countdown.days <= 7 && !countdown.isToday && !countdown.isDue && (
        <div className="mt-4">
          <div className="bg-bliss-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-bliss-500 to-bliss-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, 100 - (countdown.days / 7) * 100)}%`
              }}
            />
          </div>
          <p className="text-xs text-bliss-500 mt-1">เกือบถึงเวลาแล้ว!</p>
        </div>
      )}

      {/* Encouragement Message */}
      <div className="mt-4 pt-4 border-t border-bliss-200">
        <p className="text-xs text-bliss-600">
          • ทำงานหนักต่อไป เงินจะโอนเข้าบัญชีหลังอนุมัติ
        </p>
      </div>
    </div>
  )
}

export default PayoutCountdown