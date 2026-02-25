/**
 * Hotel Authentication Service
 * Handles hotel account management, password generation, and email sending
 */

import crypto from 'crypto'
import { getSupabaseClient } from '../lib/supabase.js'
import { emailService } from './emailService.js'

export interface CreateAccountResult {
  userId: string
  temporaryPassword: string
  resetToken: string
}

export interface PasswordResetResult {
  temporaryPassword: string
  resetToken: string
}

export interface HotelAuthStatus {
  hasAccount: boolean
  loginEnabled: boolean
  loginEmail?: string
  lastLogin?: string
  authUserId?: string
  passwordChangeRequired: boolean
}

class HotelAuthService {
  /**
   * Create a new Supabase auth account for hotel
   */
  async createHotelAccount(hotelId: string, loginEmail: string): Promise<CreateAccountResult> {
    try {
      // Check if hotel exists
      const { data: hotel, error: hotelError } = await getSupabaseClient()
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single()

      if (hotelError || !hotel) {
        throw new Error('Hotel not found')
      }

      // Check if hotel already has an account
      if (hotel.auth_user_id) {
        throw new Error('Hotel already has an account')
      }

      // Check if login email is already in use
      const { data: existingUser } = await getSupabaseClient().auth.admin.listUsers()
      const emailInUse = existingUser.users.some((user: any) => user.email === loginEmail)

      if (emailInUse) {
        throw new Error('Email address is already in use')
      }

      // Generate temporary password
      const temporaryPassword = this.generateSecurePassword()
      const resetToken = crypto.randomBytes(32).toString('hex')

      // Create Supabase auth user
      const { data: authData, error: authError } = await getSupabaseClient().auth.admin.createUser({
        email: loginEmail,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: 'HOTEL',
          hotel_id: hotelId,
          password_change_required: true
        }
      })

      if (authError || !authData.user) {
        console.error('Supabase auth error:', authError)
        throw new Error(`Failed to create auth user: ${authError?.message}`)
      }

      // Create profile in profiles table (or update if exists)
      const { error: profileError } = await getSupabaseClient()
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: loginEmail,
          role: 'HOTEL',
          full_name: hotel.name_th,
          status: 'ACTIVE',
          language: 'th',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        // If profile creation fails, clean up auth user
        await getSupabaseClient().auth.admin.deleteUser(authData.user.id)
        console.error('Profile creation error:', profileError)
        throw new Error(`Failed to create profile: ${profileError.message}`)
      }

      // Update hotel record with auth info
      const { error: updateError } = await getSupabaseClient()
        .from('hotels')
        .update({
          auth_user_id: authData.user.id,
          login_email: loginEmail,
          password_reset_token: resetToken,
          password_reset_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          login_enabled: true,
          temporary_password: temporaryPassword, // Store for admin reference
          password_change_required: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotelId)

      if (updateError) {
        // Clean up auth user and profile if hotel update fails
        await getSupabaseClient().auth.admin.deleteUser(authData.user.id)
        await getSupabaseClient().from('profiles').delete().eq('id', authData.user.id)
        console.error('Hotel update error:', updateError)
        throw new Error(`Failed to update hotel: ${updateError.message}`)
      }

      return {
        userId: authData.user.id,
        temporaryPassword,
        resetToken
      }
    } catch (error) {
      console.error('Create hotel account error:', error)
      throw error
    }
  }

  /**
   * Send hotel invitation email
   */
  async sendHotelInvitation(hotelId: string, adminName?: string): Promise<void> {
    try {
      // Get hotel data with auth info
      const { data: hotel, error: hotelError } = await getSupabaseClient()
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single()

      if (hotelError || !hotel) {
        throw new Error('Hotel not found')
      }

      if (!hotel.auth_user_id || !hotel.login_email || !hotel.temporary_password) {
        throw new Error('Hotel account not set up. Create account first.')
      }

      if (!hotel.login_enabled) {
        throw new Error('Hotel login is disabled')
      }

      // Send invitation email
      await emailService.sendHotelInvitation(hotel.login_email, {
        hotelName: hotel.name_th,
        loginEmail: hotel.login_email,
        temporaryPassword: hotel.temporary_password,
        loginUrl: this.getHotelLoginUrl(),
        adminName
      })

      console.log(`✅ Invitation email sent to ${hotel.name_th} (${hotel.login_email})`)
    } catch (error) {
      console.error('Send hotel invitation error:', error)
      throw error
    }
  }

  /**
   * Initiate password reset for hotel (admin initiated)
   */
  async initiateHotelPasswordReset(hotelId: string): Promise<PasswordResetResult> {
    try {
      // Get hotel data
      const { data: hotel, error: hotelError } = await getSupabaseClient()
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single()

      if (hotelError || !hotel) {
        throw new Error('Hotel not found')
      }

      if (!hotel.auth_user_id || !hotel.login_email) {
        throw new Error('Hotel does not have an account')
      }

      // Generate new temporary password and reset token
      const temporaryPassword = this.generateSecurePassword()
      const resetToken = crypto.randomBytes(32).toString('hex')

      // Update hotel auth user password in Supabase Auth
      const { error: updatePasswordError } = await getSupabaseClient().auth.admin.updateUserById(
        hotel.auth_user_id,
        {
          password: temporaryPassword,
          user_metadata: {
            ...hotel.auth_user_id,
            password_change_required: true
          }
        }
      )

      if (updatePasswordError) {
        console.error('Update password error:', updatePasswordError)
        throw new Error(`Failed to update password: ${updatePasswordError.message}`)
      }

      // Update hotel record
      const { error: updateError } = await getSupabaseClient()
        .from('hotels')
        .update({
          password_reset_token: resetToken,
          password_reset_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          temporary_password: temporaryPassword,
          password_change_required: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotelId)

      if (updateError) {
        console.error('Hotel update error:', updateError)
        throw new Error(`Failed to update hotel: ${updateError.message}`)
      }

      // Send password reset email
      await emailService.sendPasswordReset(hotel.login_email, {
        hotelName: hotel.name_th,
        loginEmail: hotel.login_email,
        resetUrl: this.getPasswordResetUrl(resetToken),
        expiresIn: '24 ชั่วโมง'
      })

      return {
        temporaryPassword,
        resetToken
      }
    } catch (error) {
      console.error('Initiate password reset error:', error)
      throw error
    }
  }

  /**
   * Toggle hotel login access
   */
  async toggleHotelLoginAccess(hotelId: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('hotels')
        .update({
          login_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotelId)

      if (error) {
        console.error('Toggle login access error:', error)
        throw new Error(`Failed to toggle login access: ${error.message}`)
      }

      console.log(`✅ Hotel ${hotelId} login ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Toggle login access error:', error)
      throw error
    }
  }

  /**
   * Get hotel authentication status
   */
  async getHotelAuthStatus(hotelId: string): Promise<HotelAuthStatus> {
    try {
      const { data: hotel, error } = await getSupabaseClient()
        .from('hotels')
        .select('auth_user_id, login_email, login_enabled, last_login, password_change_required')
        .eq('id', hotelId)
        .single()

      if (error) {
        console.error('Get hotel auth status error:', error)
        throw new Error(`Failed to get hotel status: ${error.message}`)
      }

      return {
        hasAccount: !!hotel.auth_user_id,
        loginEnabled: hotel.login_enabled || false,
        loginEmail: hotel.login_email || undefined,
        lastLogin: hotel.last_login || undefined,
        authUserId: hotel.auth_user_id || undefined,
        passwordChangeRequired: hotel.password_change_required || false
      }
    } catch (error) {
      console.error('Get hotel auth status error:', error)
      throw error
    }
  }

  /**
   * Request password reset (from hotel side)
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      // Find hotel by login email
      const { data: hotel, error } = await getSupabaseClient()
        .from('hotels')
        .select('*')
        .eq('login_email', email)
        .eq('login_enabled', true)
        .single()

      if (error || !hotel) {
        // Don't expose whether email exists for security
        console.log(`Password reset requested for non-existent email: ${email}`)
        return
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')

      // Update hotel with reset token
      await getSupabaseClient()
        .from('hotels')
        .update({
          password_reset_token: resetToken,
          password_reset_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
        })
        .eq('id', hotel.id)

      // Send password reset email
      await emailService.sendPasswordReset(email, {
        hotelName: hotel.name_th,
        loginEmail: email,
        resetUrl: this.getPasswordResetUrl(resetToken),
        expiresIn: '2 ชั่วโมง'
      })
    } catch (error) {
      console.error('Request password reset error:', error)
      // Don't throw error to avoid revealing system information
    }
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<boolean> {
    try {
      const { data: hotel, error } = await getSupabaseClient()
        .from('hotels')
        .select('password_reset_expires_at')
        .eq('password_reset_token', token)
        .single()

      if (error || !hotel) {
        return false
      }

      // Check if token has expired
      const expiresAt = new Date(hotel.password_reset_expires_at)
      const now = new Date()

      return now < expiresAt
    } catch (error) {
      console.error('Verify reset token error:', error)
      return false
    }
  }

  /**
   * Generate secure random password
   */
  private generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'

    const allChars = lowercase + uppercase + numbers + symbols

    let password = ''

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Get hotel login URL
   */
  private getHotelLoginUrl(): string {
    const baseUrl = process.env.HOTEL_APP_URL || 'http://localhost:3006'
    return `${baseUrl}/login`
  }

  /**
   * Get password reset URL
   */
  private getPasswordResetUrl(token: string): string {
    const baseUrl = process.env.HOTEL_APP_URL || 'http://localhost:3006'
    return `${baseUrl}/reset-password?token=${token}`
  }

  /**
   * Change hotel password (for hotel users on first login)
   */
  async changeHotelPassword(hotelId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get hotel data including temporary password
      const { data: hotel, error: hotelError } = await getSupabaseClient()
        .from('hotels')
        .select('auth_user_id, temporary_password, password_change_required, login_email')
        .eq('id', hotelId)
        .single()

      if (hotelError || !hotel) {
        throw new Error('Hotel not found')
      }

      if (!hotel.auth_user_id) {
        throw new Error('Hotel does not have an auth account')
      }

      // Verify current password matches temporary password
      if (!hotel.temporary_password) {
        throw new Error('ไม่พบรหัสผ่านชั่วคราว กรุณาติดต่อผู้ดูแลระบบ')
      }

      if (hotel.temporary_password !== currentPassword) {
        throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง')
      }

      if (!hotel.password_change_required) {
        throw new Error('บัญชีนี้ไม่ต้องเปลี่ยนรหัสผ่าน')
      }

      // Use Supabase Admin API to update password
      const supabaseAdmin = getSupabaseClient()
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        hotel.auth_user_id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Update password error:', updateError)
        throw new Error(`Failed to update password: ${updateError.message}`)
      }

      // Mark password change as completed
      await this.markPasswordChangeCompleted(hotelId)

      console.log(`✅ Hotel ${hotelId} password changed successfully`)
    } catch (error) {
      console.error('Change hotel password error:', error)
      throw error
    }
  }

  /**
   * Mark password change as completed (called after hotel changes password)
   * This clears temporary password and disables password change requirement
   */
  async markPasswordChangeCompleted(hotelId: string): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('hotels')
        .update({
          temporary_password: null, // ลบรหัสผ่านชั่วคราว
          password_change_required: false, // ไม่ต้องเปลี่ยนแล้ว
          password_reset_token: null, // ลบ reset token
          password_reset_expires_at: null, // ลบ expiry
          last_login: new Date().toISOString(), // บันทึกเวลาเข้าสู่ระบบ
          updated_at: new Date().toISOString()
        })
        .eq('id', hotelId)

      if (error) {
        console.error('Mark password change completed error:', error)
        throw new Error(`Failed to update hotel password status: ${error.message}`)
      }

      console.log(`✅ Hotel ${hotelId} password change completed, temporary password cleared`)
    } catch (error) {
      console.error('Mark password change completed error:', error)
      throw error
    }
  }

  /**
   * Check if email service is ready
   */
  isEmailServiceReady(): boolean {
    return emailService.isReady()
  }
}

// Export singleton instance
export const hotelAuthService = new HotelAuthService()
export default hotelAuthService