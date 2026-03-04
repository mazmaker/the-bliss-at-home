/**
 * Billing Settings API Routes
 * Admin endpoints for managing monthly billing configuration
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'

const router = Router()

// Types
interface BillingSettings {
  id?: string
  due_day_type: 'fixed_day' | 'month_end' | 'business_days_after'
  due_day_value: number
  due_months_after: number
  due_soon_days: number
  overdue_days: number
  warning_days: number
  urgent_days: number
  enable_late_fee?: boolean
  late_fee_percentage?: number
  late_fee_fixed_amount?: number
  grace_period_days?: number
  admin_contact_phone?: string
  admin_contact_email?: string
  admin_contact_line_id?: string
  due_soon_message?: string
  overdue_message?: string
  warning_message?: string
  urgent_message?: string
  auto_email_reminder?: boolean
  auto_line_reminder?: boolean
  reminder_frequency_days?: number
  bank_transfer_enabled?: boolean
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  cash_payment_enabled?: boolean
  office_address?: string
  office_hours?: string
  check_payment_enabled?: boolean
  check_payable_to?: string
  check_mailing_address?: string
  is_active?: boolean
}

// ============================================
// Middleware to check admin role
// ============================================

async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
      })
    }

    const token = authHeader.split(' ')[1]
    const supabase = getSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      })
    }

    (req as any).user = user
    next()
  } catch (error: any) {
    console.error('Admin auth error:', error)
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    })
  }
}

// ============================================
// Public Routes (for Hotel app to read settings)
// ============================================

/**
 * GET /api/billing-settings
 * Get active billing settings (public access for hotels)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()

    // Default fallback settings
    const defaultSettings: BillingSettings = {
      id: 'default-fallback',
      due_day_type: 'fixed_day',
      due_day_value: 15,
      due_months_after: 1,
      due_soon_days: 7,
      overdue_days: 7,
      warning_days: 15,
      urgent_days: 15,
      enable_late_fee: false,
      late_fee_percentage: 0,
      late_fee_fixed_amount: 0,
      grace_period_days: 0,
      admin_contact_phone: '02-123-4567',
      admin_contact_email: 'admin@theblissathome.com',
      admin_contact_line_id: '@theblissbilling',
      due_soon_message: 'ใกล้ถึงกำหนดชำระบิลรายเดือนแล้ว กรุณาเตรียมการชำระ',
      overdue_message: 'บิลค้างชำระ กรุณาชำระโดยเร็วเพื่อหลีกเลี่ยงค่าปรับ',
      warning_message: 'บิลค้างชำระนาน กรุณาติดต่อแอดมินเพื่อชำระ',
      urgent_message: 'บิลค้างชำระเกินกำหนดมาก จำเป็นต้องชำระทันที',
      auto_email_reminder: true,
      auto_line_reminder: false,
      reminder_frequency_days: 7,
      bank_transfer_enabled: true,
      bank_name: 'ธนาคารกสิกรไทย',
      bank_account_number: '123-4-56789-0',
      bank_account_name: 'บริษัท เดอะ บลิส แอท โฮม จำกัด',
      cash_payment_enabled: true,
      office_address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
      office_hours: 'จันทร์-ศุกร์ 9:00-17:00, เสาร์ 9:00-12:00',
      check_payment_enabled: false,
      check_payable_to: '',
      check_mailing_address: '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null
    }

    const { data: settings, error } = await supabase
      .from('billing_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      console.warn('Billing settings table not available, using defaults:', error.message)
      // Return default settings when table doesn't exist
      return res.json({
        success: true,
        data: defaultSettings,
        fallback: true
      })
    }

    if (!settings) {
      console.warn('No active billing settings found, using defaults')
      // Return default settings when no active settings exist
      return res.json({
        success: true,
        data: defaultSettings,
        fallback: true
      })
    }

    return res.json({
      success: true,
      data: settings,
    })
  } catch (error: any) {
    console.error('Error in billing settings GET:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
})

/**
 * GET /api/billing-settings/calculate-due-date/:month
 * Calculate due date for a specific month based on current settings
 */
router.get('/calculate-due-date/:month', async (req: Request, res: Response) => {
  try {
    const { month } = req.params // Format: YYYY-MM
    const supabase = getSupabaseClient()

    if (!month.match(/^\d{4}-\d{2}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM',
      })
    }

    const { data: settings, error } = await supabase
      .from('billing_settings')
      .select('due_day_type, due_day_value, due_months_after')
      .eq('is_active', true)
      .single()

    // Use default settings if table doesn't exist or no settings found
    const fallbackSettings = {
      due_day_type: 'fixed_day' as const,
      due_day_value: 15,
      due_months_after: 1
    }

    const activeSettings = settings || fallbackSettings

    // Calculate due date
    const billMonth = new Date(month + '-01')
    const dueDate = new Date(billMonth)
    dueDate.setMonth(dueDate.getMonth() + activeSettings.due_months_after)

    switch (activeSettings.due_day_type) {
      case 'fixed_day':
        dueDate.setDate(activeSettings.due_day_value)
        break
      case 'month_end':
        // Set to last day of the month
        dueDate.setMonth(dueDate.getMonth() + 1)
        dueDate.setDate(0)
        break
      case 'business_days_after':
        // Add business days (simplified - excludes weekends only)
        let businessDays = 0
        const currentDate = new Date(dueDate)
        currentDate.setDate(1)

        while (businessDays < activeSettings.due_day_value) {
          currentDate.setDate(currentDate.getDate() + 1)
          const dayOfWeek = currentDate.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            businessDays++
          }
        }
        dueDate.setDate(currentDate.getDate())
        break
    }

    return res.json({
      success: true,
      data: {
        month,
        dueDate: dueDate.toISOString().split('T')[0],
        dueDateThai: dueDate.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        settings: {
          due_day_type: settings.due_day_type,
          due_day_value: settings.due_day_value,
          due_months_after: settings.due_months_after,
        },
      },
    })
  } catch (error: any) {
    console.error('Error calculating due date:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate due date',
    })
  }
})

// ============================================
// Admin Routes
// ============================================

/**
 * GET /api/billing-settings/admin
 * Get all billing settings including inactive ones (admin only)
 */
router.get('/admin', requireAdmin, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()

    // Default settings for admin
    const defaultSettings: BillingSettings = {
      id: 'default-admin',
      due_day_type: 'fixed_day',
      due_day_value: 15,
      due_months_after: 1,
      due_soon_days: 7,
      overdue_days: 7,
      warning_days: 15,
      urgent_days: 15,
      enable_late_fee: false,
      late_fee_percentage: 0,
      late_fee_fixed_amount: 0,
      grace_period_days: 0,
      admin_contact_phone: '02-123-4567',
      admin_contact_email: 'admin@theblissathome.com',
      admin_contact_line_id: '@theblissbilling',
      due_soon_message: 'ใกล้ถึงกำหนดชำระบิลรายเดือนแล้ว กรุณาเตรียมการชำระ',
      overdue_message: 'บิลค้างชำระ กรุณาชำระโดยเร็วเพื่อหลีกเลี่ยงค่าปรับ',
      warning_message: 'บิลค้างชำระนาน กรุณาติดต่อแอดมินเพื่อชำระ',
      urgent_message: 'บิลค้างชำระเกินกำหนดมาก จำเป็นต้องชำระทันที',
      auto_email_reminder: true,
      auto_line_reminder: false,
      reminder_frequency_days: 7,
      bank_transfer_enabled: true,
      bank_name: 'ธนาคารกสิกรไทย',
      bank_account_number: '123-4-56789-0',
      bank_account_name: 'บริษัท เดอะ บลิส แอท โฮม จำกัด',
      cash_payment_enabled: true,
      office_address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
      office_hours: 'จันทร์-ศุกร์ 9:00-17:00, เสาร์ 9:00-12:00',
      check_payment_enabled: false,
      check_payable_to: '',
      check_mailing_address: '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null
    }

    const { data: settings, error } = await supabase
      .from('billing_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Admin billing settings table not available, using defaults:', error.message)
      // Return default settings array when table doesn't exist
      return res.json({
        success: true,
        data: [defaultSettings],
        fallback: true
      })
    }

    // If no settings exist, return default
    if (!settings || settings.length === 0) {
      console.warn('No admin billing settings found, using defaults')
      return res.json({
        success: true,
        data: [defaultSettings],
        fallback: true
      })
    }

    return res.json({
      success: true,
      data: settings,
    })
  } catch (error: any) {
    console.error('Error in admin billing settings GET:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
})

/**
 * PUT /api/billing-settings/admin
 * Update billing settings (admin only)
 */
router.put('/admin', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const updates = req.body as Partial<BillingSettings>
    const supabase = getSupabaseClient()

    // Validation
    if (updates.due_day_value !== undefined) {
      if (updates.due_day_value < 1 || updates.due_day_value > 31) {
        return res.status(400).json({
          success: false,
          error: 'due_day_value must be between 1 and 31',
        })
      }
    }

    if (updates.due_months_after !== undefined) {
      if (updates.due_months_after < 0 || updates.due_months_after > 3) {
        return res.status(400).json({
          success: false,
          error: 'due_months_after must be between 0 and 3',
        })
      }
    }

    if (updates.late_fee_percentage !== undefined) {
      if (updates.late_fee_percentage < 0 || updates.late_fee_percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'late_fee_percentage must be between 0 and 100',
        })
      }
    }

    // Update settings
    const { data: updatedSettings, error } = await supabase
      .from('billing_settings')
      .update({
        ...updates,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating billing settings:', error)
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update billing settings',
      })
    }

    return res.json({
      success: true,
      data: updatedSettings,
      message: 'Billing settings updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating billing settings:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
})

/**
 * POST /api/billing-settings/admin/reset
 * Reset billing settings to default values (admin only)
 */
router.post('/admin/reset', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const supabase = getSupabaseClient()

    const defaultSettings = {
      due_day_type: 'fixed_day' as const,
      due_day_value: 15,
      due_months_after: 1,
      due_soon_days: 7,
      overdue_days: 7,
      warning_days: 15,
      urgent_days: 15,
      enable_late_fee: false,
      late_fee_percentage: 0,
      late_fee_fixed_amount: 0,
      grace_period_days: 0,
      admin_contact_phone: '02-123-4567',
      admin_contact_email: 'admin@theblissathome.com',
      due_soon_message: 'ใกล้ถึงกำหนดชำระบิลรายเดือนแล้ว กรุณาเตรียมการชำระ',
      overdue_message: 'บิลค้างชำระ กรุณาชำระโดยเร็วเพื่อหลีกเลี่ยงค่าปรับ',
      warning_message: 'บิลค้างชำระนาน กรุณาติดต่อแอดมินเพื่อชำระ',
      urgent_message: 'บิลค้างชำระเกินกำหนดมาก จำเป็นต้องชำระทันที',
      auto_email_reminder: true,
      auto_line_reminder: false,
      reminder_frequency_days: 7,
      bank_transfer_enabled: true,
      bank_name: 'ธนาคารกสิกรไทย',
      bank_account_number: '123-4-56789-0',
      bank_account_name: 'บริษัท เดอะ บลิส แอท โฮม จำกัด',
      cash_payment_enabled: true,
      office_address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
      office_hours: 'จันทร์-ศุกร์ 9:00-17:00, เสาร์ 9:00-12:00',
      check_payment_enabled: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    const { data: resetSettings, error } = await supabase
      .from('billing_settings')
      .update(defaultSettings)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error resetting billing settings:', error)
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to reset billing settings',
      })
    }

    return res.json({
      success: true,
      data: resetSettings,
      message: 'Billing settings reset to default values',
    })
  } catch (error: any) {
    console.error('Error resetting billing settings:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
})

export default router