import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Use vi.hoisted to avoid "Cannot access before initialization" error
const { mockHotelAuthService } = vi.hoisted(() => ({
  mockHotelAuthService: {
    createHotelAccount: vi.fn().mockResolvedValue({
      userId: 'user-1',
      temporaryPassword: 'Pass123!',
      resetToken: 'token-123',
    }),
    sendHotelInvitation: vi.fn().mockResolvedValue(undefined),
    initiateHotelPasswordReset: vi.fn().mockResolvedValue({
      temporaryPassword: 'NewPass123!',
      resetToken: 'new-token',
    }),
    toggleHotelLoginAccess: vi.fn().mockResolvedValue(undefined),
    changeHotelPassword: vi.fn().mockResolvedValue(undefined),
    getHotelAuthStatus: vi.fn().mockResolvedValue({
      hasAccount: true,
      loginEnabled: true,
      loginEmail: 'hotel@test.com',
    }),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    verifyResetToken: vi.fn().mockResolvedValue(true),
    markPasswordChangeCompleted: vi.fn().mockResolvedValue(undefined),
    isEmailServiceReady: vi.fn().mockReturnValue(true),
  },
}))

vi.mock('../../services/hotelAuthService.js', () => ({
  hotelAuthService: mockHotelAuthService,
}))

// Mock email service for test-email route
vi.mock('../../services/emailService.js', () => ({
  emailService: {
    sendHotelInvitation: vi.fn().mockResolvedValue(undefined),
  },
}))

import hotelRouter from '../hotel'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/hotels', hotelRouter)
  return app
}

describe('hotel routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_API_TOKEN = 'test-admin-token'
  })

  describe('POST /api/hotels/create-account', () => {
    it('should return 401 without admin token', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/create-account')
        .send({ hotelId: 'h1', loginEmail: 'test@hotel.com' })

      expect(res.status).toBe(401)
    })

    it('should return 400 when hotelId is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/create-account')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ loginEmail: 'test@hotel.com' })

      expect(res.status).toBe(400)
    })

    it('should return 400 when loginEmail is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/create-account')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1' })

      expect(res.status).toBe(400)
    })

    it('should create account with valid inputs', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/create-account')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1', loginEmail: 'test@hotel.com' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.userId).toBe('user-1')
      expect(mockHotelAuthService.createHotelAccount).toHaveBeenCalledWith('h1', 'test@hotel.com')
    })
  })

  describe('POST /api/hotels/send-invitation', () => {
    it('should return 400 when hotelId is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/send-invitation')
        .set('Authorization', 'Bearer test-admin-token')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should send invitation successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/send-invitation')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1', adminName: 'Admin' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockHotelAuthService.sendHotelInvitation).toHaveBeenCalledWith('h1', 'Admin')
    })
  })

  describe('POST /api/hotels/reset-password', () => {
    it('should return 400 when hotelId is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/reset-password')
        .set('Authorization', 'Bearer test-admin-token')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should reset password successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/reset-password')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('temporaryPassword')
    })
  })

  describe('POST /api/hotels/toggle-login', () => {
    it('should return 400 when enabled is not boolean', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/toggle-login')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1', enabled: 'yes' })

      expect(res.status).toBe(400)
    })

    it('should toggle login access', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/toggle-login')
        .set('Authorization', 'Bearer test-admin-token')
        .send({ hotelId: 'h1', enabled: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/hotels/change-password', () => {
    it('should return 400 when fields are missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/change-password')
        .send({ currentPassword: 'old' })

      expect(res.status).toBe(400)
    })

    it('should return 400 when passwords dont match', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/change-password')
        .send({
          hotelId: 'h1',
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'DifferentPass123!',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Password mismatch')
    })

    it('should return 400 when password is too short', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/change-password')
        .send({
          hotelId: 'h1',
          currentPassword: 'OldPass123!',
          newPassword: 'Sh1!',
          confirmPassword: 'Sh1!',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Weak password')
    })

    it('should return 400 for weak passwords', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/change-password')
        .send({
          hotelId: 'h1',
          currentPassword: 'OldPass123!',
          newPassword: 'password',
          confirmPassword: 'password',
        })

      expect(res.status).toBe(400)
    })

    it('should return 400 when same as current password', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/change-password')
        .send({
          hotelId: 'h1',
          currentPassword: 'OldPass123!',
          newPassword: 'OldPass123!',
          confirmPassword: 'OldPass123!',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Same password')
    })
  })

  describe('POST /api/hotels/forgot-password', () => {
    it('should return 400 when email is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/forgot-password')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should always return success for security', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/forgot-password')
        .send({ email: 'nonexistent@hotel.com' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /api/hotels/verify-reset-token', () => {
    it('should return 400 when token is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/verify-reset-token')
        .send({})

      expect(res.status).toBe(400)
    })

    it('should verify valid token', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/hotels/verify-reset-token')
        .send({ token: 'valid-token' })

      expect(res.status).toBe(200)
      expect(res.body.valid).toBe(true)
    })
  })

  describe('GET /api/hotels/health', () => {
    it('should return health status', async () => {
      const app = createApp()
      const res = await request(app).get('/api/hotels/health')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.service).toBe('hotel-auth')
      expect(res.body).toHaveProperty('emailServiceReady')
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(hotelRouter).toBeDefined()
    })
  })
})
