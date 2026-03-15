import { useState } from 'react'
import { useTranslation } from '@bliss/i18n'
import { Tag, X, CheckCircle, Loader2 } from 'lucide-react'
import { useValidatePromoCode } from '@bliss/supabase/hooks/usePromotions'
import { PromoValidationResult } from '@bliss/supabase'

interface VoucherCodeInputProps {
  orderAmount: number
  userId: string
  serviceIds: string[]
  categories: string[]
  appliedPromo: PromoValidationResult | null
  onApply: (result: PromoValidationResult) => void
  onRemove: () => void
}

export function VoucherCodeInput({
  orderAmount,
  userId,
  serviceIds,
  categories,
  appliedPromo,
  onApply,
  onRemove,
}: VoucherCodeInputProps) {
  const { t } = useTranslation('booking')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const validatePromo = useValidatePromoCode()

  const handleApply = async () => {
    if (!code.trim()) return

    setError(null)
    try {
      const result = await validatePromo.mutateAsync({
        code: code.trim(),
        orderAmount,
        userId,
        serviceIds,
        categories,
      })

      if (result.valid) {
        onApply(result)
        setError(null)
      } else {
        setError(result.errorKey ? t(`wizard.step5.${result.errorKey}`, { amount: (result.promotion as any)?.min_order_amount }) : t('wizard.step5.voucherInvalid'))
      }
    } catch {
      setError(t('wizard.step5.voucherInvalid'))
    }
  }

  const handleRemove = () => {
    setCode('')
    setError(null)
    onRemove()
  }

  // Show applied state
  if (appliedPromo?.valid) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-stone-900 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          {t('wizard.step5.voucher')}
        </h4>
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <span className="font-medium text-green-700">{appliedPromo.promotion?.code}</span>
              <span className="text-sm text-green-600 ml-2">-฿{appliedPromo.discountAmount.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-stone-400 hover:text-stone-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-stone-900 flex items-center gap-2">
        <Tag className="w-4 h-4" />
        {t('wizard.step5.voucher')}
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          placeholder={t('wizard.step5.voucherPlaceholder')}
          className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply()
          }}
        />
        <button
          onClick={handleApply}
          disabled={!code.trim() || validatePromo.isPending}
          className="px-5 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:bg-stone-300 disabled:cursor-not-allowed text-sm flex items-center gap-1"
        >
          {validatePromo.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('wizard.step5.apply')
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
