/**
 * Billing Settings Service
 * Service to fetch and cache billing settings from the database
 */

import { supabase } from '@bliss/supabase/auth'

// Types
export interface BillingSettings {
  id: string
  due_day_type: 'fixed_day' | 'month_end' | 'business_days_after'
  due_day_value: number
  due_months_after: number
  due_soon_days: number
  overdue_days: number
  warning_days: number
  urgent_days: number
  enable_late_fee: boolean
  late_fee_type: 'percentage_per_day' | 'fixed_per_day'
  late_fee_percentage: number
  late_fee_fixed_amount: number
  admin_contact_phone?: string
  admin_contact_email?: string
  admin_contact_line_id?: string
  due_soon_message?: string
  overdue_message?: string
  warning_message?: string
  urgent_message?: string
  auto_email_reminder: boolean
  auto_line_reminder: boolean
  reminder_frequency_days: number
  bank_transfer_enabled: boolean
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  cash_payment_enabled: boolean
  office_address?: string
  office_hours?: string
  check_payment_enabled: boolean
  check_payable_to?: string
  check_mailing_address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Default settings (fallback if database query fails)
const DEFAULT_BILLING_SETTINGS: Partial<BillingSettings> = {
  due_day_type: 'fixed_day',
  due_day_value: 15,
  due_months_after: 1,
  due_soon_days: 7,
  overdue_days: 7,
  warning_days: 15,
  urgent_days: 15,
  enable_late_fee: false,
  late_fee_type: 'percentage_per_day',
  late_fee_percentage: 0.1,
  late_fee_fixed_amount: 50,
  admin_contact_phone: '02-123-4567',
  admin_contact_email: 'admin@theblissathome.com',
  admin_contact_line_id: '@theblissathome',
  due_soon_message: 'ใกล้ถึงกำหนดชำระบิลรายเดือนแล้ว กรุณาเตรียมการชำระ',
  overdue_message: 'บิลค้างชำระ กรุณาชำระโดยเร็วเพื่อหลีกเลี่ยงค่าปรับ',
  warning_message: 'บิลค้างชำระนาน กรุณาติดต่อแอดมินเพื่อชำระ',
  urgent_message: 'บิลค้างชำระเกินกำหนดมาก จำเป็นต้องชำระทันที',
  auto_email_reminder: true,
  auto_line_reminder: false,
  reminder_frequency_days: 7,
  bank_transfer_enabled: true,
  bank_name: 'ธนาคารกสิกรไทย',
  bank_account_number: '123-4-56789-0',
  bank_account_name: 'บริษัท เดอะ บลิส แอท โฮม จำกัด',
  cash_payment_enabled: true,
  office_address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
  office_hours: 'จันทร์-ศุกร์ 9:00-17:00, เสาร์ 9:00-12:00',
  check_payment_enabled: false,
  is_active: true
}

// In-memory cache for billing settings
let cachedSettings: BillingSettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Fetch billing settings from database with caching
 * @param forceRefresh - Force refresh the cache
 * @returns Promise<BillingSettings>
 */
export async function getBillingSettings(forceRefresh = false): Promise<BillingSettings> {
  const now = Date.now()

  // Return cached settings if valid and not forcing refresh
  if (!forceRefresh && cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings
  }

  try {
    console.log('[BillingSettings] Fetching billing settings from database...')

    const { data, error } = await supabase
      .from('billing_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('[BillingSettings] Error fetching settings:', error)

      // If we have cached settings, return them even if expired
      if (cachedSettings) {
        console.warn('[BillingSettings] Using cached settings due to database error')
        return cachedSettings
      }

      // Otherwise, return default settings
      console.warn('[BillingSettings] Using default settings due to database error')
      return DEFAULT_BILLING_SETTINGS as BillingSettings
    }

    if (!data) {
      console.warn('[BillingSettings] No active billing settings found, using defaults')
      return DEFAULT_BILLING_SETTINGS as BillingSettings
    }

    // Cache the settings
    cachedSettings = data
    cacheTimestamp = now

    console.log('[BillingSettings] Settings fetched and cached successfully')
    return data

  } catch (err) {
    console.error('[BillingSettings] Unexpected error:', err)

    // If we have cached settings, return them
    if (cachedSettings) {
      console.warn('[BillingSettings] Using cached settings due to unexpected error')
      return cachedSettings
    }

    // Otherwise, return default settings
    console.warn('[BillingSettings] Using default settings due to unexpected error')
    return DEFAULT_BILLING_SETTINGS as BillingSettings
  }
}

/**
 * Clear the cached billing settings
 * Use this when you know settings have been updated
 */
export function clearBillingSettingsCache(): void {
  cachedSettings = null
  cacheTimestamp = 0
  console.log('[BillingSettings] Cache cleared')
}

/**
 * Get specific setting value with type safety
 * @param key - The setting key to retrieve
 * @returns Promise with the setting value
 */
export async function getBillingSetting<K extends keyof BillingSettings>(
  key: K
): Promise<BillingSettings[K]> {
  const settings = await getBillingSettings()
  return settings[key]
}

/**
 * Check if billing settings are available (not using defaults)
 * @returns Promise<boolean>
 */
export async function areBillingSettingsAvailable(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('billing_settings')
      .select('id')
      .eq('is_active', true)
      .single()

    return !error && !!data
  } catch (err) {
    console.error('[BillingSettings] Error checking availability:', err)
    return false
  }
}

/**
 * Subscribe to billing settings changes
 * @param callback - Function to call when settings change
 * @returns Unsubscribe function
 */
export function subscribeToBillingSettingsChanges(
  callback: (settings: BillingSettings) => void
): () => void {
  const subscription = supabase
    .channel('billing-settings-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'billing_settings',
        filter: 'is_active=eq.true'
      },
      async (payload) => {
        console.log('[BillingSettings] Settings updated, clearing cache')
        clearBillingSettingsCache()

        // Fetch new settings and call callback
        const newSettings = await getBillingSettings(true)
        callback(newSettings)
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    console.log('[BillingSettings] Unsubscribing from settings changes')
    supabase.removeChannel(subscription)
  }
}

/**
 * Helper function to format payment methods from settings
 * @returns Promise with formatted payment methods
 */
export async function getFormattedPaymentMethods(): Promise<{
  bankTransfer?: {
    enabled: boolean
    bankName?: string
    accountNumber?: string
    accountName?: string
  }
  cashPayment?: {
    enabled: boolean
    address?: string
    hours?: string
  }
  checkPayment?: {
    enabled: boolean
    payableTo?: string
    mailingAddress?: string
  }
}> {
  const settings = await getBillingSettings()

  return {
    bankTransfer: settings.bank_transfer_enabled ? {
      enabled: true,
      bankName: settings.bank_name,
      accountNumber: settings.bank_account_number,
      accountName: settings.bank_account_name
    } : { enabled: false },

    cashPayment: settings.cash_payment_enabled ? {
      enabled: true,
      address: settings.office_address,
      hours: settings.office_hours
    } : { enabled: false },

    checkPayment: settings.check_payment_enabled ? {
      enabled: true,
      payableTo: settings.check_payable_to,
      mailingAddress: settings.check_mailing_address
    } : { enabled: false }
  }
}