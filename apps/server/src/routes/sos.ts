import { Router } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { sendEmail, sosAlertEmailTemplate } from '../services/emailService.js'

const router = Router()

/**
 * POST /api/sos/notify
 *
 * Emails an SOS alert to the admin-configured address (settings key
 * `sos_notification_email`). Triggered by the client AFTER it has inserted the
 * sos_alerts row (the in-app admin fan-out is done by the DB trigger
 * notify_admins_of_sos, independent of this route).
 *
 * Decision D6: send ONLY to sos_notification_email — NO fallback. If the key is
 * unset/empty, skip the email (the insert + in-app notification still happened).
 * Email failure must never be the client's problem — this is best-effort.
 */
router.post('/notify', async (req, res) => {
  try {
    const { sos_alert_id } = req.body
    if (!sos_alert_id) {
      return res.status(400).json({ success: false, error: 'Missing required field: sos_alert_id' })
    }

    const supabase = getSupabaseClient()

    // Load the alert row
    const { data: alert, error: alertError } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('id', sos_alert_id)
      .single()

    if (alertError || !alert) {
      return res.status(404).json({ success: false, error: 'SOS alert not found' })
    }

    // Read the configured recipient (JSONB {value:"..."}) — NO fallback (D6)
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['sos_notification_email'])

    let recipient = ''
    settingsRows?.forEach((row: any) => {
      const val = row.value
      recipient =
        typeof val === 'object' && val !== null && 'value' in val
          ? (val.value || '')
          : String(val || '')
    })
    recipient = (recipient || '').trim()

    if (!recipient) {
      console.log('[SOS notify] sos_notification_email not set — skipping email (in-app fan-out unaffected)')
      return res.json({ success: true, emailed: false, reason: 'sos_notification_email not set' })
    }

    // Resolve the source (customer XOR staff). booking_id is NOT a reliable join
    // for staff alerts (the staff app stores a job id there), so branch on the id.
    let sourceLabel = 'ไม่ทราบแหล่งที่มา'
    let sourceName = '-'
    let sourcePhone: string | undefined

    if (alert.customer_id) {
      sourceLabel = 'ลูกค้า'
      const { data: c } = await supabase
        .from('customers')
        .select('full_name, phone')
        .eq('id', alert.customer_id)
        .single()
      sourceName = c?.full_name || '-'
      sourcePhone = c?.phone || undefined
    } else if (alert.staff_id) {
      sourceLabel = 'พนักงาน'
      const { data: s } = await supabase
        .from('staff')
        .select('name_th, name_en, phone')
        .eq('id', alert.staff_id)
        .single()
      sourceName = s?.name_th || s?.name_en || '-'
      sourcePhone = s?.phone || undefined
    }

    const hasLoc = alert.latitude != null && alert.longitude != null
    const mapLink = hasLoc
      ? `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
      : null

    const html = sosAlertEmailTemplate({
      alertId: alert.id,
      sourceLabel,
      sourceName,
      sourcePhone,
      message: alert.message,
      priority: alert.priority,
      status: alert.status,
      latitude: alert.latitude,
      longitude: alert.longitude,
      mapLink,
      locationAccuracy: alert.location_accuracy,
      createdAt: alert.created_at
        ? new Date(alert.created_at).toLocaleString('th-TH')
        : undefined,
    })

    const result = await sendEmail({
      to: recipient,
      subject: `🚨 SOS Emergency Alert — ${sourceLabel} ${sourceName}`,
      html,
    })

    if (result.success) {
      return res.json({ success: true, emailed: true, sentTo: recipient })
    }
    return res.status(500).json({ success: false, error: result.error || 'Failed to send SOS email' })
  } catch (error: any) {
    console.error('[SOS notify] error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal error' })
  }
})

export default router
