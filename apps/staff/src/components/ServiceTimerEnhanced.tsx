/**
 * Enhanced Service Timer Component
 * Separates travel time from service time for accurate billing
 */

import { useState, useEffect } from 'react'
import { Clock, Car, DollarSign } from 'lucide-react'

interface ServiceTimerEnhancedProps {
  travelStartedAt?: string // ISO timestamp when travel started
  serviceStartedAt?: string // ISO timestamp when service started
  durationMinutes: number // Expected service duration
  fixedEarnings?: number // Fixed earnings amount set by admin
  travelCompensation?: number // Fixed travel compensation
  showBilling?: boolean // Show billing information
}

export function ServiceTimerEnhanced({
  travelStartedAt,
  serviceStartedAt,
  durationMinutes,
  fixedEarnings = 0,
  travelCompensation = 0,
  showBilling = true
}: ServiceTimerEnhancedProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate durations
  const travelDuration = travelStartedAt && serviceStartedAt ?
    Math.floor((new Date(serviceStartedAt).getTime() - new Date(travelStartedAt).getTime()) / (1000 * 60)) :
    travelStartedAt ? Math.floor((currentTime.getTime() - new Date(travelStartedAt).getTime()) / (1000 * 60)) : 0

  const serviceDuration = serviceStartedAt ?
    Math.floor((currentTime.getTime() - new Date(serviceStartedAt).getTime()) / (1000 * 60)) : 0

  const serviceRemaining = serviceStartedAt ?
    Math.max(0, durationMinutes - serviceDuration) : durationMinutes

  const isServiceOvertime = serviceDuration > durationMinutes
  const isServiceActive = !!serviceStartedAt && !serviceStartedAt

  // Use fixed earnings from admin instead of calculating
  const serviceCost = fixedEarnings // Admin-set fixed amount
  const travelCompensationAmount = travelCompensation // Pre-calculated travel compensation

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}` : `${mins} นาที`
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getServiceColor = () => {
    if (!serviceStartedAt) return 'gray'
    if (isServiceOvertime) return 'red'
    if (serviceRemaining < 5) return 'amber'
    return 'violet'
  }

  const serviceColor = getServiceColor()

  return (
    <div className="space-y-4">
      {/* Travel Time Display */}
      {travelStartedAt && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">เวลาเดินทาง</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(travelDuration)}
              </div>
              <div className="text-sm text-blue-600">
                {new Date(travelStartedAt).toLocaleTimeString('th-TH')}
                {serviceStartedAt && ` - ${new Date(serviceStartedAt).toLocaleTimeString('th-TH')}`}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-blue-600">เวลาเดินทาง</div>
              {showBilling && (
                <div className="text-xs text-blue-500">
                  ค่าชดเชย: {travelCompensationAmount} บาท
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service Time Display */}
      <div className={`bg-${serviceColor}-50 border border-${serviceColor}-200 rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-5 h-5 text-${serviceColor}-600`} />
          <span className={`font-medium text-${serviceColor}-900`}>
            เวลาบริการ
          </span>
          {!serviceStartedAt && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              ยังไม่เริ่ม
            </span>
          )}
        </div>

        {serviceStartedAt ? (
          <div className="space-y-3">
            {/* Service Duration */}
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold text-${serviceColor}-600`}>
                  {formatDuration(serviceDuration)}
                  {isServiceOvertime && (
                    <span className="text-red-500 ml-1">(เกิน)</span>
                  )}
                </div>
                <div className={`text-sm text-${serviceColor}-600`}>
                  เริ่ม: {new Date(serviceStartedAt).toLocaleTimeString('th-TH')}
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm text-${serviceColor}-600`}>
                  {isServiceActive ? '🟢 กำลังให้บริการ' : 'นับเวลาบริการ'}
                </div>
                <div className={`text-xs text-${serviceColor}-500`}>
                  เหลือ: {formatDuration(serviceRemaining)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full bg-${serviceColor}-600 transition-all duration-1000 ease-linear`}
                style={{
                  width: `${Math.min(100, (serviceDuration / durationMinutes) * 100)}%`
                }}
              />
            </div>

            {/* Overtime Warning */}
            {isServiceOvertime && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 text-xs font-medium animate-pulse">
                    ⚠️ เกินเวลาที่กำหนด {serviceDuration - durationMinutes} นาที
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-400 text-lg mb-2">⏳</div>
            <div className="text-gray-600 text-sm">ยังไม่เริ่มให้บริการ</div>
            <div className="text-gray-500 text-xs">
              จะเริ่มนับเวลาเมื่อเริ่มงาน
            </div>
          </div>
        )}
      </div>

      {/* Billing Summary */}
      {showBilling && serviceStartedAt && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">ค่าบริการ</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>รายได้งาน (ตามที่แอดมินกำหนด)</span>
              <span>{serviceCost.toLocaleString()} บาท</span>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>เวลาบริการ: {formatDuration(serviceDuration)}</span>
              <span>จำนวนคงที่</span>
            </div>

            {travelCompensationAmount > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>ค่าชดเชยการเดินทาง</span>
                <span>+{travelCompensationAmount.toLocaleString()} บาท</span>
              </div>
            )}

            <hr />

            <div className="flex justify-between font-bold">
              <span>รวมรายได้</span>
              <span className="text-green-600">
                {(serviceCost + travelCompensationAmount).toLocaleString()} บาท
              </span>
            </div>

            {isServiceActive && (
              <div className="text-xs text-gray-500 text-center">
                * คำนวณแบบ real-time ตามเวลาจริง
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceTimerEnhanced