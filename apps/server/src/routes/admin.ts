/**
 * Admin API Routes
 * Privileged operations performed on behalf of an authenticated admin via the
 * server's service-role client (bypasses the self-only RLS on the admin browser client).
 */
import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'

const router = Router()

// Admin auth: shared admin token (mirrors routes/hotel.ts requireAdmin)
const requireAdmin = (req: Request, res: Response, next: any) => {
  const adminToken = req.headers.authorization?.replace('Bearer ', '')
  if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin access required' })
  }
  next()
}

/**
 * POST /api/admin/staff/:staffId/avatar
 * [R2] Admin sets a staff member's profile photo. Uploads to the `avatars` bucket and writes
 * profiles.avatar_url (the single source of truth) using the service-role client, bypassing
 * the self-only RLS that blocks a direct admin-browser write to another user's profile/storage.
 * Body: { image_base64: string, content_type?: string, ext?: string }
 */
router.post('/staff/:staffId/avatar', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params
    const { image_base64, content_type, ext } = req.body || {}
    if (!image_base64) {
      return res.status(400).json({ success: false, error: 'Missing image_base64' })
    }

    const supabase = getSupabaseClient()

    // Avatar lives on profiles (keyed by profile_id); resolve it from the staff row.
    const { data: staffRow, error: staffErr } = await supabase
      .from('staff')
      .select('profile_id')
      .eq('id', staffId)
      .single()
    if (staffErr || !staffRow?.profile_id) {
      return res.status(404).json({ success: false, error: 'Staff not found or has no linked profile' })
    }
    const profileId = staffRow.profile_id as string

    // Decode base64 (strip a data: URL prefix if present).
    const base64 = image_base64.includes(',') ? image_base64.split(',')[1] : image_base64
    const buffer = Buffer.from(base64, 'base64')
    const fileExt = (ext || 'png').replace(/[^a-z0-9]/gi, '') || 'png'
    const fileName = `${profileId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, { upsert: true, contentType: content_type || 'image/png' })
    if (uploadError) {
      console.error('[admin avatar] upload failed:', uploadError)
      return res.status(500).json({ success: false, error: 'Upload failed: ' + uploadError.message })
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', profileId)
    if (updateError) {
      console.error('[admin avatar] profile update failed:', updateError)
      return res.status(500).json({ success: false, error: 'Profile update failed: ' + updateError.message })
    }

    return res.json({ success: true, avatar_url: urlData.publicUrl })
  } catch (error: any) {
    console.error('[admin avatar] error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to set staff avatar' })
  }
})

export default router
