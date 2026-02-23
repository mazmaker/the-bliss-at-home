/**
 * Hotel Authentication API Routes
 * Handles hotel account creation, invitation emails, and password resets
 */

import express from 'express'
import type { Request, Response } from 'express'
import { hotelAuthService } from '../services/hotelAuthService.js'

const router = express.Router()

// Middleware to check if request is from admin
const requireAdmin = (req: Request, res: Response, next: any) => {
  // TODO: Implement proper admin authentication
  // For now, we'll check for a simple admin token
  const adminToken = req.headers.authorization?.replace('Bearer ', '')

  if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin access required'
    })
  }

  next()
}

/**
 * Create hotel account
 * POST /api/hotels/create-account
 */
router.post('/create-account', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hotelId, loginEmail } = req.body

    if (!hotelId || !loginEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'hotelId and loginEmail are required'
      })
    }

    const result = await hotelAuthService.createHotelAccount(hotelId, loginEmail)

    res.json({
      success: true,
      userId: result.userId,
      temporaryPassword: result.temporaryPassword,
      loginEmail: req.body.loginEmail,
      resetToken: result.resetToken,
      loginEnabled: true
    })
  } catch (error) {
    console.error('Create hotel account error:', error)
    res.status(500).json({
      error: 'Failed to create hotel account',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Send hotel invitation email
 * POST /api/hotels/send-invitation
 */
router.post('/send-invitation', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hotelId, adminName } = req.body

    if (!hotelId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'hotelId is required'
      })
    }

    await hotelAuthService.sendHotelInvitation(hotelId, adminName)

    res.json({
      success: true,
      message: 'Invitation email sent successfully'
    })
  } catch (error) {
    console.error('Send invitation error:', error)
    res.status(500).json({
      error: 'Failed to send invitation email',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Reset hotel password (admin initiated)
 * POST /api/hotels/reset-password
 */
router.post('/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.body

    if (!hotelId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'hotelId is required'
      })
    }

    const result = await hotelAuthService.initiateHotelPasswordReset(hotelId)

    res.json({
      success: true,
      data: {
        temporaryPassword: result.temporaryPassword,
        resetToken: result.resetToken
      }
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      error: 'Failed to reset password',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Toggle hotel login access
 * POST /api/hotels/toggle-login
 */
router.post('/toggle-login', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hotelId, enabled } = req.body

    if (!hotelId || typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'hotelId and enabled (boolean) are required'
      })
    }

    await hotelAuthService.toggleHotelLoginAccess(hotelId, enabled)

    res.json({
      success: true,
      message: `Hotel login ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('Toggle login access error:', error)
    res.status(500).json({
      error: 'Failed to toggle login access',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Change hotel password (for hotel users - first login)
 * POST /api/hotels/change-password
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword, hotelId } = req.body

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword || !hotelId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Password mismatch',
        message: 'รหัสผ่านยืนยันไม่ตรงกัน'
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
      })
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        error: 'Password too long',
        message: 'รหัสผ่านยาวเกินไป (สูงสุด 128 ตัวอักษร)'
      })
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'admin123', 'hotel123', '11111111']
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'รหัสผ่านนี้ไม่ปลอดภัย กรุณาเลือกรหัสผ่านที่แข็งแรงกว่า'
      })
    }

    // Check password strength
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

    if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'รหัสผ่านต้องประกอบด้วย ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ'
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'Same password',
        message: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม'
      })
    }

    const result = await hotelAuthService.changeHotelPassword(hotelId, currentPassword, newPassword)

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        passwordChangeRequired: false
      }
    })
  } catch (error) {
    console.error('Change password error:', error)

    if (error instanceof Error && error.message === 'Invalid current password') {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      })
    }

    res.status(500).json({
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Get hotel auth status
 * GET /api/hotels/:hotelId/auth-status
 */
router.get('/:hotelId/auth-status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params

    const status = await hotelAuthService.getHotelAuthStatus(hotelId)

    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Get auth status error:', error)
    res.status(500).json({
      error: 'Failed to get auth status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Hotel password reset request (from hotel side)
 * POST /api/hotels/forgot-password
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'email is required'
      })
    }

    await hotelAuthService.requestPasswordReset(email)

    res.json({
      success: true,
      message: 'If this email is registered, a password reset email has been sent'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    // Don't expose specific error details for security
    res.json({
      success: true,
      message: 'If this email is registered, a password reset email has been sent'
    })
  }
})

/**
 * Verify reset token
 * POST /api/hotels/verify-reset-token
 */
router.post('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'token is required'
      })
    }

    const isValid = await hotelAuthService.verifyResetToken(token)

    res.json({
      success: true,
      valid: isValid
    })
  } catch (error) {
    console.error('Verify reset token error:', error)
    res.status(400).json({
      success: false,
      valid: false,
      message: 'Invalid or expired token'
    })
  }
})

/**
 * Mark password change as completed (called from hotel app)
 * POST /api/hotels/password-changed
 */
router.post('/password-changed', async (req: Request, res: Response) => {
  try {
    const { hotelId, authToken } = req.body

    if (!hotelId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'hotelId is required'
      })
    }

    // TODO: Verify that this request is from authenticated hotel user
    // For now, we'll mark it as completed regardless

    await hotelAuthService.markPasswordChangeCompleted(hotelId)

    res.json({
      success: true,
      message: 'Password change completed, temporary credentials cleared'
    })
  } catch (error) {
    console.error('Password changed notification error:', error)
    res.status(500).json({
      error: 'Failed to process password change notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * Test email sending
 * POST /api/hotels/test-email
 */
router.post('/test-email', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { toEmail } = req.body

    if (!toEmail) {
      return res.status(400).json({
        error: 'Missing email address',
        message: 'toEmail is required'
      })
    }

    // Send test email using hotel invitation template
    const testData = {
      hotelName: 'โรงแรมทดสอบ',
      loginEmail: toEmail,
      temporaryPassword: 'Test123456!',
      loginUrl: 'http://localhost:3006/login',
      adminName: 'Admin Tester'
    }

    // Import email service
    const { emailService } = await import('../services/emailService.js')
    await emailService.sendHotelInvitation(toEmail, testData)

    res.json({
      success: true,
      message: `Test email sent to ${toEmail}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test email error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error',
      emailConfigured: hotelAuthService.isEmailServiceReady()
    })
  }
})

/**
 * Health check for hotel auth service
 * GET /api/hotels/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'hotel-auth',
    timestamp: new Date().toISOString(),
    emailServiceReady: hotelAuthService.isEmailServiceReady()
  })
})

export default router