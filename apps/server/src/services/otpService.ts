/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 */

// In-memory storage for OTP codes
// TODO: In production, use Redis for distributed systems
interface OTPRecord {
  code: string
  phoneNumber: string
  expiresAt: number
  attempts: number
}

const otpStore = new Map<string, OTPRecord>()

// Constants
const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3
const RESEND_COOLDOWN_SECONDS = 60

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Store OTP code
 */
export function storeOTP(phoneNumber: string, code: string): void {
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000

  otpStore.set(phoneNumber, {
    code,
    phoneNumber,
    expiresAt,
    attempts: 0,
  })

  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStore.delete(phoneNumber)
  }, OTP_EXPIRY_MINUTES * 60 * 1000)
}

/**
 * Verify OTP code
 */
export function verifyOTP(phoneNumber: string, code: string): { success: boolean; error?: string } {
  const record = otpStore.get(phoneNumber)

  if (!record) {
    return { success: false, error: 'OTP not found or expired' }
  }

  // Check expiry
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phoneNumber)
    return { success: false, error: 'OTP has expired' }
  }

  // Check max attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phoneNumber)
    return { success: false, error: 'Too many failed attempts' }
  }

  // Verify code
  if (record.code !== code) {
    record.attempts += 1
    return { success: false, error: 'Invalid OTP code' }
  }

  // Success - delete OTP
  otpStore.delete(phoneNumber)
  return { success: true }
}

/**
 * Check if OTP exists and not expired
 */
export function hasValidOTP(phoneNumber: string): boolean {
  const record = otpStore.get(phoneNumber)
  if (!record) return false
  return Date.now() <= record.expiresAt
}

/**
 * Get remaining time for OTP
 */
export function getRemainingTime(phoneNumber: string): number {
  const record = otpStore.get(phoneNumber)
  if (!record) return 0

  const remaining = Math.max(0, record.expiresAt - Date.now())
  return Math.floor(remaining / 1000) // Return in seconds
}

/**
 * Clear OTP for a phone number
 */
export function clearOTP(phoneNumber: string): void {
  otpStore.delete(phoneNumber)
}

/**
 * Check if can resend OTP (cooldown period)
 */
export function canResendOTP(phoneNumber: string): boolean {
  const record = otpStore.get(phoneNumber)
  if (!record) return true

  // Check if OTP was created recently (within cooldown)
  const timeSinceCreation = Date.now() - (record.expiresAt - OTP_EXPIRY_MINUTES * 60 * 1000)
  return timeSinceCreation > RESEND_COOLDOWN_SECONDS * 1000
}

export const otpService = {
  generateOTP,
  storeOTP,
  verifyOTP,
  hasValidOTP,
  getRemainingTime,
  clearOTP,
  canResendOTP,
}
