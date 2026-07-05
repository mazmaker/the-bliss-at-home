/**
 * Shared "apply an extension to a booking" logic — the SINGLE apply site used by BOTH:
 *   (1) the hotel/free inline branch of POST /bookings/:id/extend, and
 *   (2) the admin-confirm of a manual_qr PENDING extension (PART47 P3).
 *
 * The linchpin is the INSERT of a `booking_services` row with is_extension=true — its AFTER-INSERT
 * triggers create the staff extension_acknowledgment, bump job totals, and bump booking totals.
 *
 * ⚠️ Double-count avoidance (verified on prod, see skill bliss-booking-extend-server-flow):
 *   - `update_booking_extension_totals` trigger INCREMENTS bookings.final_price/extension_count on the
 *     insert; this helper then does an ABSOLUTE `SET final_price=newTotalPrice, extension_count=newCount`
 *     that OVERWRITES the increment — so those two are NOT double-counted. NEVER use `final_price += x`.
 *   - Per-recipient job earnings are recomputed from base + SUM(all is_extension rows for that recipient),
 *     couple-safe via job.job_index-1 === recipient_index.
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { sendExtensionNotifications } from './notificationService.js'

export interface ApplyExtensionParams {
  /** Fresh booking row WITH booking_services, jobs, customers joined in. */
  booking: any
  additionalDuration: number
  /** Net price (after discount) — the amount actually added to final_price. */
  finalExtensionPrice: number
  discountAmount: number
  promotionId?: string | null
}

export interface ApplyExtensionResult {
  extensionServiceId: string
  newTotalDuration: number
  newTotalPrice: number
  estimatedEndTime: Date
  newExtensionCount: number
  staffNotified: number
  customerNotified: boolean
}

export async function applyExtensionToBooking(params: ApplyExtensionParams): Promise<ApplyExtensionResult> {
  const supabase = getSupabaseClient()
  const { booking, additionalDuration, finalExtensionPrice, discountAmount, promotionId } = params
  const bookingId = booking.id

  // ── derive (mirror POST /extend compute block) ────────────────────────────
  const hasBookingServices = booking.booking_services && booking.booking_services.length > 0
  const serviceId = booking.booking_services?.[0]?.service_id || booking.service_id
  // COUPLE bookings run recipients in parallel → session wall-clock = ONE recipient's duration.
  const extendRecipientIndex = booking.booking_services?.[0]?.recipient_index ?? 0
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`)
  const currentTotalDuration = (booking.booking_services || [])
    .filter((s: any) => (s.recipient_index ?? 0) === extendRecipientIndex)
    .reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
  const newTotalDuration = currentTotalDuration + additionalDuration
  const newTotalPrice = Number(booking.final_price) + finalExtensionPrice
  const newExtensionCount = (booking.extension_count || 0) + 1
  const estimatedEndTime = new Date(bookingDateTime.getTime() + newTotalDuration * 60 * 1000)

  // staff profiles for LINE push (from the assigned jobs)
  let staffProfilesForWebhook: Array<{ profile_id: string; full_name: string }> = []
  if (booking.jobs && booking.jobs.length > 0) {
    const staffIds = booking.jobs.map((j: any) => j.staff_id).filter(Boolean)
    if (staffIds.length > 0) {
      const { data: sp } = await supabase.from('staff').select('profile_id, full_name').in('id', staffIds)
      if (sp) staffProfilesForWebhook = sp.filter((s: any) => s.profile_id)
    }
  }

  // ── 1. LINCHPIN: insert the extension booking_services row (fires the AFTER-INSERT triggers) ──
  const { data: extensionService, error: extErr } = await supabase
    .from('booking_services')
    .insert({
      booking_id: bookingId,
      service_id: serviceId,
      duration: additionalDuration,
      price: finalExtensionPrice,
      recipient_index: hasBookingServices ? booking.booking_services[0].recipient_index : 0,
      recipient_name: hasBookingServices ? booking.booking_services[0].recipient_name : null,
      sort_order: hasBookingServices ? booking.booking_services.length + 1 : 1,
      is_extension: true,
      extended_at: new Date().toISOString(),
      original_booking_service_id: hasBookingServices ? booking.booking_services[0].id : null,
    })
    .select('id')
    .single()
  if (extErr || !extensionService) {
    throw new Error(`Failed to create extension service: ${extErr?.message || 'unknown'}`)
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

  // ── 3. promotion (if any) ──
  if (promotionId && discountAmount > 0) {
    await supabase.from('booking_promotions').insert({
      booking_id: bookingId,
      promotion_id: promotionId,
      discount_amount: discountAmount,
      applied_at: new Date().toISOString(),
      applied_by: 'customer',
      booking_type: 'extension',
    })
  }

  // ── 4. staff in-app notif (original staff) ──
  let staffNotified = 0
  if (staffProfilesForWebhook.length > 0) {
    const rows = staffProfilesForWebhook.map((staff) => ({
      user_id: staff.profile_id,
      type: 'booking_extended',
      title: 'การจองขยายเวลา',
      message: `ลูกค้า ${booking.customers?.full_name || booking.customers?.phone} ขยายเวลาบริการเพิ่ม ${additionalDuration} นาที เวลาสิ้นสุดใหม่: ${estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      data: {
        booking_id: bookingId,
        additional_duration: additionalDuration,
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
      message: `การขยายเวลาบริการ ${additionalDuration} นาทีเสร็จสมบูรณ์ ราคาเพิ่มเติม ฿${finalExtensionPrice.toLocaleString()} เวลาสิ้นสุดใหม่: ${estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      data: {
        booking_id: bookingId,
        extension_price: finalExtensionPrice,
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
      staffProfileIds: staffProfilesForWebhook.map((s) => s.profile_id),
      extensionMinutes: additionalDuration,
      newEndTime: estimatedEndTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      extensionCount: newExtensionCount,
    })
  } catch (notifyErr) {
    console.error('[applyExtension] Admin/staff extension notify failed (non-blocking):', notifyErr)
  }

  // ── 7. per-recipient job earnings/duration recalc (couple-safe) — non-blocking ──
  try {
    const [{ data: bookingJobs }, { data: allExtensions }, { data: svc }] = await Promise.all([
      supabase.from('jobs').select('id, staff_earnings, duration_minutes, job_index').eq('booking_id', bookingId).not('status', 'eq', 'cancelled'),
      supabase.from('booking_services').select('duration, price, recipient_index').eq('booking_id', bookingId).eq('is_extension', true),
      supabase.from('services').select('use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, staff_commission_rate').eq('id', serviceId).single(),
    ])
    if (bookingJobs && bookingJobs.length > 0 && svc) {
      const extEarningFor = (dur: number, price: number) => svc.use_fixed_rate
        ? Math.round(Number(dur === 60 ? svc.staff_earning_60 : dur === 120 ? svc.staff_earning_120 : svc.staff_earning_90) || 0)
        : Math.round((price || 0) * (Number(svc.staff_commission_rate) || 0))
      const isCouple = bookingJobs.length > 1
      for (const job of bookingJobs) {
        const recipientIndex = (job.job_index ?? 1) - 1
        const jobExts = (allExtensions || []).filter((ext: any) => !isCouple || (ext.recipient_index ?? 0) === recipientIndex)
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

  return { extensionServiceId: extensionService.id, newTotalDuration, newTotalPrice, estimatedEndTime, newExtensionCount, staffNotified, customerNotified }
}
