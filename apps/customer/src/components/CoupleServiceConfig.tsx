import { useState } from 'react'
import { useTranslation } from '@bliss/i18n'
import { ChevronDown, User } from 'lucide-react'
import { Database } from '@bliss/supabase'
import { useServices } from '@bliss/supabase/hooks/useServices'
import { useServiceById } from '@bliss/supabase/hooks/useServices'
import { ServiceDurationPicker, getPriceForDuration, getAvailableDurations } from './ServiceDurationPicker'
import { pickLang } from '../utils/serviceUtils'

type Service = Database['public']['Tables']['services']['Row']
type ServiceAddon = Database['public']['Tables']['service_addons']['Row']

interface ServiceWithAddons extends Service {
  addons: ServiceAddon[]
}

interface CoupleServiceConfigProps {
  person1Service: ServiceWithAddons
  person1Duration: number
  person1AddOns: string[]
  person2Service: ServiceWithAddons | null
  person2Duration: number
  person2AddOns: string[]
  onPerson1DurationChange: (duration: number) => void
  onPerson1AddOnsChange: (addonIds: string[]) => void
  onPerson2ServiceChange: (serviceId: string) => void
  onPerson2DurationChange: (duration: number) => void
  onPerson2AddOnsChange: (addonIds: string[]) => void
}

function AddOnList({
  addons,
  selectedIds,
  onChange,
}: {
  addons: ServiceAddon[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const { t, i18n } = useTranslation('booking')

  if (!addons || addons.length === 0) return null

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-medium text-bliss-700">{t('wizard.step1.addons')}</h5>
      <div className="space-y-1.5">
        {addons.map((addon) => {
          const isSelected = selectedIds.includes(addon.id)
          return (
            <button
              key={addon.id}
              onClick={() => {
                onChange(
                  isSelected
                    ? selectedIds.filter((id) => id !== addon.id)
                    : [...selectedIds, addon.id]
                )
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition ${
                isSelected
                  ? 'border-bliss-400 bg-bliss-100'
                  : 'border-bliss-200 hover:border-bliss-300 hover:bg-bliss-100'
              }`}
            >
              <span className="flex items-center gap-2 text-bliss-700">
                {addon.image_url && (
                  <img src={addon.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                )}
                {pickLang(addon, 'name', i18n.language)}
              </span>
              <span className={`font-medium ${isSelected ? 'text-bliss-600' : 'text-bliss-500'}`}>
                +฿{Number(addon.price).toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CoupleServiceConfig({
  person1Service,
  person1Duration,
  person1AddOns,
  person2Service,
  person2Duration,
  person2AddOns,
  onPerson1DurationChange,
  onPerson1AddOnsChange,
  onPerson2ServiceChange,
  onPerson2DurationChange,
  onPerson2AddOnsChange,
}: CoupleServiceConfigProps) {
  const { t, i18n } = useTranslation('booking')
  const { data: allServices } = useServices()
  const [showServicePicker, setShowServicePicker] = useState(false)

  // Person 2 defaults to same service as Person 1 if not yet set
  const p2Svc = person2Service || person1Service
  const p2ServiceId = p2Svc.id

  // Fetch person2's service with add-ons if it differs from person1
  const { data: p2ServiceData } = useServiceById(
    p2Svc.id !== person1Service.id ? p2Svc.id : undefined
  )

  // If person2 chose a different service, use the fetched data for add-ons
  const p2Addons: ServiceAddon[] =
    p2Svc.id !== person1Service.id && p2ServiceData
      ? p2ServiceData.addons
      : person1Service.addons

  const person1Price = getPriceForDuration(person1Service, person1Duration)
  const person1AddonTotal = person1Service.addons
    .filter((a) => person1AddOns.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0)

  const person2Price = getPriceForDuration(p2Svc, person2Duration)
  const person2AddonTotal = p2Addons
    .filter((a) => person2AddOns.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0)

  return (
    <div className="space-y-4">
      {/* Person 1 Card */}
      <div className="border-2 border-bliss-200 rounded-xl overflow-hidden">
        <div className="bg-bliss-100 px-4 py-3 flex items-center gap-2 border-b border-bliss-200">
          <div className="w-7 h-7 bg-bliss-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-bliss-900">{t('wizard.step1.person1')}</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Service name (fixed - main service) */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-bliss-900">{pickLang(person1Service, 'name', i18n.language)}</span>
            <span className="font-bold text-bliss-600">฿{person1Price.toLocaleString()}</span>
          </div>

          {/* Duration picker */}
          <ServiceDurationPicker
            service={person1Service}
            selectedDuration={person1Duration}
            onDurationChange={onPerson1DurationChange}
          />

          {/* Add-ons */}
          <AddOnList
            addons={person1Service.addons}
            selectedIds={person1AddOns}
            onChange={onPerson1AddOnsChange}
          />

          {/* Subtotal */}
          <div className="flex justify-between items-center pt-2 border-t border-bliss-100">
            <span className="text-sm text-bliss-700">{t('wizard.step5.subtotal')}</span>
            <span className="font-semibold text-bliss-900">฿{(person1Price + person1AddonTotal).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Person 2 Card */}
      <div className="border-2 border-bliss-200 rounded-xl overflow-hidden">
        <div className="bg-bliss-100 px-4 py-3 flex items-center gap-2 border-b border-bliss-200">
          <div className="w-7 h-7 bg-bliss-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-bliss-900">{t('wizard.step1.person2')}</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Service selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-bliss-900">{pickLang(p2Svc, 'name', i18n.language)}</span>
              <span className="font-bold text-bliss-600">฿{person2Price.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setShowServicePicker(!showServicePicker)}
              className="text-sm text-bliss-600 hover:text-bliss-700 flex items-center gap-1"
            >
              {t('wizard.step1.changeService')}
              <ChevronDown className={`w-4 h-4 transition ${showServicePicker ? 'rotate-180' : ''}`} />
            </button>

            {showServicePicker && allServices && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-bliss-200 rounded-lg">
                {allServices.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => {
                      onPerson2ServiceChange(svc.id)
                      // Reset person2 add-ons when changing service
                      onPerson2AddOnsChange([])
                      // Auto-select first available duration
                      const durations = getAvailableDurations(svc)
                      onPerson2DurationChange(durations[0])
                      setShowServicePicker(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 text-left text-sm border-b border-bliss-100 last:border-b-0 transition ${
                      svc.id === p2ServiceId
                        ? 'bg-bliss-100 text-bliss-600'
                        : 'hover:bg-bliss-100'
                    }`}
                  >
                    <span className="text-bliss-900">{pickLang(svc, 'name', i18n.language)}</span>
                    <span className="text-bliss-500">฿{Number(svc.base_price).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration picker */}
          <ServiceDurationPicker
            service={p2Svc}
            selectedDuration={person2Duration}
            onDurationChange={onPerson2DurationChange}
          />

          {/* Add-ons */}
          <AddOnList
            addons={p2Addons}
            selectedIds={person2AddOns}
            onChange={onPerson2AddOnsChange}
          />

          {/* Subtotal */}
          <div className="flex justify-between items-center pt-2 border-t border-bliss-100">
            <span className="text-sm text-bliss-700">{t('wizard.step5.subtotal')}</span>
            <span className="font-semibold text-bliss-900">฿{(person2Price + person2AddonTotal).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
