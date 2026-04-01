// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cron from 'node-cron'
import paymentRoutes from './routes/payment.js'
import otpRoutes from './routes/otp.js'
import hotelRoutes from './routes/hotel.js'
import secureBookingsRoutes from './routes/secure-bookings-v2.js'
import notificationRoutes from './routes/notification.js'
import bookingsRoutes from './routes/bookings.js'
import cancellationPolicyRoutes from './routes/cancellationPolicy.js'
import receiptsRoutes from './routes/receipts.js'
import invoicesRoutes from './routes/invoices.js'
import { processJobReminders, cleanupOldReminders, processCustomerEmailReminders, processJobEscalations, processCreditDueReminders } from './services/notificationService.js'
import { getSupabaseClient } from './lib/supabase.js'
import { processPointsExpiry, processExpiryWarnings } from '../../../packages/supabase/src/services/loyaltyService.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
app.use('/api/cancellation-policy', cancellationPolicyRoutes)

// Receipt & Credit Note routes
app.use('/api/receipts', receiptsRoutes)

// Invoice email routes
app.use('/api/invoices', invoicesRoutes)

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

// 404 handler
app.use((req: Request, res: Response) => {
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

// Check for due job reminders every minute
cron.schedule('* * * * *', async () => {
  try {
    const count = await processJobReminders()
    if (count > 0) console.log(`[Cron] Sent ${count} job reminders`)
  } catch (err) {
    console.error('[Cron] Error processing reminders:', err)
  }
})

// Check for due customer email reminders every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const count = await processCustomerEmailReminders()
    if (count > 0) console.log(`[Cron] Sent ${count} customer email reminders`)
  } catch (err) {
    console.error('[Cron] Error processing customer email reminders:', err)
  }
})

// Check for unassigned jobs and escalate every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const count = await processJobEscalations()
    if (count > 0) console.log(`[Cron] Processed ${count} job escalations`)
  } catch (err) {
    console.error('[Cron] Error processing job escalations:', err)
  }
})

// Cleanup old reminder records daily at 3 AM (Thailand time)
cron.schedule('0 20 * * *', async () => {
  // 20:00 UTC = 03:00 ICT (Thailand)
  try {
    await cleanupOldReminders()
  } catch (err) {
    console.error('[Cron] Error cleaning up reminders:', err)
  }
})

// Credit due reminders daily at 9 AM (Thailand time)
cron.schedule('0 2 * * *', async () => {
  // 02:00 UTC = 09:00 ICT (Thailand)
  try {
    const count = await processCreditDueReminders()
    if (count > 0) console.log(`[Cron] Sent ${count} credit due reminders`)
  } catch (err) {
    console.error('[Cron] Error processing credit due reminders:', err)
  }
})

// Points expiry check daily at 1 AM (Thailand time = 18:00 UTC prev day)
cron.schedule('0 18 * * *', async () => {
  // 18:00 UTC = 01:00 ICT (Thailand, next day)
  try {
    const supabase = getSupabaseClient()
    const result = await processPointsExpiry(supabase as any)
    if (result.expiredCount > 0) {
      console.log(`[Cron] Points expired: ${result.expiredCount} transactions, ${result.affectedCustomers.length} customers`)
    }
    const warnings = await processExpiryWarnings(supabase as any)
    if (warnings.warningCount > 0) {
      console.log(`[Cron] Expiry warnings sent: ${warnings.warningCount} customers`)
    }
  } catch (err) {
    console.error('[Cron] Error processing points expiry:', err)
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bliss Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⏰ Cron: Staff LINE reminders (1min), Customer email reminders (5min), Job escalations (5min), Credit due reminders (daily 9AM ICT), Points expiry (daily 1AM ICT)`)
})

export default app
