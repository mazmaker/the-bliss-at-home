import { Clock, User, Users, Receipt } from 'lucide-react'
import { BookingConfiguration, ServiceSelection } from '../types/booking'

interface PricingSummaryProps {
  configuration: BookingConfiguration
  showDetails?: boolean
  compact?: boolean
}

function PricingSummary({ configuration, showDetails = true, compact = false }: PricingSummaryProps) {
  const { mode, coupleFormat, selections, totalDuration, totalPrice, recipientCount } = configuration

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชั่วโมง`
    }
    return `${mins} นาที`
  }

  const getFormatDescription = () => {
    if (mode === 'single') return 'บริการเดี่ยว'
    if (coupleFormat === 'simultaneous') return 'บริการพร้อมกัน (2 ผู้ให้บริการ)'
    if (coupleFormat === 'sequential') return 'บริการทีละท่าน (1 ผู้ให้บริการ)'
    return 'ยังไม่ได้เลือกรูปแบบ'
  }

  const getServicesByRecipient = () => {
    const byRecipient: { [key: number]: ServiceSelection[] } = {}
    selections.forEach(selection => {
      if (!byRecipient[selection.recipientIndex]) {
        byRecipient[selection.recipientIndex] = []
      }
      byRecipient[selection.recipientIndex].push(selection)
    })
    return byRecipient
  }

  if (selections.length === 0) {
    return (
      <div className="bg-gradient-to-br from-stone-50 to-stone-100 border-2 border-stone-200 rounded-xl p-6 text-center shadow-sm">
        <Receipt className="w-10 h-10 text-stone-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-stone-600">ยังไม่ได้เลือกบริการ</p>
      </div>
    )
  }

  return (
    <div className={`
      bg-white border-2 border-[#d29b25]/30 rounded-xl overflow-hidden shadow-lg
      ${compact ? 'p-4' : 'p-6'}
    `}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-[#d29b25] to-[#d29b25]/90 rounded-full flex items-center justify-center shadow-md">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className={`font-semibold text-stone-900 ${compact ? 'text-base' : 'text-lg'}`}>
            สรุปการจอง
          </h3>
          <p className="text-sm text-stone-600">
            {getFormatDescription()}
          </p>
        </div>
      </div>

      {/* Service Details */}
      {showDetails && (
        <div className="space-y-4 mb-6">
          {Object.entries(getServicesByRecipient()).map(([recipientIndex, recipientServices]) => (
            <div key={recipientIndex} className="space-y-2">
              {/* Recipient header */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#b6d387] rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-stone-800">
                  {recipientServices[0]?.recipientName || `ผู้รับบริการ ${parseInt(recipientIndex) + 1}`}
                </span>
              </div>

              {/* Services for this recipient */}
              {recipientServices.map((selection) => (
                <div key={selection.id} className="ml-8 bg-gradient-to-r from-[#ffe79d]/20 to-[#ffe79d]/10 border border-[#ffe79d]/30 rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-stone-900 text-sm mb-1">
                        {selection.service.name_th}
                      </h5>
                      <div className="flex items-center gap-3 text-xs text-stone-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{selection.duration} นาที</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#d29b25]">
                        ฿{selection.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Summary section */}
      <div className="border-t border-stone-100 pt-4 space-y-3">
        {/* Duration summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600" />
            <span className="text-sm text-stone-700">เวลารวม</span>
          </div>
          <span className="text-sm font-medium text-stone-900">
            {formatDuration(totalDuration)}
          </span>
        </div>

        {/* Staff and Recipients for simultaneous - separated */}
        {mode === 'couple' && coupleFormat === 'simultaneous' ? (
          <>
            {/* ผู้ให้บริการ 1 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-stone-600" />
                <span className="text-sm text-stone-700">ผู้ให้บริการ 1</span>
              </div>
              <span className="text-sm font-medium text-stone-900">
                ใช้เวลา {formatDuration(selections.find(s => s.recipientIndex === 0)?.duration || 0)}
              </span>
            </div>

            {/* ผู้ให้บริการ 2 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-600" />
                <span className="text-sm text-stone-700">ผู้ให้บริการ 2</span>
              </div>
              <span className="text-sm font-medium text-stone-900">
                ใช้เวลา {formatDuration(selections.find(s => s.recipientIndex === 1)?.duration || 0)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recipientCount === 1 ? (
                <User className="w-4 h-4 text-stone-600" />
              ) : (
                <Users className="w-4 h-4 text-stone-600" />
              )}
              <span className="text-sm text-stone-700">จำนวนผู้รับบริการ</span>
            </div>
            <span className="text-sm font-medium text-stone-900">
              {recipientCount} ท่าน
            </span>
          </div>
        )}

        {/* Services count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-700">จำนวนบริการ</span>
          <span className="text-sm font-medium text-stone-900">
            {selections.length} บริการ
          </span>
        </div>

        {/* Total price */}
        <div className="border-t border-[#d29b25]/20 pt-3">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#ffe79d]/30 to-[#ffe79d]/20 rounded-lg p-3">
            <span className={`font-bold text-stone-900 ${compact ? 'text-base' : 'text-lg'}`}>
              ยอดรวม
            </span>
            <span className={`font-extrabold text-[#d29b25] ${compact ? 'text-xl' : 'text-2xl'} drop-shadow-sm`}>
              ฿{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Special pricing note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <span className="font-medium">ราคาพิเศษ:</span> ราคาที่แสดงเป็นราคาพิเศษสำหรับโรงแรม
          </p>
        </div>
      </div>
    </div>
  )
}

export default PricingSummary