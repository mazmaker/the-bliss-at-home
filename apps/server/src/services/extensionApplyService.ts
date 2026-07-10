/**
 * Shared "apply an extension to a booking" logic — the SINGLE apply site used by BOTH:
 *   (1) the hotel/free inline branch of POST /bookings/:id/extend, and
 *   (2) the admin-confirm of a manual_qr PENDING extension (PART47 P3, single + confirm-all).
 *
 * The linchpin is the INSERT of a `booking_services` row with is_extension=true — its AFTER-INSERT
 * triggers create the staff extension_acknowledgment, bump job totals, and bump booking totals.
 *
 * ⚠️ Per-recipient / COUPLE correctness (see skills bliss-couple-recipient-duration-scope +
 *   bliss-booking-extend-server-flow):
 *   - A couple/simultaneous booking has ONE booking_services base row PER RECIPIENT (recipient_index
 *     0,1) served in PARALLEL by separate staff. An extension MUST target the recipient(s) the
 *     customer/hotel chose — NEVER `booking_services[0]` (nondeterministic). Callers pass explicit
 *     `targets` (one per recipient being extended); "ต่อทั้งคู่" = 2 targets.
 *   - Each target inserts its OWN is_extension row (its recipient_index / service_id / price), so the
 *     per-recipient job recalc (job.job_index-1 === recipient_index) bumps ONLY that recipient's job.
 *
 * ⚠️ Double-count avoidance (verified on prod):
 *   - `update_booking_extension_totals` trigger INCREMENTS bookings.final_price/extension_count on each
 *     insert; this helper then does an ABSOLUTE `SET final_price=newTotalPrice, extension_count=newCount`
 *     that OVERWRITES the increment — so those two are NOT double-counted. NEVER use `final_price += x`.
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { sendExtensionNotifications } from './notificationService.js'

/** One recipient being extended. "ต่อทั้งคู่" passes two of these; "ทีละคน"/single passes one. */
export interface ExtensionTarget {
  /** 0-based recipient index (matches booking_services.recipient_index and jobs.job_index-1). */
  recipientIndex: number
  /** The service used for THIS recipient (couple recipients can have different services). */
  serviceId: string
  additionalDuration: number
  /** Net price (after discount) for THIS recipient — added to final_price + used for commission earnings. */
  finalExtensionPrice: number
  discountAmount?: number
  promotionId?: string | null
  recipientName?: string | null
  /** The recipient's BASE booking_services row id (for original_booking_service_id linkage). */
  baseBookingServiceId?: string | null
}

export interface ApplyExtensionParams {
  /** Fresh booking row WITH booking_services, jobs, customers joined in. */
  booking: any
  /** One or more recipients to extend (deterministic — never derived from booking_services[0]). */
  targets: ExtensionTarget[]
}

export interface ApplyExtensionResult {
  /** One inserted is_extension booking_services row id per target (order matches `targets`). */
  extensionServiceIds: string[]
  /** Representative session end duration (max across extended recipients). */
  newTotalDuration: number
  newTotalPrice: number
  estimatedEndTime: Date
  newExtensionCount: number
  staffNotified: number
  customerNotified: boolean
}

export async function applyExtensionToBooking(params: ApplyExtensionParams): Promise<ApplyExtensionResult> {
  const supabase = getSupabaseClient()
  const { booking, targets } = params
  const bookingId = booking.id

  if (!targets || targets.length === 0) {
    throw new Error('applyExtensionToBooking: no extension targets provided')
  }

  const allRows: any[] = booking.booking_services || []
  const baseRows: any[] = allRows.filter((s: any) => !s.is_extension)
  const hasBookingServices = baseRows.length > 0
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`)

  // Current per-recipient duration = base + ALREADY-APPLIED extensions for that recipient (all
  // pre-existing rows; the new extension rows aren't in `booking` yet). Using base-only would understate
  // the end time on a 2nd+ extension. Couple recipients run in PARALLEL so the session end = LATEST end.
  const recipientBaseDuration = (recipientIndex: number): number =>
    hasBookingServices
      ? allRows
          .filter((s: any) => (s.recipient_index ?? 0) === recipientIndex)
          .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
      : (booking.duration || 0)

  const totalAddedPrice = targets.reduce((sum, t) => sum + (t.finalExtensionPrice || 0), 0)
  const newTotalPrice = Number(booking.final_price) + totalAddedPrice
  const newExtensionCount = (booking.extension_count || 0) + targets.length

  // Representative session end = max recipient resulting duration.
  let maxResultingDuration = 0
  for (const t of targets) {
    const resulting = recipientBaseDuration(t.recipientIndex) + t.additionalDuration
    if (resulting > maxResultingDuration) maxResultingDuration = resulting
  }
  const newTotalDuration = maxResultingDuration
  const estimatedEndTime = new Date(bookingDateTime.getTime() + newTotalDuration * 60 * 1000)

  // ── 1. LINCHPIN: insert one extension booking_services row PER target (fires AFTER-INSERT triggers) ──
  const extensionServiceIds: string[] = []
  let sortCursor = hasBookingServices ? (booking.booking_services.length + 1) : 1
  for (const t of targets) {
    const baseRow = baseRows.find((s: any) => (s.recipient_index ?? 0) === t.recipientIndex)
    const { data: extensionService, error: extErr } = await supabase
      .from('booking_services')
      .insert({
        booking_id: bookingId,
        service_id: t.serviceId,
        duration: t.additionalDuration,
        price: t.finalExtensionPrice,
        recipient_index: t.recipientIndex,
        recipient_name: t.recipientName ?? baseRow?.recipient_name ?? null,
        sort_order: sortCursor++,
        is_extension: true,
        extended_at: new Date().toISOString(),
        original_booking_service_id: t.baseBookingServiceId ?? baseRow?.id ?? null,
      })
      .select('id')
      .single()
    if (extErr || !extensionService) {
      throw new Error(`Failed to create extension service (recipient ${t.recipientIndex}): ${extErr?.message || 'unknown'}`)
    }
    extensionServiceIds.push(extensionService.id)
  }

  // ── 2. ABSOLUTE-SET booking totals (overwrites the trigger increment — do NOT use +=) ──
  const { error: updErr } = await supabase
    .from('bookings')
    .update({
      final_price: newTotalPrice,
      extension_count: newExtensionCount,
      last_extended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
  if (updErr) throw new Error(`Failed to update booking totals: ${updErr.message}`)

  // ── 3. promotion (if any) — best-effort; `booking_promotions` may not exist in every env ──
  for (const t of targets) {
    if (t.promotionId && (t.discountAmount || 0) > 0) {
      await supabase.from('booking_promotions').insert({
        booking_id: bookingId,
        promotion_id: t.promotionId,
        discount_amount: t.discountAmount,
        applied_at: new Date().toISOString(),
        applied_by: 'customer',
        booking_type: 'extension',
      })
    }
  }

  // Staff to notify = the assigned staff of each EXTENDED recipient's job. 🔴 jobs.staff_id IS the
  // staff's PROFILE id (not staff.id) — notifications.user_id + LINE push both key off profile id, so
  // use job.staff_id directly (the old `staff.select('profile_id').in('id', staffIds)` looked it up in
  // the wrong id-space and matched 0 rows → the staff never got the in-app extend notif).
  const jobs: any[] = booking.jobs || []
  const isCouple = jobs.length > 1
  const extendedRecipientIndices = new Set(targets.map((t) => t.recipientIndex))
  const notifyStaffProfileIds = Array.from(
    new Set(
      jobs
        .filter((j: any) => j.staff_id && (!isCouple || extendedRecipientIndices.has((j.job_index ?? 1) - 1)))
        .map((j: any) => j.staff_id as string)
    )
  )
  const representativeAdditional = Math.max(...targets.map((t) => t.additionalDuration))

  // ── 4. staff in-app notif (each extended recipient's staff) ──
  let staffNotified = 0
  if (notifyStaffProfileIds.length > 0) {
    const rows = notifyStaffProfileIds.map((profileId) => ({
      user_id: profileId,
      type: 'booking_extended',
      title: 'การจองขยายเวลา',
      message: `ลูกค้า ${booking.customers?.full_name || booking.customers?.phone || ''} ขยายเวลาบริการเพิ่ม ${representativeAdditional} นาที เวลาสิ้นสุดใหม่: ${estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      data: {
        booking_id: bookingId,
        additional_duration: representativeAdditional,
        new_end_time: estimatedEndTime.toISOString(),
        extension_count: newExtensionCount,
      },
      is_read: false,
    }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (!error) staffNotified = rows.length
  }

  // ── 5. customer confirmation in-app notif ──
  let customerNotified = false
  if (booking.customers?.profile_id) {
    const { error } = await supabase.from('notifications').insert({
      user_id: booking.customers.profile_id,
      type: 'booking_extended_confirmation',
      title: 'ยืนยันการขยายเวลาบริการ',
      message: `การขยายเวลาบริการ ${representativeAdditional} นาทีเสร็จสมบูรณ์ ราคาเพิ่มเติม ฿${totalAddedPrice.toLocaleString()} เวลาสิ้นสุดใหม่: ${estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      data: {
        booking_id: bookingId,
        extension_price: totalAddedPrice,
        new_end_time: estimatedEndTime.toISOString(),
        extension_count: newExtensionCount,
      },
      is_read: false,
    })
    customerNotified = !error
  }

  // ── 6. admin (in-app + LINE) + staff LINE — non-blocking ──
  try {
    await sendExtensionNotifications(bookingId, {
      staffProfileIds: notifyStaffProfileIds,
      extensionMinutes: representativeAdditional,
      newEndTime: estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      extensionCount: newExtensionCount,
    })
  } catch (notifyErr) {
    console.error('[applyExtension] Admin/staff extension notify failed (non-blocking):', notifyErr)
  }

  // ── 7. per-recipient job earnings/duration recalc (couple-safe) — non-blocking ──
  try {
    const [{ data: bookingJobs }, { data: allBookingServices }] = await Promise.all([
      supabase.from('jobs').select('id, staff_earnings, duration_minutes, job_index').eq('booking_id', bookingId).not('status', 'eq', 'cancelled'),
      supabase.from('booking_services').select('service_id, duration, price, recipient_index, is_extension').eq('booking_id', bookingId),
    ])
    if (bookingJobs && bookingJobs.length > 0) {
      // Resolve each recipient's OWN service rate (couple recipients can have different services).
      const baseByRecipient = new Map<number, string>()
      for (const bs of (allBookingServices || [])) {
        if (!bs.is_extension && bs.service_id != null && !baseByRecipient.has(bs.recipient_index ?? 0)) {
          baseByRecipient.set(bs.recipient_index ?? 0, bs.service_id)
        }
      }
      const serviceIds = Array.from(new Set([...baseByRecipient.values(), ...targets.map((t) => t.serviceId)].filter(Boolean)))
      const { data: svcRows } = serviceIds.length > 0
        ? await supabase.from('services').select('id, use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, staff_commission_rate').in('id', serviceIds)
        : { data: [] as any[] }
      const svcById = new Map<string, any>((svcRows || []).map((s: any) => [s.id, s]))
      const isCoupleJobs = bookingJobs.length > 1

      for (const job of bookingJobs) {
        const recipientIndex = (job.job_index ?? 1) - 1
        const svc = svcById.get(baseByRecipient.get(recipientIndex) || '') || svcById.get(targets.find((t) => t.recipientIndex === recipientIndex)?.serviceId || '')
        const extEarningFor = (dur: number, price: number) => {
          if (!svc) return Math.round(price || 0)
          return svc.use_fixed_rate
            ? Math.round(Number(dur === 60 ? svc.staff_earning_60 : dur === 120 ? svc.staff_earning_120 : svc.staff_earning_90) || 0)
            : Math.round((price || 0) * (Number(svc.staff_commission_rate) || 0))
        }
        const jobExts = (allBookingServices || []).filter((ext: any) => ext.is_extension && (!isCoupleJobs || (ext.recipient_index ?? 0) === recipientIndex))
        let jobExtDuration = 0
        let jobExtEarnings = 0
        for (const ext of jobExts) {
          jobExtDuration += ext.duration || 0
          jobExtEarnings += extEarningFor(ext.duration || 0, ext.price || 0)
        }
        await supabase.from('jobs').update({
          total_staff_earnings: Number(job.staff_earnings ?? 0) + jobExtEarnings,
          total_duration_minutes: Number(job.duration_minutes ?? 0) + jobExtDuration,
        }).eq('id', job.id)
      }
    }
  } catch (jobErr) {
    console.error('[applyExtension] Job earnings recalc failed (non-blocking):', jobErr)
  }

  return { extensionServiceIds, newTotalDuration, newTotalPrice, estimatedEndTime, newExtensionCount, staffNotified, customerNotified }
}
