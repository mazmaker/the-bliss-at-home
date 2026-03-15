import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dotenv before anything else
vi.mock('dotenv', () => ({ config: vi.fn() }))

// Use vi.hoisted to avoid "Cannot access before initialization" error
const { mockServiceFrom, mockUserGetUser } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
  mockUserGetUser: vi.fn(),
}))

// Mock Supabase chainable builder
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.map = vi.fn().mockReturnValue([])
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string, opts?: any) => {
    // If opts with headers (user context client), return auth mock
    if (opts?.global?.headers?.Authorization) {
      return {
        auth: { getUser: mockUserGetUser },
        from: vi.fn(),
      }
    }
    // Service role client
    return {
      from: mockServiceFrom,
    }
  }),
}))

vi.mock('../../services/staffAssignmentService', () => ({
  staffAssignmentService: {
    assignStaff: vi.fn(),
  },
}))

// Set environment variables before import
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key')

import express from 'express'
import request from 'supertest'
import router from '../secure-bookings-v2'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/secure-bookings-v2', router)
  return app
}

describe('secure-bookings-v2 routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/secure-bookings-v2', () => {
    it('should return 401 when no token is provided', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/secure-bookings-v2')
        .send({ hotel_id: 'h1' })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('No token provided')
    })

    it('should return 401 when token is invalid', async () => {
      mockUserGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/secure-bookings-v2')
        .set('Authorization', 'Bearer invalid-token')
        .send({ hotel_id: 'h1' })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid token')
    })

    it('should return 401 when user profile is not found', async () => {
      mockUserGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockServiceFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/secure-bookings-v2')
        .set('Authorization', 'Bearer valid-token')
        .send({ hotel_id: 'h1' })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('User profile not found')
    })

    it('should return 403 when user is not HOTEL role', async () => {
      mockUserGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockServiceFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'user-1', role: 'CUSTOMER', email: 'cust@test.com' },
          error: null,
        })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/secure-bookings-v2')
        .set('Authorization', 'Bearer valid-token')
        .send({ hotel_id: 'h1' })

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('Hotel role required')
    })
  })

  describe('GET /api/secure-bookings-v2', () => {
    it('should return 401 when no token is provided', async () => {
      const app = createApp()
      const res = await request(app).get('/api/secure-bookings-v2')

      expect(res.status).toBe(401)
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(router).toBeDefined()
    })
  })
})
