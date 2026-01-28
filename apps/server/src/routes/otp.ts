/**
 * OTP API Routes
 * Handles OTP sending and verification
 */

import { Router, Request, Response } from 'express'
import { otpService } from '../services/otpService.js'
import { smsService } from '../services/smsService.js'

const router = Router()

/**
 * POST /api/otp/send
 * Send OTP code to phone number
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body

    // Validate phone number
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    // Check if can resend (cooldown period)
    if (!otpService.canResendOTP(phone_number)) {
      const remainingTime = otpService.getRemainingTime(phone_number)
      const timeSinceCreation =
        300 - remainingTime // 5 minutes = 300 seconds

      if (timeSinceCreation < 60) {
        return res.status(429).json({
          success: false,
          error: 'Please wait before requesting a new OTP',
          retry_after: 60 - timeSinceCreation,
        })
      }
    }

    // Generate and store OTP
    const code = otpService.generateOTP()
    otpService.storeOTP(phone_number, code)

    // Send SMS
    const sent = await smsService.sendOTP(phone_number, code)

    if (!sent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send SMS',
      })
    }

    console.log(`✅ OTP sent to ${phone_number}`)

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      expires_in: 300, // 5 minutes in seconds
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send OTP',
    })
  }
})

/**
 * POST /api/otp/verify
 * Verify OTP code
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { phone_number, code } = req.body

    // Validate inputs
    if (!phone_number || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and code are required',
      })
    }

    // Verify OTP
    const result = otpService.verifyOTP(phone_number, code)

    if (!result.success) {
      return res.status(400).json(result)
    }

    console.log(`✅ OTP verified for ${phone_number}`)

    return res.json({
      success: true,
      message: 'OTP verified successfully',
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify OTP',
    })
  }
})

/**
 * POST /api/otp/resend
 * Resend OTP code (alias for /send with explicit resend intent)
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      })
    }

    // Clear existing OTP
    otpService.clearOTP(phone_number)

    // Generate new OTP
    const code = otpService.generateOTP()
    otpService.storeOTP(phone_number, code)

    // Send SMS
    const sent = await smsService.sendOTP(phone_number, code)

    if (!sent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send SMS',
      })
    }

    console.log(`✅ OTP resent to ${phone_number}`)

    return res.json({
      success: true,
      message: 'OTP resent successfully',
      expires_in: 300,
    })
  } catch (error: any) {
    console.error('Resend OTP error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to resend OTP',
    })
  }
})

/**
 * GET /api/otp/status/:phone_number
 * Check OTP status for a phone number
 */
router.get('/status/:phone_number', (req: Request, res: Response) => {
  try {
    const { phone_number } = req.params

    const hasValid = otpService.hasValidOTP(phone_number)
    const remainingTime = otpService.getRemainingTime(phone_number)
    const canResend = otpService.canResendOTP(phone_number)

    return res.json({
      success: true,
      has_valid_otp: hasValid,
      remaining_time: remainingTime,
      can_resend: canResend,
    })
  } catch (error: any) {
    console.error('OTP status error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check OTP status',
    })
  }
})

export default router
