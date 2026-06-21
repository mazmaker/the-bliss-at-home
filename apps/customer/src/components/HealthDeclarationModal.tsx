/**
 * Health Declaration (ข้อควรระวังและข้อมูลสุขภาพก่อนรับบริการ)
 *
 * - HealthChecklistFields: reusable checklist (used in Register form + modal)
 * - HealthDeclarationModal: modal wrapper (booking gate for old customers + edit from Profile)
 *
 * Rule: customer must check at least one condition (or "no condition")
 * plus the confirmation checkbox before submitting.
 */

import { useState } from 'react'
import { HeartPulse, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '@bliss/supabase'
import { useTranslation } from '@bliss/i18n'

export const HEALTH_CONDITIONS = [
  { key: 'heart_disease', label: 'โรคหัวใจ', i18nKey: 'booking:healthDeclaration.conditions.heartDisease' },
  { key: 'blood_pressure', label: 'โรคความดันโลหิต (สูง / ต่ำ)', i18nKey: 'booking:healthDeclaration.conditions.bloodPressure' },
  { key: 'diabetes', label: 'โรคเบาหวาน', i18nKey: 'booking:healthDeclaration.conditions.diabetes' },
  { key: 'pregnancy', label: 'อยู่ระหว่างการตั้งครรภ์', i18nKey: 'booking:healthDeclaration.conditions.pregnancy' },
  { key: 'post_surgery', label: 'อยู่ระหว่างการพักฟื้นจากการผ่าตัด หรือมีแผลผ่าตัดที่ยังไม่หายดี', i18nKey: 'booking:healthDeclaration.conditions.postSurgery' },
  { key: 'skin_disease', label: 'โรคผิวหนัง', i18nKey: 'booking:healthDeclaration.conditions.skinDisease' },
  { key: 'other', label: 'อื่น ๆ (โปรดระบุ)', i18nKey: 'booking:healthDeclaration.conditions.other' },
] as const

export const HEALTH_CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  HEALTH_CONDITIONS.map((c) => [c.key, c.label])
)

export interface HealthFormState {
  conditions: string[]
  otherDetail: string
  hasNoCondition: boolean
  confirmed: boolean
}

export interface HealthDeclaration {
  conditions: string[]
  other_detail: string | null
  has_no_condition: boolean
}

export function createEmptyHealthForm(initial?: HealthDeclaration | null): HealthFormState {
  return {
    conditions: initial?.conditions || [],
    otherDetail: initial?.other_detail || '',
    hasNoCondition: initial?.has_no_condition || false,
    confirmed: false,
  }
}

export function isHealthFormValid(form: HealthFormState): boolean {
  const hasAnySelection = form.hasNoCondition || form.conditions.length > 0
  const otherNeedsDetail = form.conditions.includes('other') && !form.otherDetail.trim()
  return hasAnySelection && form.confirmed && !otherNeedsDetail
}

export async function fetchHealthDeclaration(customerId: string): Promise<HealthDeclaration | null> {
  // Table not in generated Database types yet — cast like other call sites do
  const { data, error } = await (supabase as any)
    .from('customer_health_declarations')
    .select('conditions, other_detail, has_no_condition')
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch health declaration:', error)
    return null
  }
  return data as HealthDeclaration | null
}

export async function saveHealthDeclaration(
  customerId: string,
  form: HealthFormState
): Promise<{ success: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from('customer_health_declarations')
    .upsert(
      {
        customer_id: customerId,
        conditions: form.conditions,
        other_detail: form.conditions.includes('other') ? form.otherDetail.trim() : null,
        has_no_condition: form.hasNoCondition,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    )

  if (error) {
    console.error('Failed to save health declaration:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ============================================
// Reusable checklist fields (controlled)
// ============================================

interface HealthChecklistFieldsProps {
  value: HealthFormState
  onChange: (next: HealthFormState) => void
  disabled?: boolean
}

export function HealthChecklistFields({ value, onChange, disabled }: HealthChecklistFieldsProps) {
  const { t } = useTranslation()
  const toggleCondition = (key: string) => {
    const has = value.conditions.includes(key)
    const conditions = has
      ? value.conditions.filter((k) => k !== key)
      : [...value.conditions, key]
    onChange({
      ...value,
      conditions,
      // Selecting any condition clears the exclusive "no condition" choice
      hasNoCondition: conditions.length > 0 ? false : value.hasNoCondition,
    })
  }

  const toggleNoCondition = () => {
    const next = !value.hasNoCondition
    onChange({
      ...value,
      hasNoCondition: next,
      // "No condition" is exclusive — clear all condition checkboxes
      conditions: next ? [] : value.conditions,
      otherDetail: next ? '' : value.otherDetail,
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {t('booking:healthDeclaration.intro')}
      </p>

      {/* Condition checkboxes */}
      <div className="space-y-2">
        {HEALTH_CONDITIONS.map((condition) => (
          <div key={condition.key}>
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                value.conditions.includes(condition.key)
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={value.conditions.includes(condition.key)}
                onChange={() => toggleCondition(condition.key)}
                disabled={disabled}
                className="w-4 h-4 mt-0.5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-sm text-stone-800">{t(condition.i18nKey)}</span>
            </label>
            {condition.key === 'other' && value.conditions.includes('other') && (
              <input
                type="text"
                value={value.otherDetail}
                onChange={(e) => onChange({ ...value, otherDetail: e.target.value })}
                placeholder={t('booking:healthDeclaration.otherDetailPlaceholder')}
                disabled={disabled}
                className="mt-2 w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            )}
          </div>
        ))}
      </div>

      {/* Exclusive: no condition */}
      <label
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
          value.hasNoCondition
            ? 'border-green-500 bg-green-50'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <input
          type="checkbox"
          checked={value.hasNoCondition}
          onChange={toggleNoCondition}
          disabled={disabled}
          className="w-4 h-4 mt-0.5 text-green-700 rounded focus:ring-2 focus:ring-green-500"
        />
        <span className="text-sm font-medium text-stone-800">
          {t('booking:healthDeclaration.noCondition')}
        </span>
      </label>

      {/* Confirmation */}
      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm font-semibold text-stone-900 mb-2">{t('booking:healthDeclaration.confirmationSectionTitle')}</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.confirmed}
            onChange={(e) => onChange({ ...value, confirmed: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 mt-0.5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-sm text-stone-700">
            {t('booking:healthDeclaration.confirmAccuracy')}
            <span className="block text-xs text-stone-500 mt-1">
              ({t('booking:healthDeclaration.confirmAdjustment')})
            </span>
          </span>
        </label>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-stone-500">
          {t('booking:healthDeclaration.privacyNote')}
        </p>
      </div>
    </div>
  )
}

// ============================================
// Modal wrapper (booking gate + Profile edit)
// ============================================

interface HealthDeclarationModalProps {
  customerId: string
  onCompleted: (declaration: HealthDeclaration) => void
  onClose?: () => void
  /** Existing declaration when editing */
  initial?: HealthDeclaration | null
}

export function HealthDeclarationModal({
  customerId,
  onCompleted,
  onClose,
  initial,
}: HealthDeclarationModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<HealthFormState>(() => createEmptyHealthForm(initial))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = isHealthFormValid(form) && !isSaving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSaving(true)
    setError(null)

    const result = await saveHealthDeclaration(customerId, form)
    setIsSaving(false)

    if (!result.success) {
      setError(t('booking:healthDeclaration.saveError'))
      return
    }

    onCompleted({
      conditions: form.conditions,
      other_detail: form.conditions.includes('other') ? form.otherDetail.trim() : null,
      has_no_condition: form.hasNoCondition,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-5 h-5 text-amber-700" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              {t('booking:healthDeclaration.title')}
            </h2>
          </div>
        </div>

        <div className="px-6 py-4">
          <HealthChecklistFields value={form} onChange={setForm} disabled={isSaving} />

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2" role="alert">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-6 py-4 rounded-b-2xl flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50"
            >
              {t('common:buttons.cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('booking:healthDeclaration.saving')}</span>
              </>
            ) : (
              t('booking:healthDeclaration.confirmData')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HealthDeclarationModal
