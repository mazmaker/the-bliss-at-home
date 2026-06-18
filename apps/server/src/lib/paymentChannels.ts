/**
 * [R1] Payment-channel allowlist — single source of truth for the server.
 *
 * Source of truth = settings key `enabled_payment_channels` (JSONB array). The customer
 * pays only through channels the admin has enabled; everything else is rejected. Gated on
 * BOTH the customer UI (display) and the server (enforce), so it is a real restriction and
 * not just hidden UI. Reversible from the admin Settings UI with NO deploy. Card/banking
 * code is KEPT everywhere (never deleted) — only gated. Absent/invalid key → PromptPay only.
 *
 * Used by routes/payment.ts (create-charge / create-source / add-payment-method) AND
 * routes/bookings.ts (the per-extension Omise charge), so both honour the same allowlist.
 */
import { getSupabaseClient } from './supabase.js'

export type PaymentChannel = 'credit_card' | 'promptpay' | 'internet_banking' | 'mobile_banking'
export const ALL_CHANNELS: PaymentChannel[] = ['credit_card', 'promptpay', 'internet_banking', 'mobile_banking']
export const DEFAULT_ENABLED_CHANNELS: PaymentChannel[] = ['promptpay']

const CHANNELS_CACHE_TTL_MS = 5000 // short, so an admin toggle reflects within a few seconds
let _channelsCache: { value: PaymentChannel[]; at: number } | null = null

export async function getEnabledPaymentChannels(): Promise<PaymentChannel[]> {
  if (_channelsCache && Date.now() - _channelsCache.at < CHANNELS_CACHE_TTL_MS) {
    return _channelsCache.value
  }
  let channels: PaymentChannel[] = DEFAULT_ENABLED_CHANNELS
  try {
    const { data } = await getSupabaseClient()
      .from('settings')
      .select('value')
      .eq('key', 'enabled_payment_channels')
      .maybeSingle()
    // JSONB stored either as a raw array or wrapped { value: [...] }
    const raw: any = (data as any)?.value
    const arr: any[] | null = Array.isArray(raw) ? raw : Array.isArray(raw?.value) ? raw.value : null
    if (arr && arr.length > 0) {
      const filtered = arr.filter((c): c is PaymentChannel => (ALL_CHANNELS as string[]).includes(c))
      if (filtered.length > 0) channels = filtered
    }
  } catch (err) {
    console.error('⚠️ Failed to read enabled_payment_channels, defaulting to PromptPay:', err)
  }
  _channelsCache = { value: channels, at: Date.now() }
  return channels
}

// Map an Omise source_type (e.g. 'internet_banking_scb') to its channel bucket.
export function sourceTypeToChannel(sourceType: string): PaymentChannel | string {
  if (sourceType === 'promptpay') return 'promptpay'
  if (sourceType.startsWith('internet_banking')) return 'internet_banking'
  if (sourceType.startsWith('mobile_banking')) return 'mobile_banking'
  return sourceType
}
