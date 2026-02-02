import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3009

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
    message: 'The Bliss at Home - API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  })
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bliss Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
