import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { useCustomerPoints, useLoyaltySettings } from '@bliss/supabase/hooks/useLoyalty'
import { validateRedemption } from '@bliss/supabase/services'

interface PointsRedeemSectionProps {
  customerId: string
  orderAmount: number  // price after promo discount
  onPointsChange: (points: number, discount: number) => void
}

export function PointsRedeemSection({ customerId, orderAmount, onPointsChange }: PointsRedeemSectionProps) {
  const { data: customerPoints } = useCustomerPoints(customerId)
  const { data: settings } = useLoyaltySettings()
  const [inputPoints, setInputPoints] = useState('')
  const [appliedPoints, setAppliedPoints] = useState(0)
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [error, setError] = useState('')

  const availablePoints = customerPoints?.total_points || 0
  const isEnabled = settings?.loyalty_enabled && availablePoints > 0

  // Reset when order amount changes significantly
  useEffect(() => {
    if (appliedPoints > 0 && settings) {
      const validation = validateRedemption(appliedPoints, availablePoints, orderAmount, settings)
      if (!validation.valid || validation.points_to_use !== appliedPoints) {
        handleClear()
      }
    }
  }, [orderAmount])

  const handleApply = () => {
    if (!settings) return
    const points = parseInt(inputPoints)
    if (isNaN(points) || points <= 0) {
      setError('กรุณาใส่จำนวนแต้ม')
      return
    }

    const validation = validateRedemption(points, availablePoints, orderAmount, settings)
    if (!validation.valid) {
      setError(validation.error || 'ไม่สามารถใช้แต้มได้')
      return
    }

    setError('')
    setAppliedPoints(validation.points_to_use)
    setAppliedDiscount(validation.discount_amount)
    onPointsChange(validation.points_to_use, validation.discount_amount)
  }

  const handleUseAll = () => {
    if (!settings) return
    // Calculate max usable points
    const maxDiscount = Math.floor(orderAmount * settings.max_discount_percent / 100)
    const maxPoints = maxDiscount * settings.points_to_baht
    const pointsToUse = Math.min(availablePoints, maxPoints)

    if (pointsToUse < settings.min_redeem_points) {
      setError(`แต้มขั้นต่ำ ${settings.min_redeem_points} แต้ม`)
      return
    }

    const validation = validateRedemption(pointsToUse, availablePoints, orderAmount, settings)
    if (validation.valid) {
      setInputPoints(String(validation.points_to_use))
      setAppliedPoints(validation.points_to_use)
      setAppliedDiscount(validation.discount_amount)
      setError('')
      onPointsChange(validation.points_to_use, validation.discount_amount)
    }
  }

  const handleClear = () => {
    setInputPoints('')
    setAppliedPoints(0)
    setAppliedDiscount(0)
    setError('')
    onPointsChange(0, 0)
  }

  if (!isEnabled || !settings) return null

  const pointsValue = Math.floor(availablePoints / settings.points_to_baht)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-600" />
        <span className="font-medium text-stone-900">ใช้แต้มสะสม</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm text-stone-600">แต้มของคุณ: </span>
            <span className="font-bold text-amber-700">{availablePoints.toLocaleString()} แต้ม</span>
            <span className="text-xs text-stone-500 ml-1">(฿{pointsValue.toLocaleString()})</span>
          </div>
        </div>

        {appliedPoints > 0 ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
            <div>
              <span className="text-green-700 font-medium">ใช้ {appliedPoints.toLocaleString()} แต้ม</span>
              <span className="text-green-600 text-sm ml-2">= ส่วนลด ฿{appliedDiscount.toLocaleString()}</span>
            </div>
            <button onClick={handleClear} className="text-stone-400 hover:text-red-500 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                value={inputPoints}
                onChange={(e) => { setInputPoints(e.target.value); setError('') }}
                placeholder={`ขั้นต่ำ ${settings.min_redeem_points} แต้ม`}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min={settings.min_redeem_points}
                max={availablePoints}
              />
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
              >
                ใช้แต้ม
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUseAll}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium underline"
              >
                ใช้แต้มทั้งหมด
              </button>
              <span className="text-xs text-stone-400">
                (สูงสุด {settings.max_discount_percent}% ของราคา)
              </span>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
