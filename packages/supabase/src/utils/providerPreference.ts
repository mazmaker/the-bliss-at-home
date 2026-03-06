/**
 * Provider Preference Utilities
 * Shared labels and badge styles for provider_preference display across all apps
 */

export type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

export function getProviderPreferenceLabel(preference: ProviderPreference | string | null | undefined): string {
  if (!preference || preference === 'no-preference') return 'ไม่ระบุ'
  switch (preference) {
    case 'female-only': return 'ผู้หญิงเท่านั้น'
    case 'male-only': return 'ผู้ชายเท่านั้น'
    case 'prefer-female': return 'ต้องการผู้หญิง'
    case 'prefer-male': return 'ต้องการผู้ชาย'
    default: return 'ไม่ระบุ'
  }
}

export function getProviderPreferenceBadgeStyle(preference: ProviderPreference | string | null | undefined): string {
  if (!preference || preference === 'no-preference') return 'bg-gray-100 text-gray-700'
  switch (preference) {
    case 'female-only': return 'bg-pink-100 text-pink-700'
    case 'male-only': return 'bg-blue-100 text-blue-700'
    case 'prefer-female': return 'bg-pink-50 text-pink-600'
    case 'prefer-male': return 'bg-blue-50 text-blue-600'
    default: return 'bg-gray-100 text-gray-700'
  }
}

/** Returns true if the preference should be visually highlighted (not 'no-preference' or null) */
export function isSpecificPreference(preference: ProviderPreference | string | null | undefined): boolean {
  return !!preference && preference !== 'no-preference'
}

/**
 * Check if a job's provider_preference allows a staff member with the given gender.
 * Only hard requirements (female-only, male-only) are enforced.
 * Soft preferences (prefer-female, prefer-male) allow all genders.
 */
export function isJobMatchingStaffGender(
  preference: ProviderPreference | string | null | undefined,
  staffGender: string | null | undefined
): boolean {
  if (!preference || preference === 'no-preference') return true
  if (preference === 'prefer-female' || preference === 'prefer-male') return true

  // Hard requirements: staff must have matching gender
  if (preference === 'female-only') return staffGender === 'female'
  if (preference === 'male-only') return staffGender === 'male'

  return true
}
