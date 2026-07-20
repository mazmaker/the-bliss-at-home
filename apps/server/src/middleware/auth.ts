/**
 * [F-2] Payment/booking auth middleware
 *
 * Verifies the caller's Supabase JWT (Authorization: Bearer <access_token>) and attaches
 * req.user. Modeled on the secure-bookings-v2 pattern.
 *
 * IMPORTANT — feature-flagged rollout: enforcement is gated by env `REQUIRE_PAYMENT_AUTH`.
 * While it is anything other than "true" (the default), `paymentAuthGuard` is a NO-OP, so the
 * money routes behave exactly as before and nothing breaks while clients are being updated to
 * attach their JWT. Once every caller sends a token, set REQUIRE_PAYMENT_AUTH=true to enforce.
 * Recovery if a flow breaks: unset the flag (or set !=true) and restart — instant rollback.
 */

import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase.js'

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email?: string; hotel_id?: string | null }
}

// read the flag at call time (not module-load) to avoid dotenv load-order surprises
const authRequired = () => process.env.REQUIRE_PAYMENT_AUTH === 'true'

// NOTE: do NOT create a Supabase client at module load — env (dotenv) may not be loaded yet
// when this module is first imported, which throws "supabaseUrl is required". Create clients
// lazily at request time: getSupabaseClient() (service role) for the profile lookup, and a
// per-request user-context client below.
const userClientFor = (token: string) =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

/** Verify Supabase JWT + attach req.user. 401 on missing/invalid token. */
export async function authenticateSupabaseUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }
    const { data: { user }, error } = await userClientFor(token).auth.getUser()
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }
    const { data: profile } = await getSupabaseClient()
      .from('profiles')
      .select('id, role, email, hotel_id')
      .eq('id', user.id)
      .single()
    req.user = profile || { id: user.id, role: 'CUSTOMER', email: user.email }
    next()
  } catch (e: any) {
    return res.status(401).json({ success: false, error: 'Authentication failed', details: e.message })
  }
}

/**
 * Flag-gated guard for money routes. NO-OP unless REQUIRE_PAYMENT_AUTH=true, so it can be
 * deployed safely ahead of the client changes and switched on once every caller sends a JWT.
 */
export function paymentAuthGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!authRequired()) return next()
  return authenticateSupabaseUser(req, res, next)
}

/** Optional role gate (chain AFTER paymentAuthGuard). Also a no-op while the flag is off. */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authRequired()) return next()
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Forbidden: requires role ${roles.join('/')}` })
    }
    next()
  }
}

/**
 * [P6-D5] ALWAYS-ON admin gate — NOT gated by REQUIRE_PAYMENT_AUTH (unlike requireRole).
 * Verifies the Supabase JWT and requires profiles.role === 'ADMIN', attaching req.user.
 * Use for routes that must be admin-only regardless of the payment-auth rollout flag
 * (e.g. the reschedule route once reschedule becomes admin-only). Rejects missing/invalid
 * token (401) and any non-admin caller (403), so a stale customer/hotel JWT cannot reach it.
 */
/**
 * Reusable admin-token check (the core of requireAdmin, minus the middleware plumbing) for handlers that
 * must gate only PART of their work on admin auth — e.g. POST /booking-confirmed honoring a privileged
 * `preassignStaff` ONLY from an admin while staying tokenless for the normal dispatch. Returns ok=false +
 * an HTTP status (401 missing/invalid token, 403 non-admin). Always-on (not flag-gated).
 */
export async function verifyAdminToken(
  authHeader?: string
): Promise<{ ok: boolean; status: number; error?: string; user?: AuthenticatedRequest['user'] }> {
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'No token provided' }
  const { data: { user }, error } = await userClientFor(token).auth.getUser()
  if (error || !user) return { ok: false, status: 401, error: 'Invalid token' }
  const { data: profile } = await getSupabaseClient()
    .from('profiles')
    .select('id, role, email, hotel_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'ADMIN') return { ok: false, status: 403, error: 'Admin only' }
  return { ok: true, status: 200, user: profile }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'AUTH_REQUIRED' })
    }
    const { data: { user }, error } = await userClientFor(token).auth.getUser()
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token', code: 'AUTH_INVALID' })
    }
    const { data: profile } = await getSupabaseClient()
      .from('profiles')
      .select('id, role, email, hotel_id')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: this action is restricted to admins', code: 'ADMIN_ONLY' })
    }
    req.user = profile
    next()
  } catch (e: any) {
    return res.status(401).json({ success: false, error: 'Authentication failed', details: e.message })
  }
}
