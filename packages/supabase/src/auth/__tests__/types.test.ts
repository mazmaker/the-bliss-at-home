import { describe, it, expect } from 'vitest'
import { AuthError, APP_CONFIGS } from '../types'
import type { UserRole } from '../types'

describe('AuthError', () => {
  it('extends Error', () => {
    const error = new AuthError('test message')
    expect(error).toBeInstanceOf(Error)
  })

  it('has name AuthError', () => {
    const error = new AuthError('test')
    expect(error.name).toBe('AuthError')
  })

  it('stores message correctly', () => {
    const error = new AuthError('Invalid credentials')
    expect(error.message).toBe('Invalid credentials')
  })

  it('stores code correctly', () => {
    const error = new AuthError('test', 'INVALID_CREDENTIALS')
    expect(error.code).toBe('INVALID_CREDENTIALS')
  })

  it('code is undefined when not provided', () => {
    const error = new AuthError('test')
    expect(error.code).toBeUndefined()
  })
})

describe('APP_CONFIGS', () => {
  it('has all four roles defined', () => {
    const roles: UserRole[] = ['ADMIN', 'CUSTOMER', 'HOTEL', 'STAFF']
    roles.forEach(role => {
      expect(APP_CONFIGS[role]).toBeDefined()
    })
  })

  it('ADMIN uses port 3001', () => {
    expect(APP_CONFIGS.ADMIN.port).toBe(3001)
  })

  it('CUSTOMER uses port 3002', () => {
    expect(APP_CONFIGS.CUSTOMER.port).toBe(3002)
  })

  it('HOTEL uses port 3003', () => {
    expect(APP_CONFIGS.HOTEL.port).toBe(3003)
  })

  it('STAFF uses port 3004', () => {
    expect(APP_CONFIGS.STAFF.port).toBe(3004)
  })

  it('each config has required fields', () => {
    Object.values(APP_CONFIGS).forEach(config => {
      expect(config).toHaveProperty('name')
      expect(config).toHaveProperty('port')
      expect(config).toHaveProperty('allowedRole')
      expect(config).toHaveProperty('loginPath')
      expect(config).toHaveProperty('defaultPath')
    })
  })

  it('allowedRole matches the key', () => {
    const roles: UserRole[] = ['ADMIN', 'CUSTOMER', 'HOTEL', 'STAFF']
    roles.forEach(role => {
      expect(APP_CONFIGS[role].allowedRole).toBe(role)
    })
  })
})
