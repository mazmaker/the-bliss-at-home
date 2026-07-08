// Load environment variables FIRST before any other imports (only for local development)
// [touch] R1 payment-channel allowlist (enabled_payment_channels) + extend gate wired 2026-06-17
// [touch] hotel check-email pre-check route added 2026-07-08 (profiles-based)
import dotenv from 'dotenv'
import { join } from 'path'

// Only load .env file if running locally (not on Vercel)
if (!process.env.VERCEL && !process.env.NODE_ENV?.includes('production')) {
  // __dirname is available in CommonJS
  try {
    dotenv.config({ path: join(__dirname, '..', '.env') })
    console.log('✅ Loaded .env file for local development')
  } catch (error) {
    console.log('⚠️ No .env file found (running on Vercel or production)')
  }
}

import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
// Removed node-cron - using Vercel Cron instead (see vercelon)
import paymentRoutes from './routes/payment'
import otpRoutes from './routes/otp'
import hotelRoutes from './routes/hotel'
import secureBookingsRoutes from './routes/secure-bookings-v2'
import notificationRoutes from './routes/notification'
import bookingsRoutes from './routes/bookings'
import cancellationPolicyRoutes from './routes/cancellationPolicy'
import receiptsRoutes from './routes/receipts'
import invoicesRoutes from './routes/invoices'
import adminRoutes from './routes/admin'
import sosRoutes from './routes/sos'
// import migratePayoutCyclesRoutes from './routes/migrate-payout-cycles' // Temporarily disabled
import { processJobReminders, processOverdueJobs, cleanupOldReminders, processCustomerEmailReminders, processJobEscalations, processCreditDueReminders } from './services/notificationService'
import { reminderService } from './services/reminderService'
import { processPayoutCutoff } from './services/payoutService'
import { processEnhancedPayoutCron } from './services/enhancedPayoutService'
import { getSupabaseClient } from './lib/supabase'
// Skip shared package imports for Vercel compatibility
// import { processPointsExpiry, processExpiryWarnings } from '../../../packages/supabase/src/services/loyaltyService'

// Placeholder functions for loyalty service (temporarily disabled for Vercel)
const processPointsExpiry = async (supabase: any) => {
  console.log('⚠️ processPointsExpiry temporarily disabled for Vercel deployment')
  return {
    expiredCount: 0,
    affectedCustomers: [],
    transactions: []
  }
}

const processExpiryWarnings = async (supabase: any) => {
  console.log('⚠️ processExpiryWarnings temporarily disabled for Vercel deployment')
  return {
    warningCount: 0,
    sentWarnings: []
  }
}

const app = express()
const PORT = process.env.PORT || 3000

// CORS Configuration for production domains
const corsOptions = {
  origin: [
    'http://localhost:3001', // Admin local
    'http://localhost:3002', // Customer local
    'http://localhost:3003', // Hotel local
    'http://localhost:3004', // Staff local
    'http://localhost:3005', // Customer app dev port (current)
    'http://localhost:3008', // Customer app dev port (legacy)
    'https://admin.theblissmassageathome.com', // Admin production
    'https://customer.theblissmassageathome.com', // Customer production
    'https://hotel.theblissmassageathome.com', // Hotel production
    'https://staff.theblissmassageathome.com', // Staff production
    // Vercel preview URLs
    /^https:\/\/.*\.vercel\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Legacy browsers support
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json({ limit: '8mb' })) // [R2] allow base64 avatar uploads (admin set staff photo)
app.use(express.urlencoded({ extended: true, limit: '8mb' }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'bliss-server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.5', // F-2 enforcement ON (REQUIRE_PAYMENT_AUTH) (2026-06-15)
  })
})

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'The Bliss Massage at Home - API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      payments: '/api/payments',
      otp: '/api/otp',
      hotels: '/api/hotels',
      'secure-bookings': '/api/secure-bookings (Professional JWT Auth)',
      notifications: '/api/notifications',
      bookings: '/api/bookings',
      cancellationPolicy: '/api/cancellation-policy',
      receipts: '/api/receipts',
    },
  })
})

// Payment routes
app.use('/api/payments', paymentRoutes)

// OTP routes
app.use('/api/otp', otpRoutes)

// Hotel authentication routes
app.use('/api/hotels', hotelRoutes)

// Secure bookings routes
app.use('/api/secure-bookings', secureBookingsRoutes)

// Notification routes
app.use('/api/notifications', notificationRoutes)

// Booking routes
app.use('/api/bookings', bookingsRoutes)

// Cancellation policy routes
console.log('📋 Registering cancellation policy routes at /api/cancellation-policy')
app.use('/api/cancellation-policy', cancellationPolicyRoutes)

// Receipt & Credit Note routes
app.use('/api/receipts', receiptsRoutes)

// Invoice email routes
app.use('/api/invoices', invoicesRoutes)
app.use('/api/admin', adminRoutes)

// SOS alert email route (R3)
app.use('/api/sos', sosRoutes)

// Test automated payout endpoint
app.post('/api/cron/daily-payout', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Manual automated payout test triggered')

    // Import the automated payout function
    const { dailyPayoutCheck } = await import('../../../packages/supabase/src/earnings/automatedPayout')

    const result = await dailyPayoutCheck()

    console.log('📊 Automated payout result:', result)

    res.json({
      success: result.success,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error in automated payout test:', error)
    res.status(500).json({
      success: false,
      processed: 0,
      errors: [error?.toString() || 'Unknown error'],
      timestamp: new Date().toISOString()
    })
  }
})

// Migration routes (temporary for payout cycles)
// app.use('/api/migrate', migratePayoutCyclesRoutes) // Temporarily disabled

// ============ SYSTEM HEALTH MONITOR (Telegram alerts, Vercel cron every 5 min) ============
// Reads DB metrics via get_system_health() rpc, compares against thresholds, and
// pushes a Telegram message when something crosses (with a 30-min per-issue cooldown
// stored in the settings table so a persistent problem doesn't spam). Sends a "back to
// normal" message when an issue clears.
const HEALTH_LIMITS = {
  connCriticalPct: 80,   // of max_connections (60 on Micro) → ~48
  connWarnPct: 67,       // early warning → ~40 (the old pre-fix peak zone)
  realtimeSubsWarn: 400, // Pro plan realtime ceiling is 500
  longRunningQueries: 1, // any query active > 30s is worth knowing about
}
const HEALTH_ALERT_COOLDOWN_MS = 30 * 60 * 1000
const HEALTH_STATE_KEY = 'system_health_alert_state'

async function sendTelegramAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[HealthMonitor] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping send')
    return false
  }
  try {
    // NOTE: typed explicitly — the express `Response` type imported at the top of this
    // file shadows fetch's global Response type in Vercel's type-check environment
    const resp = (await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })) as unknown as { ok: boolean; text(): Promise<string> }
    if (!resp.ok) console.error('[HealthMonitor] Telegram send failed:', await resp.text())
    return resp.ok
  } catch (err) {
    console.error('[HealthMonitor] Telegram send error:', err)
    return false
  }
}

const systemHealthHandler = async (_req: Request, res: Response) => {
  try {
    const { getSupabaseClient } = await import('./lib/supabase')
    const supabase = getSupabaseClient()

    const { data: health, error: healthError } = await supabase.rpc('get_system_health')
    if (healthError || !health) {
      // Can't even read health → that IS an incident. Alert directly (no cooldown state available).
      await sendTelegramAlert(
        `🔴 <b>[Bliss Monitor]</b> อ่านสถานะ database ไม่ได้!\n${healthError?.message || 'no data'}\n${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
      )
      return res.status(500).json({ success: false, error: healthError?.message })
    }

    const connPct = Math.round((100 * health.connections_total) / health.connections_max)
    const now = Date.now()

    // Evaluate current issues
    const issues: Record<string, string> = {}
    if (connPct >= HEALTH_LIMITS.connCriticalPct) {
      issues.conn_critical = `🔴 Connections วิกฤต: <b>${health.connections_total}/${health.connections_max}</b> (${connPct}%)`
    } else if (connPct >= HEALTH_LIMITS.connWarnPct) {
      issues.conn_warn = `🟡 Connections สูง: <b>${health.connections_total}/${health.connections_max}</b> (${connPct}%)`
    }
    if (health.realtime_subscriptions >= HEALTH_LIMITS.realtimeSubsWarn) {
      issues.realtime = `🟡 Realtime subscriptions สูง: <b>${health.realtime_subscriptions}</b> (เพดาน 500)`
    }
    if (health.long_running_queries >= HEALTH_LIMITS.longRunningQueries) {
      issues.long_query = `🟡 มี query ค้างนาน: <b>${health.long_running_queries}</b> ตัว (นานสุด ${health.oldest_active_query_seconds}s)`
    }

    // Load cooldown state from settings (key/value jsonb — reusing existing table; NOTE: prod has `settings`, not `app_settings`)
    const { data: stateRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', HEALTH_STATE_KEY)
      .maybeSingle()
    const active: Record<string, number> = (stateRow?.value as any)?.active || {}

    const toSend: string[] = []
    const nextActive: Record<string, number> = {}

    // New or still-firing issues (respect cooldown)
    for (const [key, msg] of Object.entries(issues)) {
      const lastSent = active[key] || 0
      if (now - lastSent >= HEALTH_ALERT_COOLDOWN_MS) {
        toSend.push(msg)
        nextActive[key] = now
      } else {
        nextActive[key] = lastSent
      }
    }
    // Resolved issues → recovery note
    const resolved = Object.keys(active).filter((k) => !(k in issues))
    if (resolved.length > 0 && Object.keys(issues).length === 0) {
      toSend.push(`🟢 กลับสู่ปกติแล้ว — connections ${health.connections_total}/${health.connections_max} (${connPct}%)`)
    }

    if (toSend.length > 0) {
      const ts = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })
      await sendTelegramAlert(`<b>[Bliss Monitor ${ts}]</b>\n${toSend.join('\n')}`)
    }

    // Persist state (upsert on key)
    await supabase
      .from('settings')
      .upsert(
        { key: HEALTH_STATE_KEY, value: { active: nextActive }, description: 'System health monitor alert cooldown state (auto-managed)', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

    return res.json({ success: true, health, issues: Object.keys(issues), alerted: toSend.length > 0 })
  } catch (error) {
    console.error('[HealthMonitor] Error:', error)
    return res.status(500).json({ success: false, error: String(error) })
  }
}
// Vercel cron sends GET; keep POST for manual triggering
app.get('/api/cron/system-health', systemHealthHandler)
app.post('/api/cron/system-health', systemHealthHandler)

// ---------- shared summary builders (used by /status, /bookings, /staff, daily digest) ----------
function bangkokToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) // YYYY-MM-DD
}
function bangkokNow(): string {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })
}

async function buildHealthText(): Promise<string> {
  const { getSupabaseClient } = await import('./lib/supabase')
  const { data: health, error } = await getSupabaseClient().rpc('get_system_health')
  if (error || !health) return `🔴 อ่านสถานะระบบไม่ได้: ${error?.message || 'no data'}`
  const connPct = Math.round((100 * health.connections_total) / health.connections_max)
  const light = connPct >= 80 ? '🔴' : connPct >= 67 ? '🟡' : '🟢'
  return (
    `${light} DB connections: <b>${health.connections_total}/${health.connections_max}</b> (${connPct}%)\n` +
    `📡 Realtime subscriptions: <b>${health.realtime_subscriptions}</b> (เพดาน 500)\n` +
    `⏱ Query ค้าง >30วิ: <b>${health.long_running_queries}</b> ตัว` +
    (health.long_running_queries > 0 ? ` (นานสุด ${health.oldest_active_query_seconds}s)` : '')
  )
}

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'รอรับ', confirmed: 'ยืนยันแล้ว', assigned: 'มอบหมายแล้ว',
  traveling: 'กำลังเดินทาง', arrived: 'ถึงแล้ว', in_progress: 'กำลังบริการ',
  completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}

async function buildBookingsText(): Promise<string> {
  const { getSupabaseClient } = await import('./lib/supabase')
  const today = bangkokToday()
  const { data: jobs, error } = await getSupabaseClient()
    .from('jobs')
    .select('status')
    .eq('scheduled_date', today)
  if (error) return `🔴 อ่านข้อมูลงานไม่ได้: ${error.message}`
  if (!jobs || jobs.length === 0) return `วันนี้ (${today}) ยังไม่มีงานในระบบ`
  const byStatus: Record<string, number> = {}
  for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1
  const lines = Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `• ${JOB_STATUS_LABELS[s] || s}: <b>${n}</b>`)
  return `📋 งานวันนี้ (${today}) รวม <b>${jobs.length}</b> งาน\n${lines.join('\n')}`
}

async function buildStaffText(): Promise<string> {
  const { getSupabaseClient } = await import('./lib/supabase')
  const { data: jobs, error } = await getSupabaseClient()
    .from('jobs')
    .select('staff_id, status')
    .in('status', ['traveling', 'arrived', 'in_progress'])
    .eq('scheduled_date', bangkokToday())
  if (error) return `🔴 อ่านข้อมูลพนักงานไม่ได้: ${error.message}`
  const working = new Set((jobs || []).map((j) => j.staff_id).filter(Boolean))
  const byStatus: Record<string, number> = {}
  for (const j of jobs || []) byStatus[j.status] = (byStatus[j.status] || 0) + 1
  return (
    `👷 พนักงานกำลังปฏิบัติงาน: <b>${working.size}</b> คน\n` +
    (jobs && jobs.length
      ? Object.entries(byStatus).map(([s, n]) => `• ${JOB_STATUS_LABELS[s] || s}: <b>${n}</b> งาน`).join('\n')
      : 'ไม่มีงาน active ตอนนี้')
  )
}

// ============ TELEGRAM BOT WEBHOOK (/status /bookings /staff on demand) ============
// Lets the owner ask the bot for live snapshots anytime. Secured by (1) Telegram's
// secret_token header set via setWebhook and (2) responding only to TELEGRAM_CHAT_ID.
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  // [FIX] Do ALL async work (Supabase reads + Telegram send) BEFORE responding.
  // On Vercel serverless the function is frozen once the response is flushed, so
  // work started after res.json() failed with "TypeError: fetch failed". The health
  // check is ~1-2s, well under Telegram's webhook timeout.
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
      console.warn('[TelegramBot] webhook secret mismatch — ignoring')
      return res.status(200).json({ ok: true })
    }
    const msg = req.body?.message
    const chatId = String(msg?.chat?.id || '')
    const text: string = msg?.text || ''
    if (!chatId || chatId !== String(process.env.TELEGRAM_CHAT_ID || '')) {
      return res.status(200).json({ ok: true })
    }

    if (/^\/status/.test(text)) {
      await sendTelegramAlert(
        `<b>[Bliss Monitor ${bangkokNow()}]</b>\n${await buildHealthText()}\n\n📊 กราฟเต็ม: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/reports/database`
      )
    } else if (/^\/bookings/.test(text)) {
      await sendTelegramAlert(`<b>[Bliss Monitor ${bangkokNow()}]</b>\n${await buildBookingsText()}`)
    } else if (/^\/staff/.test(text)) {
      await sendTelegramAlert(`<b>[Bliss Monitor ${bangkokNow()}]</b>\n${await buildStaffText()}`)
    } else if (/^\/(start|help)/.test(text)) {
      await sendTelegramAlert(
        '<b>[Bliss Monitor]</b> คำสั่งที่ใช้ได้:\n' +
        '/status — สถานะระบบสด (connections / realtime / query ค้าง)\n' +
        '/bookings — สรุปงานวันนี้แยกตามสถานะ\n' +
        '/staff — พนักงานที่กำลังปฏิบัติงานตอนนี้\n\n' +
        'ระบบเฝ้าอัตโนมัติทุก 5 นาที + สรุปเช้า 08:00 ทุกวัน — มีเหตุจะแจ้งเอง'
      )
    }
  } catch (err) {
    console.error('[TelegramBot] webhook error:', err)
  }
  return res.status(200).json({ ok: true })
})

// ============ DAILY DIGEST (Vercel cron 08:00 Bangkok = 01:00 UTC) ============
const dailyDigestHandler = async (_req: Request, res: Response) => {
  try {
    const [healthText, bookingsText, staffText] = await Promise.all([
      buildHealthText(), buildBookingsText(), buildStaffText(),
    ])
    const sent = await sendTelegramAlert(
      `☀️ <b>[Bliss สรุปเช้า ${bangkokNow()}]</b>\n\n${bookingsText}\n\n${staffText}\n\n<b>สุขภาพระบบ</b>\n${healthText}`
    )
    return res.json({ success: true, sent })
  } catch (error) {
    console.error('[DailyDigest] Error:', error)
    return res.status(500).json({ success: false, error: String(error) })
  }
}
app.get('/api/cron/daily-digest', dailyDigestHandler)
app.post('/api/cron/daily-digest', dailyDigestHandler)

// ============ LINE HEALTH CHECK (cron existed in vercel.json but the endpoint was
// missing — every 30-min invocation 404'd. Minimal implementation: verify the LINE
// channel token is configured and the LINE API accepts it.) ============
const lineHealthHandler = async (_req: Request, res: Response) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return res.json({ success: false, configured: false, message: 'LINE_CHANNEL_ACCESS_TOKEN not set' })
  try {
    const resp = (await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` },
    })) as unknown as { ok: boolean; status: number }
    if (!resp.ok) {
      // Token rejected → LINE notifications are silently broken; tell the owner
      await sendTelegramAlert(`🔴 <b>[Bliss Monitor]</b> LINE channel token ใช้ไม่ได้ (HTTP ${resp.status}) — แจ้งเตือน LINE ของระบบอาจไม่ถูกส่ง!`)
    }
    return res.json({ success: resp.ok, configured: true, status: resp.status })
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) })
  }
}
app.get('/api/cron/line-health-check', lineHealthHandler)
app.post('/api/cron/line-health-check', lineHealthHandler)

// ============ PART46 cron auth guard (NEW routes only) ============
// The older cron routes above stay OPEN (unchanged). The new job-reminders + overdue-jobs
// routes push LINE / insert notifications, so gate them: allow Vercel Cron (it injects the
// `x-vercel-cron` header) OR a manual `Authorization: Bearer $CRON_SECRET`. In non-production,
// allow unauthenticated so local curl/Playwright tests can trigger the code path.
function isAuthorizedCron(req: Request): boolean {
  if (req.headers['x-vercel-cron']) return true
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] === `Bearer ${secret}`) return true
  if (process.env.NODE_ENV !== 'production') return true
  return false
}

// ============ JOB REMINDERS (Vercel cron every minute) — in-app + LINE to staff ============
// Configurable per-staff reminder using staff.reminder_minutes lead-times chosen on
// /staff/settings. Sends an in-app notification (always) + a LINE push (if the staff has a
// LINE id). Replaces the dormant reminderService fixed-time path (PART46 decision R1-A).
const jobRemindersHandler = async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ success: false, error: 'unauthorized' })
  try {
    const processed = await processJobReminders()
    return res.json({ success: true, processed, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[Cron] job-reminders error:', error)
    return res.status(500).json({ success: false, error: String(error) })
  }
}
app.get('/api/cron/job-reminders', jobRemindersHandler)
app.post('/api/cron/job-reminders', jobRemindersHandler)

// ============ OVERDUE-NOT-STARTED (Vercel cron every 5 min) — staff in-app+LINE, admin in-app ============
// Detects jobs a staff accepted but never started (scheduled time passed + grace window).
// Also runs cleanupOldReminders() here (every 5 min) so the dedup tables don't grow unbounded
// — those cleanups were never wired before (node-cron disabled). (PART46 R2)
const overdueJobsHandler = async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) return res.status(401).json({ success: false, error: 'unauthorized' })
  try {
    const processed = await processOverdueJobs()
    await cleanupOldReminders()
    return res.json({ success: true, processed, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[Cron] overdue-jobs error:', error)
    return res.status(500).json({ success: false, error: String(error) })
  }
}
app.get('/api/cron/overdue-jobs', overdueJobsHandler)
app.post('/api/cron/overdue-jobs', overdueJobsHandler)


// Dev-only endpoint to trigger credit reminders manually
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/trigger-credit-reminders', async (_req, res) => {
    try {
      const count = await processCreditDueReminders()
      res.json({ success: true, remindersSent: count })
    } catch (err) {
      console.error('[Dev] Error triggering credit reminders:', err)
      res.status(500).json({ success: false, error: String(err) })
    }
  })
}

// Dev endpoint to trigger job reminders manually
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/trigger-job-reminders', async (_req, res) => {
    try {
      console.log('🔔 [Dev] Manually triggering job reminders...')
      await reminderService.sendScheduledReminders()
      res.json({ success: true, message: 'Job reminders triggered successfully' })
    } catch (err) {
      console.error('[Dev] Error triggering job reminders:', err)
      res.status(500).json({ success: false, error: String(err) })
    }
  })
}

// Dev endpoint to test LINE notification
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/test-line', async (req, res) => {
    try {
      const { line_user_id } = req.body
      if (!line_user_id) {
        return res.status(400).json({ success: false, error: 'line_user_id required' })
      }

      const { lineService } = await import('./services/lineService')
      const success = await lineService.pushMessage(line_user_id, [{
        type: 'text',
        text: '🧪 ทดสอบ LINE Notification\nระบบแจ้งเตือนทำงานปกติ!'
      }])

      res.json({
        success,
        message: success ? 'LINE test message sent!' : 'LINE test failed - check server logs'
      })
    } catch (err) {
      console.error('[Dev] Error testing LINE:', err)
      res.status(500).json({ success: false, error: String(err) })
    }
  })
}

// LINE Health monitoring endpoint (available in all environments)
app.get('/api/line/health', async (req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!token) {
      return res.status(500).json({
        success: false,
        error: 'LINE token not configured',
        timestamp: new Date().toISOString()
      })
    }

    // Test LINE API connectivity
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const fetchResponse: any = await fetch('https://api.line.me/v2/bot/quota', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!fetchResponse.ok) {
      const error = await fetchResponse.json()
      return res.status(fetchResponse.status).json({
        success: false,
        status: fetchResponse.status,
        error: error,
        timestamp: new Date().toISOString()
      })
    }

    const data = await fetchResponse.json()
    res.json({
      success: true,
      quota: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return res.status(408).json({
        success: false,
        error: 'Timeout - LINE API took too long to respond',
        timestamp: new Date().toISOString()
      })
    }

    res.status(500).json({
      success: false,
      error: error?.toString() || 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

// Dev endpoint to test new job notification with specific link
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/test-job-notification', async (req, res) => {
    try {
      const { line_user_id, job_id } = req.body
      if (!line_user_id || !job_id) {
        return res.status(400).json({ success: false, error: 'line_user_id and job_id required' })
      }

      const { lineService } = await import('./services/lineService')

      // Sample job data
      const jobData = {
        serviceName: 'Thai Massage 90 นาทีThai Massage 90 นาที',
        scheduledDate: '2026-05-14',
        scheduledTime: '14:00',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ',
        staffEarnings: 1500,
        durationMinutes: 90,
        jobIds: [job_id],
        isRescheduled: false
      }

      const success = await lineService.sendNewJobToStaff([line_user_id], jobData)

      res.json({
        success,
        message: success ? 'New job notification sent with job-specific link!' : 'Failed to send notification',
        jobLink: `${process.env.STAFF_LIFF_URL}/staff/jobs/${job_id}`
      })
    } catch (err) {
      console.error('[Dev] Error testing job notification:', err)
      res.status(500).json({ success: false, error: String(err) })
    }
  })
}

// Dev endpoint for mock payment (when OMISE keys not available)
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_PAYMENT === 'true') {
  app.post('/api/payments/mock-success', async (req, res) => {
    try {
      const { booking_id, amount } = req.body

      // Simulate successful payment
      console.log(`🧪 [Mock Payment] Simulating payment success for booking ${booking_id}, amount: ฿${amount}`)

      // You can add logic here to update booking status to 'confirmed'
      // and create payment record if needed

      res.json({
        success: true,
        payment_id: `mock_payment_${Date.now()}`,
        status: 'successful',
        amount: amount,
        message: 'Mock payment successful - for development only'
      })
    } catch (err) {
      console.error('[Mock Payment] Error:', err)
      res.status(500).json({ success: false, error: String(err) })
    }
  })
}

// Dev endpoint to trigger payout cutoff manually
app.post('/api/dev/trigger-payout-cutoff', async (req: Request, res: Response) => {
  try {
    // Accept optional date override: { "date": "2026-04-10" }
    const overrideDate = req.body?.date ? new Date(req.body.date + 'T01:00:00Z') : undefined
    const result = await processPayoutCutoff(overrideDate)
    res.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[Dev] Error triggering payout cutoff:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Dev endpoint to trigger points expiry manually
app.post('/api/dev/trigger-points-expiry', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()
    const expiryResult = await processPointsExpiry(supabase as any)
    const warningResult = await processExpiryWarnings(supabase as any)
    res.json({ success: true, ...expiryResult, warningsSent: warningResult.warningCount })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Dev endpoint to check hotels discount data and impact
app.post('/api/dev/check-hotels-discount', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()

    // ดึงข้อมูล hotels พร้อม discount_rate และ discount_amount ปัจจุบัน
    const { data: hotels, error } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, discount_rate, discount_amount, commission_rate, status')
      .order('created_at', { ascending: false })

    if (error) throw error

    // วิเคราะห์ข้อมูล hotels
    const totalHotels = hotels?.length || 0
    const hotelsWithDiscount = hotels?.filter(h => h.discount_rate > 0) || []
    const discountRates = hotelsWithDiscount.map(h => h.discount_rate)
    const avgDiscountRate = discountRates.length > 0
      ? discountRates.reduce((a, b) => a + b, 0) / discountRates.length
      : 0

    // ตรวจสอบ bookings ที่ยังไม่เสร็จ
    const { data: pendingBookings } = await supabase
      .from('bookings')
      .select('id, hotel_id, final_price, discount_amount, status, created_at, hotels!inner(name_th, discount_rate)')
      .in('status', ['pending', 'confirmed'])
      .not('hotel_id', 'is', null)
      .order('created_at', { ascending: false })

    const totalPendingBookings = pendingBookings?.length || 0
    const affectedBookings = pendingBookings?.filter(b => (b.hotels as any)?.discount_rate > 0) || []

    res.json({
      success: true,
      analysis: {
        totalHotels,
        hotelsWithDiscount: hotelsWithDiscount.length,
        hotelsWithoutDiscount: totalHotels - hotelsWithDiscount.length,
        avgDiscountRate: Math.round(avgDiscountRate * 100) / 100,
        minDiscountRate: Math.min(...discountRates) || 0,
        maxDiscountRate: Math.max(...discountRates) || 0,
        // ข้อมูล bookings
        totalPendingBookings,
        affectedBookings: affectedBookings.length,
        totalPendingValue: pendingBookings?.reduce((sum, b) => sum + (b.final_price || 0), 0) || 0
      },
      hotels: hotels?.map(h => ({
        id: h.id,
        name: h.name_th,
        discount_rate: h.discount_rate,
        status: h.status
      })) || [],
      impactExamples: [
        {
          servicePrice: 2000,
          discounts: discountRates.map(rate => ({
            percentage: rate,
            oldDiscount: Math.round(2000 * rate / 100),
            suggestedNewDiscount: Math.round(2000 * rate / 100) // แนะนำให้ใช้ค่าเดิม
          }))
        },
        {
          servicePrice: 5000,
          discounts: discountRates.map(rate => ({
            percentage: rate,
            oldDiscount: Math.round(5000 * rate / 100),
            suggestedNewDiscount: Math.min(Math.round(5000 * rate / 100), 1000) // จำกัดไม่เกิน 1,000
          }))
        }
      ]
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Dev endpoint to force migration via SQL function
app.post('/api/dev/force-migration', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()
    const { action, sql } = req.body

    if (action === 'create_function') {
      console.log('🔥 Creating temp function for DDL...')

      // Create temp function that can run ALTER TABLE
      const functionSQL = `
        CREATE OR REPLACE FUNCTION temp_add_discount_amount()
        RETURNS text AS $func$
        BEGIN
          -- Check if column exists
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'hotels' AND column_name = 'discount_amount'
          ) THEN
            -- Add the column
            EXECUTE 'ALTER TABLE hotels ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL';
            RETURN 'SUCCESS: Column discount_amount added';
          ELSE
            RETURN 'INFO: Column discount_amount already exists';
          END IF;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
      `

      // Try to execute via raw SQL (this might not work with Supabase client)
      console.log('📝 Function SQL created')

      // Attempt to call the function after creation
      const { data: result, error } = await supabase.rpc('temp_add_discount_amount')

      if (error) {
        console.log('⚠️ Direct function call failed:', error.message)
        return res.json({
          success: false,
          error: error.message,
          solution: 'Manual Dashboard execution required',
          dashboardUrl: 'https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql',
          sql: 'ALTER TABLE hotels ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;'
        })
      }

      res.json({
        success: true,
        result,
        message: 'Migration completed via temp function'
      })

    } else {
      res.status(400).json({ success: false, error: 'Invalid action' })
    }

  } catch (err: any) {
    console.error('🚨 Force migration error:', err.message)
    res.json({
      success: false,
      error: err.message,
      finalSolution: {
        message: 'Use Supabase Dashboard SQL Editor',
        url: 'https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql',
        sql: 'ALTER TABLE hotels ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;'
      }
    })
  }
})

// Dev endpoint to check if migration was successful
app.post('/api/dev/check-migration', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()

    // Check if discount_amount column exists
    const { data: checkData } = await supabase
      .from('hotels')
      .select('*')
      .limit(1)
      .single()

    const hasDiscountAmount = checkData && 'discount_amount' in checkData

    res.json({
      success: true,
      migrationStatus: hasDiscountAmount ? 'completed' : 'pending',
      columnsFound: checkData ? Object.keys(checkData) : [],
      sampleData: checkData
    })

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 404 handler
app.use((req: Request, res: Response) => {
  console.log('❌ 404 handler called for path:', req.path, 'method:', req.method)
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  })
})

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// === Cron Jobs ===
// NOTE: Cron jobs are handled by Vercel Cron (see vercelon) calling API endpoints
// instead of node-cron for serverless compatibility

// DISABLED: Traditional cron jobs don't work in serverless environment
// These are now handled by Vercel Cron calling dedicated API endpoints
//
// All cron functionality has been migrated to Vercel Cron endpoints:
// - /api/cron/daily-payout (daily at 00:01)
// - /api/cron/line-health-check (every 30 minutes)
//
// Original cron schedules (now handled by separate API endpoints):
//
// Check for due job reminders every minute
// cron.schedule('* * * * *', processJobReminders)
//
// Check for due customer email reminders every 5 minutes
// cron.schedule('[star]/5 * * * *', processCustomerEmailReminders)
//
// Check for unassigned jobs and escalate every 5 minutes
// cron.schedule('[star]/5 * * * *', processJobEscalations)
//
// Cleanup old reminder records daily at 3 AM (Thailand time)
// cron.schedule('0 20 * * *', cleanupOldReminders)
//
// Credit due reminders daily at 9 AM (Thailand time)
// cron.schedule('0 2 * * *', processCreditDueReminders)
//
// Job reminders check every hour (3 days, 1 day, 2 hours before job)
// cron.schedule('0 * * * *', reminderService.sendScheduledReminders)
//
// Points expiry check daily at 1 AM (Thailand time = 18:00 UTC prev day)
// cron.schedule('0 18 * * *', processPointsExpiry)
//
// Payout cutoff check daily at 8 AM (Thailand time = 01:00 UTC)
// cron.schedule('0 1 * * *', processPayoutCutoff)
//
// Enhanced payout processing for new schedule types (daily at 8:30 AM Thailand time = 01:30 UTC)
// cron.schedule('30 1 * * *', processEnhancedPayoutCron)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bliss Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⏰ Cron: Handled by Vercel Cron (see vercelon) - not node-cron for serverless compatibility`)
})

export default app
