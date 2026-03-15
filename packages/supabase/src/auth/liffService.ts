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
}
