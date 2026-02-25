import React from 'react'
import { Check, User, Users } from 'lucide-react'
import { ProviderPreference, ProviderPreferenceOption } from '../types/booking'

interface ProviderPreferenceSelectorProps {
  selectedPreference: ProviderPreference
  onPreferenceChange: (preference: ProviderPreference) => void
  className?: string
}

const ProviderPreferenceSelector: React.FC<ProviderPreferenceSelectorProps> = ({
  selectedPreference,
  onPreferenceChange,
  className = ''
}) => {

  const providerOptions: ProviderPreferenceOption[] = [
    {
      value: 'female-only',
      label: 'ผู้หญิงเท่านั้น',
      description: 'เฉพาะผู้ให้บริการหญิง'
    },
    {
      value: 'male-only',
      label: 'ผู้ชายเท่านั้น',
      description: 'เฉพาะผู้ให้บริการชาย'
    },
    {
      value: 'prefer-female',
      label: 'ต้องการผู้หญิง',
      description: 'ต้องการหญิง หากไม่ว่างให้ชายแทน'
    },
    {
      value: 'prefer-male',
      label: 'ต้องการผู้ชาย',
      description: 'ต้องการชาย หากไม่ว่างให้หญิงแทน'
    },
    {
      value: 'no-preference',
      label: 'ไม่ระบุ',
      description: 'ผู้ให้บริการที่ว่างอยู่'
    }
  ]

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-amber-700" />
        <h3 className="text-lg font-semibold text-stone-900">ความต้องการผู้ให้บริการ</h3>
      </div>

      <p className="text-stone-600 text-sm mb-4">
        กรุณาเลือกผู้ให้บริการที่คุณต้องการ
      </p>

      <div className="space-y-3">
        {providerOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onPreferenceChange(option.value)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              selectedPreference === option.value
                ? 'border-amber-700 bg-amber-50 shadow-sm'
                : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-700" />
                  <h4 className="font-semibold text-stone-900">{option.label}</h4>
                </div>
                <p className="text-sm text-stone-600 mt-1 ml-6">{option.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedPreference === option.value
                  ? 'border-amber-700 bg-amber-700'
                  : 'border-stone-300'
              }`}>
                {selectedPreference === option.value && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProviderPreferenceSelector