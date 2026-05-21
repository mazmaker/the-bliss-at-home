/**
 * Earnings Card Component
 * Shows fixed earnings amount set by admin (not calculated from time)
 */

import { DollarSign, Clock } from 'lucide-react'

interface EarningsCardProps {
  serviceDuration?: number // Current service duration in minutes
  fixedEarnings: number // Admin-set fixed earnings
  travelCompensation?: number // Travel compensation if any
  showServiceTime?: boolean // Show current service time
  isServiceActive?: boolean // Is service currently running
}

export function EarningsCard({
  serviceDuration = 0,
  fixedEarnings,
  travelCompensation = 0,
  showServiceTime = true,
  isServiceActive = false
}: EarningsCardProps) {

  const totalEarnings = fixedEarnings + travelCompensation

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}` : `${mins} นาที`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-green-600" />
        <span className="font-medium text-gray-900">รายได้งาน</span>
        {isServiceActive && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            🟢 กำลังทำงาน
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Fixed Earnings - Main amount */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-green-700">รายได้หลัก (ตามที่แอดมินกำหนด)</span>
              <div className="text-xl font-bold text-green-600">
                {fixedEarnings.toLocaleString()} บาท
              </div>
            </div>
            <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              จำนวนคงที่
            </div>
          </div>
        </div>

        {/* Travel Compensation */}
        {travelCompensation > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">ค่าชดเชยการเดินทาง</span>
              <span className="font-medium text-blue-600">+{travelCompensation.toLocaleString()} บาท</span>
            </div>
          </div>
        )}

        {/* Service Time Info */}
        {showServiceTime && isServiceActive && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">เวลาบริการปัจจุบัน</span>
              </div>
              <span className="font-medium text-purple-600">{formatDuration(serviceDuration)}</span>
            </div>
            <div className="text-xs text-purple-600 mt-1">
              * รายได้ไม่ขึ้นอยู่กับเวลา (จำนวนคงที่)
            </div>
          </div>
        )}

        {/* Total Earnings */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">รวมรายได้ทั้งหมด</span>
            <span className="text-2xl font-bold text-green-600">
              {totalEarnings.toLocaleString()} บาท
            </span>
          </div>

          <div className="text-xs text-gray-500 mt-2 text-center">
            {isServiceActive ?
              "💰 จะได้รับหลังจากบริการเสร็จสิ้น" :
              "💳 ตามที่แอดมินกำหนดล่วงหน้า"
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default EarningsCard