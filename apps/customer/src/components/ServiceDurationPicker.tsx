import { useTranslation } from '@bliss/i18n'
import { Database } from '@bliss/supabase'

type Service = Database['public']['Tables']['services']['Row']

interface ServiceDurationPickerProps {
  service: Service
  selectedDuration: number
  onDurationChange: (duration: number) => void
}

/**
 * Calculate price for a given duration.
 * Uses stored price_60/price_90/price_120 only - no calculations.
 * All services must have proper stored prices configured by Admin.
 */
export function getPriceForDuration(service: Service, duration: number): number {
  // Use stored per-duration prices only
  if (duration === 60 && service.price_60) return service.price_60
  if (duration === 90 && service.price_90) return service.price_90
  if (duration === 120 && service.price_120) return service.price_120

  // If no stored price found, this is a configuration error
  console.error(`❌ Missing stored price for ${duration} min in service: ${service.name_th || service.id}`)
  console.error(`Available prices:`, {
    price_60: service.price_60,
    price_90: service.price_90,
    price_120: service.price_120
  })

  // Fallback to base_price but log as error
  const fallbackPrice = Number(service.base_price || 0)
  console.error(`Using fallback price: ฿${fallbackPrice}`)
  return fallbackPrice
}

export function getAvailableDurations(service: Service): number[] {
  if (service.duration_options && Array.isArray(service.duration_options)) {
    return (service.duration_options as number[]).sort((a, b) => a - b)
  }
  // Fallback: use duration field (in minutes)
  return [service.duration || 60]
}

export function ServiceDurationPicker({
  service,
  selectedDuration,
  onDurationChange,
}: ServiceDurationPickerProps) {
  const { t } = useTranslation('booking')
  const durations = getAvailableDurations(service)

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-stone-900">{t('wizard.step1.duration')}</h4>
      <div className="flex flex-wrap gap-2">
        {durations.map((dur) => {
          const price = getPriceForDuration(service, dur)
          const isSelected = selectedDuration === dur

          return (
            <button
              key={dur}
              onClick={() => onDurationChange(dur)}
              className={`px-4 py-3 rounded-xl border-2 transition text-sm font-medium ${
                isSelected
                  ? 'border-amber-700 bg-amber-50 text-amber-700'
                  : 'border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <span>{t('wizard.step1.minutes', { count: dur })}</span>
              <span className="ml-2 text-xs opacity-75">฿{price.toLocaleString()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
