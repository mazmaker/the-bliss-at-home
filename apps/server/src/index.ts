// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
import paymentRoutes from './routes/payment.js'
import otpRoutes from './routes/otp.js'
import hotelRoutes from './routes/hotel.js'
import notificationRoutes from './routes/notification.js'

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
      notifications: '/api/notifications',
    },
  })
})

// Payment routes
app.use('/api/payments', paymentRoutes)

// OTP routes
app.use('/api/otp', otpRoutes)

// Hotel authentication routes
app.use('/api/hotels', hotelRoutes)

// Notification routes
app.use('/api/notifications', notificationRoutes)

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bliss Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
