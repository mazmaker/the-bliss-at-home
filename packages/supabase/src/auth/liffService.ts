/**
 * LINE LIFF Service
 * Handles LINE Front-end Framework (LIFF) authentication
 */

import liff from '@line/liff'

export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LiffConfig {
  liffId: string
}

let isInitialized = false

/**
 * Initialize LIFF SDK
 */
export async function initializeLiff(liffId: string): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  try {
    await liff.init({ liffId })
    isInitialized = true
    console.log('LIFF initialized successfully')
    return true
  } catch (error: any) {
    // Handle "invalid authorization code" error gracefully
    // This happens when the page is loaded with stale LIFF params
    const errorMessage = error?.message?.toLowerCase() || ''
    if (errorMessage.includes('invalid') && errorMessage.includes('code')) {
      console.warn('LIFF: Stale authorization code detected, clearing URL params')
      // Clear LIFF params from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      url.searchParams.delete('liffClientId')
      url.searchParams.delete('liffRedirectUri')
      url.searchParams.delete('liffIsEscapedFromApp')
      window.history.replaceState({}, '', url.toString())

      // LIFF SDK is still usable for basic operations
      isInitialized = true
      return true
    }

    console.error('LIFF initialization failed:', error)
    throw error
  }
}

/**
 * Check if LIFF is initialized
 */
export function isLiffInitialized(): boolean {
  return isInitialized
}

/**
 * Check if running in LIFF browser (inside LINE app)
 */
export function isInLiffBrowser(): boolean {
  if (!isInitialized) return false
  return liff.isInClient()
}

/**
 * Check if user is logged in via LIFF
 */
export function isLiffLoggedIn(): boolean {
  if (!isInitialized) return false
  return liff.isLoggedIn()
}

/**
 * Login with LIFF
 * Redirects to LINE authorization if not logged in
 */
export function liffLogin(redirectUri?: string): void {
  if (!isInitialized) {
    throw new Error('LIFF is not initialized')
  }

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri })
  }
}

/**
 * Get LINE user profile from LIFF
 */
export async function getLiffProfile(): Promise<LiffProfile> {
  if (!isInitialized) {
    throw new Error('LIFF is not initialized')
  }

  if (!liff.isLoggedIn()) {
    throw new Error('User is not logged in')
  }

  const profile = await liff.getProfile()
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
  }
}

/**
 * Get LIFF access token
 */
export function getLiffAccessToken(): string | null {
  if (!isInitialized) return null
  return liff.getAccessToken()
}

/**
 * Get LIFF ID token (contains user info)
 */
export function getLiffIdToken(): string | null {
  if (!isInitialized) return null
  return liff.getIDToken()
}

/**
 * Logout from LIFF
 */
export function liffLogout(): void {
  if (!isInitialized) return
  liff.logout()
}

/**
 * Close LIFF window (only works in LINE app)
 */
export function closeLiffWindow(): void {
  if (!isInitialized) return
  if (liff.isInClient()) {
    liff.closeWindow()
  }
}

/**
 * Open URL in external browser
 */
export function openExternalBrowser(url: string): void {
  if (!isInitialized) return
  liff.openWindow({ url, external: true })
}

// [P11 2026-07-06] Loop-guard for the expired-token fresh re-auth below.
const RELOGIN_MARK_KEY = 'staff_line_relogin_ts'
const RELOGIN_TTL_MS = 90_000

/**
 * Detect a durable LINE access-token failure thrown by getProfile()/liff calls —
 * "The access token expired" / "…revoked" / "Invalid access token". All are durable
 * (retrying with the same stale token 401s forever) and all need a FRESH re-auth.
 *
 * Kept LINE-specific: the message MUST contain "access token", so it never matches a
 * request timeout ("การเชื่อมต่อใช้เวลานานเกินไป…") or a transient Supabase 401 like
 * "Invalid login credentials" — the P10 slow-network retry path is never stolen.
 */
export function isTokenExpiredError(error: any): boolean {
  const msg = (error?.message ?? (typeof error === 'string' ? error : '')).toLowerCase()
  return /access token.*(expired|revoked|invalid)|(expired|revoked|invalid).*access token/.test(msg)
}

/**
 * Force a FRESH LINE re-authorization for an EXPIRED-but-present token.
 *
 * Unlike liffLogin() — which is a NO-OP when a token is still present (guarded by
 * `if (!isLoggedIn)`) — this always logs out FIRST so the stale token is cleared
 * from @liff/store, then redirects to LINE to mint a new one. That is the only way
 * out of the "token expired" dead-end (retrying getProfile with the same stale token
 * just 401s forever).
 *
 * Loop-guarded: if a fresh relogin was already triggered within the last
 * RELOGIN_TTL_MS, this refuses (removes the marker + returns false) so a persistently
 * failing re-auth can't ping-pong the user through LINE endlessly.
 *
 * @returns true  → it logged out + redirected to LINE (the page is navigating away,
 *                  the caller should `return` and do nothing else);
 *          false → blocked by the loop guard (the caller should show a manual
 *                  "log in with LINE again" affordance instead of auto-redirecting).
 */
export function reloginFresh(redirectUri?: string): boolean {
  const ts = typeof localStorage !== 'undefined' ? localStorage.getItem(RELOGIN_MARK_KEY) : null
  if (ts && Date.now() < parseInt(ts, 10) + RELOGIN_TTL_MS) {
    // Already attempted a fresh relogin very recently → don't ping-pong.
    try { localStorage.removeItem(RELOGIN_MARK_KEY) } catch { /* ignore */ }
    return false
  }
  try { localStorage.setItem(RELOGIN_MARK_KEY, String(Date.now())) } catch { /* ignore */ }
  if (isInitialized) {
    try { liff.logout() } catch { /* ignore — proceed to login anyway */ }
  }
  liff.login(redirectUri ? { redirectUri } : undefined)
  return true
}

/**
 * Clear the relogin loop-guard marker — call after a successful login so a future
 * (hours-later) expired token isn't wrongly blocked.
 */
export function clearReloginMark(): void {
  try { localStorage.removeItem(RELOGIN_MARK_KEY) } catch { /* ignore */ }
}

// Export LIFF service object
export const liffService = {
  initialize: initializeLiff,
  isInitialized: isLiffInitialized,
  isInClient: isInLiffBrowser,
  isLoggedIn: isLiffLoggedIn,
  login: liffLogin,
  logout: liffLogout,
  getProfile: getLiffProfile,
  getAccessToken: getLiffAccessToken,
  getIdToken: getLiffIdToken,
  closeWindow: closeLiffWindow,
  openExternal: openExternalBrowser,
  isTokenExpiredError,
  reloginFresh,
  clearReloginMark,
}
