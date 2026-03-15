/**
 * Cancellation Policy API Routes
 * Public and Admin endpoints for cancellation policy configuration
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import {
  cancellationPolicyService,
  type CancellationPolicyTier,
  type CancellationPolicySettings,
} from '../services/cancellationPolicyService.js'

const router = Router()

// ============================================
// Public Routes (for Customer app)
// ============================================

/**
 * GET /api/cancellation-policy
 * Get active cancellation policy (public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const policy = await cancellationPolicyService.getCancellationPolicy()

    return res.json({
      success: true,
      data: policy,
    })
  } catch (error: any) {
    console.error('Error fetching cancellation policy:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch cancellation policy',
    })
  }
})

/**
 * GET /api/cancellation-policy/check/:bookingId
 * Check if a booking can be cancelled/rescheduled
 */
router.get('/check/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    const eligibility = await cancellationPolicyService.checkCancellationEligibility(bookingId)

    return res.json({
      success: true,
      data: eligibility,
    })
  } catch (error: any) {
    console.error('Error checking cancellation eligibility:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check cancellation eligibility',
    })
  }
})

/**
 * GET /api/cancellation-policy/refund-preview/:bookingId
 * Preview refund amount based on dynamic policy
 */
router.get('/refund-preview/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    const calculation = await cancellationPolicyService.calculateDynamicRefund(bookingId)

    return res.json({
      success: true,
      data: calculation,
    })
  } catch (error: any) {
    console.error('Error calculating refund preview:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate refund preview',
    })
  }
})

// ============================================
// Admin Routes
// ============================================

/**
 * Middleware to check admin role
 */
async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
      })
    }

    const token = authHeader.split(' ')[1]
    const supabase = getSupabaseClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      })
    }

    // Check if user is admin
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

    // Attach user to request
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

/**
 * GET /api/cancellation-policy/admin
 * Get full cancellation policy including inactive items (admin only)
 */
router.get('/admin', requireAdmin, async (req: Request, res: Response) => {
  try {
    const policy = await cancellationPolicyService.getFullCancellationPolicy()

    return res.json({
      success: true,
      data: policy,
    })
  } catch (error: any) {
    console.error('Error fetching full cancellation policy:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch cancellation policy',
    })
  }
})

/**
 * PUT /api/cancellation-policy/admin/settings
 * Update cancellation policy settings
 */
router.put('/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body as Partial<CancellationPolicySettings>

    // Validate settings
    if (settings.max_reschedules_per_booking !== undefined) {
      if (settings.max_reschedules_per_booking < 0 || settings.max_reschedules_per_booking > 10) {
        return res.status(400).json({
          success: false,
          error: 'max_reschedules_per_booking must be between 0 and 10',
        })
      }
    }

    if (settings.refund_processing_days !== undefined) {
      if (settings.refund_processing_days < 1 || settings.refund_processing_days > 60) {
        return res.status(400).json({
          success: false,
          error: 'refund_processing_days must be between 1 and 60',
        })
      }
    }

    const updated = await cancellationPolicyService.updatePolicySettings(settings)

    return res.json({
      success: true,
      data: updated,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating cancellation policy settings:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings',
    })
  }
})

/**
 * POST /api/cancellation-policy/admin/tiers
 * Create a new cancellation policy tier
 */
router.post('/admin/tiers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const tierData = req.body as Omit<CancellationPolicyTier, 'id' | 'created_at' | 'updated_at'>

    // Validate required fields
    if (tierData.min_hours_before === undefined) {
      return res.status(400).json({
        success: false,
        error: 'min_hours_before is required',
      })
    }

    if (tierData.min_hours_before < 0) {
      return res.status(400).json({
        success: false,
        error: 'min_hours_before must be >= 0',
      })
    }

    if (tierData.refund_percentage !== undefined) {
      if (tierData.refund_percentage < 0 || tierData.refund_percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'refund_percentage must be between 0 and 100',
        })
      }
    }

    const tier = await cancellationPolicyService.createPolicyTier(tierData)

    return res.status(201).json({
      success: true,
      data: tier,
      message: 'Tier created successfully',
    })
  } catch (error: any) {
    console.error('Error creating cancellation policy tier:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create tier',
    })
  }
})

/**
 * PUT /api/cancellation-policy/admin/tiers/:tierId
 * Update a cancellation policy tier
 */
router.put('/admin/tiers/:tierId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params
    const tierData = req.body as Partial<CancellationPolicyTier>

    if (!tierId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tier ID',
      })
    }

    // Validate fields if provided
    if (tierData.min_hours_before !== undefined && tierData.min_hours_before < 0) {
      return res.status(400).json({
        success: false,
        error: 'min_hours_before must be >= 0',
      })
    }

    if (tierData.refund_percentage !== undefined) {
      if (tierData.refund_percentage < 0 || tierData.refund_percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'refund_percentage must be between 0 and 100',
        })
      }
    }

    const tier = await cancellationPolicyService.updatePolicyTier(tierId, tierData)

    return res.json({
      success: true,
      data: tier,
      message: 'Tier updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating cancellation policy tier:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update tier',
    })
  }
})

/**
 * DELETE /api/cancellation-policy/admin/tiers/:tierId
 * Delete a cancellation policy tier
 */
router.delete('/admin/tiers/:tierId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params

    if (!tierId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tier ID',
      })
    }

    await cancellationPolicyService.deletePolicyTier(tierId)

    return res.json({
      success: true,
      message: 'Tier deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting cancellation policy tier:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete tier',
    })
  }
})

export default router
