import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Use vi.hoisted to avoid "Cannot access before initialization" error
const { mockOtpService, mockSmsService } = vi.hoisted(() => ({
  mockOtpService: {
    canResendOTP: vi.fn().mockReturnValue(true),
    getRemainingTime: vi.fn().mockReturnValue(300),
    generateOTP: vi.fn().mockReturnValue('123456'),
    storeOTP: vi.fn(),
    verifyOTP: vi.fn().mockReturnValue({ success: true }),
    clearOTP: vi.fn(),
    hasValidOTP: vi.fn().mockReturnValue(true),
  },
  mockSmsService: {
    sendOTP: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../../services/otpService.js', () => ({
  otpService: mockOtpService,
}))

vi.mock('../../services/smsService.js', () => ({
  smsService: mockSmsService,
}))

import otpRouter from '../otp'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/otp', otpRouter)
  return app
}

describe('otp routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOtpService.canResendOTP.mockReturnValue(true)
    mockOtpService.generateOTP.mockReturnValue('123456')
    mockOtpService.verifyOTP.mockReturnValue({ success: true })
    mockSmsService.sendOTP.mockResolvedValue(true)
  })

  describe('POST /api/otp/send', () => {
    it('should return 400 when phone_number is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/send')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Phone number')
    })

    it('should send OTP successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/send')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.expires_in).toBe(300)
      expect(mockOtpService.generateOTP).toHaveBeenCalled()
      expect(mockOtpService.storeOTP).toHaveBeenCalledWith('0812345678', '123456')
      expect(mockSmsService.sendOTP).toHaveBeenCalledWith('0812345678', '123456')
    })

    it('should return 429 when OTP resend is too soon', async () => {
      mockOtpService.canResendOTP.mockReturnValue(false)
      mockOtpService.getRemainingTime.mockReturnValue(260) // 260 remaining out of 300

      const app = createApp()
      const res = await request(app)
        .post('/api/otp/send')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(429)
      expect(res.body.error).toContain('wait')
    })

    it('should return 500 when SMS fails', async () => {
      mockSmsService.sendOTP.mockResolvedValueOnce(false)

      const app = createApp()
      const res = await request(app)
        .post('/api/otp/send')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(500)
      expect(res.body.error).toContain('Failed to send SMS')
    })
  })

  describe('POST /api/otp/verify', () => {
    it('should return 400 when phone_number is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/verify')
        .send({ code: '123456' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('required')
    })

    it('should return 400 when code is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/verify')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(400)
    })

    it('should verify OTP successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/verify')
        .send({ phone_number: '0812345678', code: '123456' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockOtpService.verifyOTP).toHaveBeenCalledWith('0812345678', '123456')
    })

    it('should return 400 when OTP verification fails', async () => {
      mockOtpService.verifyOTP.mockReturnValueOnce({
        success: false,
        error: 'Invalid OTP',
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/otp/verify')
        .send({ phone_number: '0812345678', code: '000000' })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/otp/resend', () => {
    it('should return 400 when phone_number is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/resend')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should resend OTP successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/otp/resend')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockOtpService.clearOTP).toHaveBeenCalledWith('0812345678')
      expect(mockOtpService.generateOTP).toHaveBeenCalled()
    })

    it('should return 500 when SMS fails on resend', async () => {
      mockSmsService.sendOTP.mockResolvedValueOnce(false)

      const app = createApp()
      const res = await request(app)
        .post('/api/otp/resend')
        .send({ phone_number: '0812345678' })

      expect(res.status).toBe(500)
    })
  })

  describe('GET /api/otp/status/:phone_number', () => {
    it('should return OTP status', async () => {
      mockOtpService.hasValidOTP.mockReturnValue(true)
      mockOtpService.getRemainingTime.mockReturnValue(200)
      mockOtpService.canResendOTP.mockReturnValue(false)

      const app = createApp()
      const res = await request(app).get('/api/otp/status/0812345678')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.has_valid_otp).toBe(true)
      expect(res.body.remaining_time).toBe(200)
      expect(res.body.can_resend).toBe(false)
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(otpRouter).toBeDefined()
    })
  })
})
