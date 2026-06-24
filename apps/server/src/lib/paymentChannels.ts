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

/**
 * [manual-QR] Payment MODE — orthogonal to the channel allowlist above.
 * Source of truth = settings key `payment_mode` (JSONB { value: 'omise' | 'manual_qr' }).
 * 'manual_qr' (temporary, while Omise approval is pending) = customer transfers via a static
 * QR and sends the slip over LINE; the admin verifies and marks the booking paid. In that mode
 * every Omise initiator (create-charge / create-source / add-payment-method / extend-charge)
 * is gated off server-side too, so a deploy with no Omise key never throws. Positive-form check
 * `=== 'manual_qr'` (never `!== 'omise'`) so a null/legacy value falls back to omise, not manual.
 */
export type PaymentMode = 'omise' | 'manual_qr'

const MODE_CACHE_TTL_MS = 5000 // short, so an admin toggle reflects within a few seconds
let _modeCache: { value: PaymentMode; at: number } | null = null

export async function getPaymentMode(): Promise<PaymentMode> {
  if (_modeCache && Date.now() - _modeCache.at < MODE_CACHE_TTL_MS) {
    return _modeCache.value
  }
  let mode: PaymentMode = 'omise'
  try {
    const { data } = await getSupabaseClient()
      .from('settings')
      .select('value')
      .eq('key', 'payment_mode')
      .maybeSingle()
    // JSONB stored either as a raw string or wrapped { value: 'manual_qr' }
    const raw: any = (data as any)?.value
    const val: any = typeof raw === 'string' ? raw : raw?.value
    if (val === 'manual_qr') mode = 'manual_qr'
  } catch (err) {
    console.error('⚠️ Failed to read payment_mode, defaulting to omise:', err)
  }
  _modeCache = { value: mode, at: Date.now() }
  return mode
}

export interface ManualQrConfig {
  image_url: string
  line_oa_qr_url: string
  line_oa_id: string
}

// Read the admin-uploaded manual-QR config (payment QR + LINE OA QR/ID) from settings.
export async function getManualQrConfig(): Promise<ManualQrConfig> {
  const result: ManualQrConfig = { image_url: '', line_oa_qr_url: '', line_oa_id: '' }
  try {
    const { data } = await getSupabaseClient()
      .from('settings')
      .select('key, value')
      .in('key', ['manual_qr_payment_image_url', 'manual_qr_line_qr_url', 'manual_qr_line_id'])
    for (const row of ((data as any[]) ?? [])) {
      const raw: any = row?.value
      const val: string = typeof raw === 'string' ? raw : (raw?.url ?? raw?.value ?? '')
      if (row.key === 'manual_qr_payment_image_url') result.image_url = val
      else if (row.key === 'manual_qr_line_qr_url') result.line_oa_qr_url = val
      else if (row.key === 'manual_qr_line_id') result.line_oa_id = val
    }
  } catch (err) {
    console.error('⚠️ Failed to read manual_qr config:', err)
  }
  return result
}

// Map an Omise source_type (e.g. 'internet_banking_scb') to its channel bucket.
export function sourceTypeToChannel(sourceType: string): PaymentChannel | string {
  if (sourceType === 'promptpay') return 'promptpay'
  if (sourceType.startsWith('internet_banking')) return 'internet_banking'
  if (sourceType.startsWith('mobile_banking')) return 'mobile_banking'
  return sourceType
}
