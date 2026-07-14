/**
 * ensureLiveSession — WebView session-resilience core (plan v5 §2.1)
 *
 * THE problem this solves: in the LINE in-app WebView the tab is backgrounded constantly, so
 * supabase-js's `autoRefreshToken` setInterval tick freezes and the access token lapses. On resume,
 * supabase-js `_getAccessToken` (index.mjs:332 on @2.90.1) silently returns `?? this.supabaseKey`
 * (the ANON key) when the resume-refresh fails → `auth.uid()` becomes null → the staff own-record RLS
 * returns a RESOLVED empty-200 (SELECT) / 0-row (UPDATE), which gated reads/writes store as a
 * CONFIRMED-negative (false "ยังไม่ยืนยันตัวตน/เอกสาร" KYC checklist + availability pill OFF + the ×3
 * "ไม่สามารถเปลี่ยนสถานะได้" toast). logout+login "fixes" it only by minting a brand-new session.
 *
 * `ensureLiveSession()` is the awaitable single-flight every gated READ/WRITE calls BEFORE its query,
 * so correctness no longer depends on whether any DOM resume event fired. It returns a TYPED result
 * and NEVER throws (a throw from a shared helper into an uncaught effect = unhandled rejection / stuck
 * spinner):
 *   - 'live'    → a confirmed-live token; a subsequent empty read is a REAL negative (show checklist/OFF)
 *   - 'unknown' → had a stored session before probing but the probe could not confirm it (transient/
 *                 unrecoverable refresh) → keep last-known-good, prompt re-auth, DO NOT collapse to a
 *                 confirmed-negative
 *   - 'anon'    → genuinely no stored session (and not mid-logout) → legitimate anonymous
 *
 * 🔴 The discriminator is "was there a CONFIRMED LIVE session before the read?", NOT "did the read
 * error" — because the anon-downgrade AND a legitimately brand-new staff BOTH yield a 200-0-rows read.
 */

import { supabase } from './supabaseClient'

const STORAGE_KEY = 'bliss-customer-auth'
// Match supabase-js EXPIRY_MARGIN_MS (constants.js:10 on @2.90.1). getSession() refreshes only within
// this margin, so a token with more than this left is genuinely valid → short-circuit without a lock.
const EXPIRY_MARGIN_MS = 90_000
// Safety net so a WebView-woken getSession() can never wedge a gated read (it acquires the navigator
// lock and may contend on a just-frozen tick). Falls through to the typed 'unknown' path on timeout.
const GET_SESSION_TIMEOUT_MS = 8_000

/**
 * Thrown by hardened WRITES when the session is not confirmed live, so callers can prompt re-auth
 * instead of showing a misleading "action failed / not found / already taken" message for what is
 * really a lapsed WebView session.
 */
export class SessionNotLiveError extends Error {
  constructor(message = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง') {
    super(message)
    this.name = 'SessionNotLiveError'
  }
}

export type LiveSessionStatus = 'live' | 'unknown' | 'anon'

export interface LiveSessionResult {
  status: LiveSessionStatus
  /** present for 'live' (fresh) and 'unknown' (last-known-good, possibly stale) — never the anon key */
  token?: string
  userId?: string
}

/**
 * App-owned flag distinguishing a REAL user logout from a transient/non-retryable SIGNED_OUT that the
 * probe itself can trigger (auth-js `_removeSession()` on "Already Used"). Set true in
 * authService.logout() so `ensureLiveSession` resolves 'unknown' (not 'anon') when a session vanishes
 * mid-probe without an intentional logout.
 */
let intentionalLogout = false
export function markIntentionalLogout(): void {
  intentionalLogout = true
}
export function clearIntentionalLogout(): void {
  intentionalLogout = false
}

interface StoredSession {
  token?: string
  refreshToken?: string
  expiresAt?: number
  userId?: string
}

/** Read the persisted session directly. Supports both the flat and the `{currentSession}` shapes. */
function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const s = parsed.currentSession || parsed
    return {
      token: s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: s.expires_at,
      userId: s.user?.id,
    }
  } catch {
    return null
  }
}

let inflight: Promise<LiveSessionResult> | null = null

/**
 * Resolve the current session status without ever throwing. Single-flight so a first-paint burst of
 * gated reads shares ONE getSession() (which itself single-flights the refresh internally).
 *
 * 🔴 Do NOT call this on the `onAuthStateChange` callback path — it calls `getSession()` which acquires
 * the auth lock, and the SDK emits TOKEN_REFRESHED while holding that lock (circular self-await
 * deadlock). onAuthStateChange handlers must use the `session` the callback already delivers.
 */
export async function ensureLiveSession(): Promise<LiveSessionResult> {
  if (inflight) return inflight

  inflight = (async (): Promise<LiveSessionResult> => {
    // Capture BEFORE probing — getSession()'s own refresh can `_removeSession()` mid-probe on a
    // non-retryable failure, erasing the very evidence the discriminator needs.
    const stored = readStoredSession()
    const hadStoredSession = !!stored?.token
    const nowSec = Date.now() / 1000

    // Wall-clock short-circuit: a comfortably-unexpired token is genuinely valid → live, no getSession
    // (avoids re-acquiring the navigator lock on every gated read).
    if (stored?.token && stored.expiresAt && stored.expiresAt - nowSec > EXPIRY_MARGIN_MS / 1000) {
      return { status: 'live', token: stored.token, userId: stored.userId }
    }

    // Need a verify-or-refresh. getSession() refreshes WITHIN the margin using the refresh token and
    // keeps localStorage in sync — never refreshSession() (which ALWAYS rotates → "Already Used" on a
    // WebView freeze mid-rotation → false logout).
    let session: { access_token?: string; user?: { id?: string } } | null = null
    try {
      session = await Promise.race([
        supabase.auth.getSession().then((r) => r.data.session),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GET_SESSION_TIMEOUT_MS)),
      ])
    } catch {
      session = null
    }

    if (session?.access_token) {
      return { status: 'live', token: session.access_token, userId: session.user?.id }
    }

    // getSession() gave nothing. Discriminate on capture-before-probe (not on the error):
    if (hadStoredSession && !intentionalLogout) {
      // There WAS a session before we probed and the user did not intentionally log out → transient or
      // non-retryable refresh. Keep last-known-good; caller prompts re-auth. NOT legit anon.
      return { status: 'unknown', token: stored?.token, userId: stored?.userId }
    }

    // No stored session at all (or a real logout in progress) → legitimate anonymous.
    return { status: 'anon' }
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/**
 * Convenience for the hardened realtime `accessToken` callback and any place that just needs "the best
 * token we have, never the anon key". Returns the live/last-known-good token, or `null` when genuinely
 * anonymous (the caller decides what an anon fallback means — for realtime that IS the anon key).
 */
export async function getLiveOrLastKnownToken(): Promise<string | null> {
  const r = await ensureLiveSession()
  return r.token ?? null
}
