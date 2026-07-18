import { Plus, Check } from 'lucide-react'
import { ServiceAddon } from '../types/booking'

interface AddOnSelectorProps {
  addons: ServiceAddon[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/**
 * P5 STEP C — hotel add-on picker (per recipient).
 * Mirrors the customer AddOnList (CoupleServiceConfig) but hardcoded Thai (the hotel
 * app uses no i18n) and reads name_th directly. Add-ons are a flat retail pass-through:
 * price shown = full catalog price (NO hotel discount), and they never affect staff earnings.
 */
function AddOnSelector({ addons, selectedIds, onChange, disabled = false }: AddOnSelectorProps) {
  if (!addons || addons.length === 0) return null

  const toggle = (id: string) => {
    if (disabled) return
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    )
  }

  return (
    <div className="mt-4 space-y-2">
      <h5 className="text-sm font-semibold text-bliss-800">บริการเสริม (ถ้าต้องการ)</h5>
      <div className="space-y-1.5">
        {addons.map((addon) => {
          const isSelected = selectedIds.includes(addon.id)
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => toggle(addon.id)}
              disabled={disabled}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition ${
                isSelected
                  ? 'border-[#565b34] bg-[#ebe6d0]/40'
                  : 'border-bliss-200 hover:border-[#565b34]/50 hover:bg-[#ebe6d0]/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="flex items-center gap-2 text-bliss-800">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#565b34]' : 'bg-bliss-100 border border-bliss-300'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <Plus className="w-3 h-3 text-bliss-500" />
                  )}
                </span>
                {addon.image_url && (
                  <img src={addon.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                )}
                {addon.name_th}
              </span>
              <span className={`font-medium ${isSelected ? 'text-[#565b34]' : 'text-bliss-500'}`}>
                +฿{Number(addon.price).toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AddOnSelector
