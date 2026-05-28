// Load environment variables FIRST before any other imports (only for local development)
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Only load .env file if running locally (not on Vercel)
if (!process.env.VERCEL && !process.env.NODE_ENV?.includes('production')) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  try {
    dotenv.config({ path: join(__dirname, '..', '.env') })
    console.log('✅ Loaded .env file for local development')
  } catch (error) {
    console.log('⚠️ No .env file found (running on Vercel or production)')
  }
}

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
import { reminderService } from './services/reminderService.js'
import { processPayoutCutoff } from './services/payoutService.js'
import { getSupabaseClient } from './lib/supabase.js'
// Skip shared package imports for Vercel compatibility
// import { processPointsExpiry, processExpiryWarnings } from '../../../packages/supabase/src/services/loyaltyService.js'

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
    'http://localhost:3008', // Customer app dev port
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

      const { lineService } = await import('./services/lineService.js')
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

// Dev endpoint to test new job notification with specific link
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/test-job-notification', async (req, res) => {
    try {
      const { line_user_id, job_id } = req.body
      if (!line_user_id || !job_id) {
        return res.status(400).json({ success: false, error: 'line_user_id and job_id required' })
      }

      const { lineService } = await import('./services/lineService.js')

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

// Job reminders check every hour (3 days, 1 day, 2 hours before job)
cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔔 [Cron] Checking job reminders (3 days, 1 day, 2 hours)...')
    await reminderService.sendScheduledReminders()
    console.log('✅ [Cron] Job reminders processed successfully')
  } catch (err) {
    console.error('❌ [Cron] Error processing job reminders:', err)
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

// Payout cutoff check daily at 8 AM (Thailand time = 01:00 UTC)
cron.schedule('0 1 * * *', async () => {
  // 01:00 UTC = 08:00 ICT (Thailand)
  try {
    const result = await processPayoutCutoff()
    if (result.payoutsCreated > 0 || result.carryForwards > 0) {
      console.log(`[Cron] Payout cutoff: ${result.payoutsCreated} payouts created, ${result.carryForwards} carry-forwards`)
    }
  } catch (err) {
    console.error('[Cron] Error processing payout cutoff:', err)
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bliss Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⏰ Cron: Staff LINE reminders (1min), Customer email reminders (5min), Job escalations (5min), Credit due reminders (daily 9AM ICT), Points expiry (daily 1AM ICT), Payout cutoff (daily 8AM ICT)`)
})

export default app
