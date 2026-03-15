import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError, errorHandler, notFoundHandler } from '../errorHandler'

describe('errorHandler middleware', () => {
  const mockReq = { method: 'GET', path: '/api/test' } as any
  const mockNext = vi.fn()

  function createMockRes() {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AppError', () => {
    it('should create an operational error with status code and code', () => {
      const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input')
      expect(error.isOperational).toBe(true)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it('should allow non-operational errors', () => {
      const error = new AppError(500, 'SYSTEM_ERROR', 'Crash', false)
      expect(error.isOperational).toBe(false)
    })
  })

  describe('errorHandler', () => {
    it('should handle AppError with correct status and structure', () => {
      const error = new AppError(422, 'UNPROCESSABLE', 'Cannot process')
      const res = createMockRes()

      errorHandler(error, mockReq, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNPROCESSABLE',
          message: 'Cannot process',
        },
      })
    })

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Something broke')
      const res = createMockRes()

      errorHandler(error, mockReq, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: expect.any(String),
        },
      })
    })

    it('should expose error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Debug info')
      const res = createMockRes()

      errorHandler(error, mockReq, res, mockNext)

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Debug info',
        },
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should hide error message in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Secret details')
      const res = createMockRes()

      errorHandler(error, mockReq, res, mockNext)

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      })

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 with route information', () => {
      const req = { method: 'POST', path: '/api/unknown' } as any
      const res = createMockRes()

      notFoundHandler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route POST /api/unknown not found',
        },
      })
    })
  })
})
