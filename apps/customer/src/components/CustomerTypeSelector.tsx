import { useTranslation } from '@bliss/i18n'
import { User, Users } from 'lucide-react'

type CustomerType = 'single' | 'couple'
type CoupleFormat = 'simultaneous' | 'sequential'

interface CustomerTypeSelectorProps {
  customerType: CustomerType
  coupleFormat: CoupleFormat
  onCustomerTypeChange: (type: CustomerType) => void
  onCoupleFormatChange: (format: CoupleFormat) => void
}

export function CustomerTypeSelector({
  customerType,
  coupleFormat,
  onCustomerTypeChange,
  onCoupleFormatChange,
}: CustomerTypeSelectorProps) {
  const { t } = useTranslation('booking')

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-stone-900">{t('wizard.step1.customerType')}</h4>

      {/* Single / Couple Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onCustomerTypeChange('single')}
          className={`p-4 rounded-xl border-2 text-center transition ${
            customerType === 'single'
              ? 'border-amber-700 bg-amber-50'
              : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
          }`}
        >
          <User className={`w-8 h-8 mx-auto mb-2 ${customerType === 'single' ? 'text-amber-700' : 'text-stone-400'}`} />
          <div className="font-semibold text-stone-900">{t('wizard.step1.single')}</div>
          <div className="text-xs text-stone-500 mt-1">{t('wizard.step1.singleDesc')}</div>
        </button>

        <button
          onClick={() => onCustomerTypeChange('couple')}
          className={`p-4 rounded-xl border-2 text-center transition ${
            customerType === 'couple'
              ? 'border-amber-700 bg-amber-50'
              : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
          }`}
        >
          <Users className={`w-8 h-8 mx-auto mb-2 ${customerType === 'couple' ? 'text-amber-700' : 'text-stone-400'}`} />
          <div className="font-semibold text-stone-900">{t('wizard.step1.couple')}</div>
          <div className="text-xs text-stone-500 mt-1">{t('wizard.step1.coupleDesc')}</div>
        </button>
      </div>

      {/* Couple Format Sub-options */}
      {customerType === 'couple' && (
        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-stone-900">{t('wizard.step1.coupleFormat')}</h4>

          <button
            onClick={() => onCoupleFormatChange('simultaneous')}
            className={`w-full p-4 rounded-xl border-2 text-left transition ${
              coupleFormat === 'simultaneous'
                ? 'border-amber-700 bg-amber-50'
                : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                coupleFormat === 'simultaneous' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5v14" strokeLinecap="round" />
                  <path d="M8 8l-3 4 3 4M16 8l3 4-3 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-900">{t('wizard.step1.simultaneous')}</div>
                <div className="text-sm text-stone-500">{t('wizard.step1.simultaneousDesc')}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                coupleFormat === 'simultaneous' ? 'border-amber-700 bg-amber-700' : 'border-stone-300'
              }`}>
                {coupleFormat === 'simultaneous' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => onCoupleFormatChange('sequential')}
            className={`w-full p-4 rounded-xl border-2 text-left transition ${
              coupleFormat === 'sequential'
                ? 'border-amber-700 bg-amber-50'
                : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                coupleFormat === 'sequential' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 8h14M5 16h14" strokeLinecap="round" />
                  <path d="M15 5l3 3-3 3M15 13l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-900">{t('wizard.step1.sequential')}</div>
                <div className="text-sm text-stone-500">{t('wizard.step1.sequentialDesc')}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                coupleFormat === 'sequential' ? 'border-amber-700 bg-amber-700' : 'border-stone-300'
              }`}>
                {coupleFormat === 'sequential' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
