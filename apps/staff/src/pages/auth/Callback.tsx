/**
 * OAuth Callback Page
 * Handles both LINE (LIFF) and Google OAuth authentication callbacks
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_CONFIGS, authService, liffService, supabase } from '@bliss/supabase/auth'
import { AlertCircle, Loader2 } from 'lucide-react'
import { withTimeout, withRetry } from '../../utils/withTimeout'

// Get LIFF ID from environment
const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

export function StaffAuthCallback() {
  const navigate = useNavigate()
  const config = APP_CONFIGS.STAFF
  const [error, setError] = useState<string | null>(null)
  // Live progress under the spinner. The confirmed root cause is transient mobile slowness,
  // so we now AUTO-RETRY each step and SHOW the attempt — a slow first-login reads as
  // "กำลังลองใหม่…" progress instead of a dead freeze that makes staff give up. (P10, 2026-07-06)
  const [progress, setProgress] = useState<string | null>(null)
  // [FIRST-LOGIN-LOOP FIX 2026-07-07] On-screen diagnostics. We CANNOT reproduce the LINE
  // in-app-browser first-login via Playwright, so record the exact step + URL params that
  // failed and show them under the error card → the staff screenshots it → we see the real
  // fail path instead of guessing (this is how P10/P11 shipped fixes that didn't fully land).
  const [diagText, setDiagText] = useState<string | null>(null)
  const hasRun = useRef(false)
  const diagRef = useRef<string[]>([])
  const rec = (m: string) => { try { diagRef.current.push(`${diagRef.current.length + 1}. ${m}`) } catch { /* ignore */ } }

  // [FIRST-LOGIN-LOOP FIX 2026-07-07] Retry = mint a BRAND-NEW authorization code, never reload
  // the current URL (its ?code= is single-use and already spent → re-exchanging it loops forever).
  const handleRetryFresh = () => {
    liffService.clearReloginMark() // explicit user action → bypass the loop guard
    try {
      const u = new URL(window.location.href)
      ;['code', 'state', 'liffClientId', 'liffRedirectUri', 'liffIsEscapedFromApp'].forEach((p) => u.searchParams.delete(p))
      window.history.replaceState({}, '', u.toString())
      if (liffService.isInitialized()) { liffService.reloginFresh(); return } // logout()+login() = fresh code
    } catch { /* ignore */ }
    // Fallback: a full load of the CLEAN login page resets module state + carries no dead code.
    window.location.href = '/staff/login'
  }

  useEffect(() => {
    async function handleCallback() {
      // Prevent double execution in React Strict Mode
      if (hasRun.current) {
        console.log('[Callback] Already executed, skipping...')
        return
      }
      hasRun.current = true

      try {
        console.log('[Callback] Starting callback handler...')

        // Check if this is a LINE (LIFF) callback or Google OAuth callback
        const urlParams = new URLSearchParams(window.location.search)
        // [FIX] A real LINE/LIFF return always carries liffClientId; requiring liffRedirectUri
        // TOO caused LINE callbacks that omit it to fall into the Google branch below (whose
        // getSession() can hang → the reported "Signing you in..." freeze). Google's own
        // callback never carries liffClientId, so keying on either LIFF param is a safe,
        // precise LINE detector and can't mis-route a Google callback into the LIFF branch.
        const hasLiffParams = urlParams.has('liffClientId') || urlParams.has('liffRedirectUri')
        const isLiffCallback = !!LIFF_ID && hasLiffParams

        // Helper: check if a path is a valid deep link target (not login/auth pages)
        function isValidDeepLink(path: string | null): boolean {
          if (!path) return false
          if (!path.startsWith('/staff/')) return false
          if (path.startsWith('/staff/login')) return false
          if (path.startsWith('/staff/auth')) return false
          if (path.startsWith('/staff/callback')) return false
          if (path.startsWith('/staff/register')) return false
          return true
        }

        // Helper: only save deep link if it's valid AND doesn't overwrite an existing valid one
        function saveDeepLinkIfBetter(path: string) {
          if (!isValidDeepLink(path)) return
          const existing = localStorage.getItem('staff_redirect_after_login')
          if (isValidDeepLink(existing)) return
          localStorage.setItem('staff_redirect_after_login', path)
        }

        // === Extract deep link path from multiple sources ===
        // Strategy 1: Direct liff.state param (present when user is already LINE-logged-in)
        let deepLinkPath: string | null = urlParams.get('liff.state')
        if (deepLinkPath && deepLinkPath.startsWith('/')) {
          saveDeepLinkIfBetter(deepLinkPath)
        }

        // Strategy 2: Extract liff.state from liffRedirectUri param
        // When NOT logged in, LIFF encodes the deep link path inside liffRedirectUri
        // e.g. liffRedirectUri=https://example.com/login?liff.state=%2Fstaff%2Fjobs%2Fxxx
        if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
          const liffRedirectUri = urlParams.get('liffRedirectUri')
          if (liffRedirectUri) {
            try {
              const redirectUrl = new URL(decodeURIComponent(liffRedirectUri))
              const stateFromRedirect = redirectUrl.searchParams.get('liff.state')
              if (stateFromRedirect && stateFromRedirect.startsWith('/')) {
                deepLinkPath = stateFromRedirect
                saveDeepLinkIfBetter(deepLinkPath)
              }
            } catch (e) {
              console.log('[Callback] Could not parse liffRedirectUri:', liffRedirectUri)
            }
          }
        }

        // Strategy 3: Extract from URL pathname (LIFF secondary redirect URL format)
        if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
          const pathname = window.location.pathname
          if (pathname.startsWith('/staff/login/staff/')) {
            deepLinkPath = pathname.substring('/staff/login'.length)
            saveDeepLinkIfBetter(deepLinkPath)
          }
        }

        // Strategy 4: Try to decode OAuth state parameter (may contain liff.state)
        if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
          const oauthState = urlParams.get('state')
          if (oauthState) {
            try {
              const decoded = decodeURIComponent(oauthState)
              // Format could be: {token};liff.state={path} or contain it URL-encoded
              const stateMatch = decoded.match(/liff\.state=([^&;]+)/)
              if (stateMatch) {
                const pathFromState = decodeURIComponent(stateMatch[1])
                if (pathFromState.startsWith('/')) {
                  deepLinkPath = pathFromState
                  saveDeepLinkIfBetter(deepLinkPath)
                }
              }
            } catch (e) {
              // ignore decode errors
            }
          }
        }

        if (isLiffCallback) {
          // Handle LINE (LIFF) callback
          console.log('[Callback] Detected LINE LIFF callback')
          rec(`LIFF cb. code=${urlParams.has('code')} cid=${urlParams.has('liffClientId')} rUri=${urlParams.has('liffRedirectUri')} init=${liffService.isInitialized()}`)

          // Initialize LIFF if not already.
          // 🔴 [FIRST-LOGIN-LOOP FIX 2026-07-07] liff.init() EXCHANGES the single-use LINE
          // authorization `code` with the LINE Platform. An OAuth code is single-use, so init is
          // NOT idempotent — the old withRetry(2×15s) re-ran liff.init() with an already-consumed
          // code on attempt 2, which can NEVER succeed → the reported first-login loop ("เชื่อมต่อ
          // LINE ช้า 2/2" → Authentication Failed, escaped only by closing the app for a fresh code).
          // Use ONE attempt with a generous ceiling; the outer 100s watchdog is the real backstop.
          if (!liffService.isInitialized()) {
            if (!LIFF_ID) {
              throw new Error('LIFF ID not configured')
            }
            setProgress('กำลังเชื่อมต่อ LINE…')
            rec('liff.init() start (single attempt — code-exchange is single-use)')
            // Device evidence (2026-07-07): liff.init() reliably HANGS while exchanging the FIRST
            // code (the diagnostic showed "liff.init() start" → timeout, never past it). So fail
            // FAST (12s, not 30s) and let the catch's auto-recover redirect to a CLEAN re-init
            // that picks up the LINE session liff.login already established (proven to log in).
            await withTimeout(liffService.initialize(LIFF_ID), 12000, 'liff.init()')
            rec(`liff.init() ok. loggedIn=${liffService.isLoggedIn()}`)
          } else {
            rec('liff already initialized')
          }

          // 🔴 [FIRST-LOGIN-LOOP FIX 2026-07-07] Strip the now-consumed LINE OAuth params from the
          // URL right after liff.init() resolves (LIFF docs: only change the URL AFTER init
          // resolves). So a reload / back-nav can never re-exchange the DEAD code and re-loop.
          // Keep `liff.state` (the deep-link path) — only the code-exchange params are cleared.
          try {
            const u = new URL(window.location.href)
            let changed = false
            ;['code', 'state', 'liffClientId', 'liffRedirectUri', 'liffIsEscapedFromApp'].forEach((p) => {
              if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true }
            })
            if (changed) window.history.replaceState({}, '', u.toString())
          } catch { /* ignore */ }

          // Strategy 5: After liff.init(), SDK may have added liff.state to URL
          if (!deepLinkPath || !deepLinkPath.startsWith('/')) {
            const postInitParams = new URLSearchParams(window.location.search)
            const postInitLiffState = postInitParams.get('liff.state')
            if (postInitLiffState && postInitLiffState.startsWith('/')) {
              deepLinkPath = postInitLiffState
              saveDeepLinkIfBetter(deepLinkPath)
            }
          }

          // Check if user is logged in
          if (!liffService.isLoggedIn()) {
            rec('NOT logged in after init → throw')
            throw new Error('LINE authentication failed')
          }

          // Get LINE profile (auto-retry 2×10s — pure read, safe to retry)
          setProgress(null)
          const profile = await withRetry(() => liffService.getProfile(), {
            tries: 2, ms: 10000, backoffMs: 1000, label: 'liff.getProfile()',
            onAttempt: (n, m) => setProgress(n > 1 ? `กำลังโหลดโปรไฟล์… (${n}/${m})` : null),
          })
          rec('getProfile ok')

          // Check if this is link mode (user wants to link LINE to existing account)
          const isLinkMode = localStorage.getItem('line_link_mode') === 'true'

          if (isLinkMode) {
            // Link mode: Link LINE to existing account
            console.log('[Callback] Link mode: Linking LINE to existing account')

            // Get stored user ID to prevent session switching
            const storedUserId = localStorage.getItem('line_link_user_id')
            localStorage.removeItem('line_link_mode')
            localStorage.removeItem('line_link_user_id')

            if (!storedUserId) {
              console.log('[Callback] No stored user ID found!')
              throw new Error('Session expired. Please try linking again.')
            }

            console.log('[Callback] Linking to user:', storedUserId)
            console.log('[Callback] LINE profile:', { userId: profile.userId, displayName: profile.displayName })

            // Link LINE account to stored user (not current session user)
            console.log('[Callback] Calling linkLineAccountToUser...')
            await authService.linkLineAccountToUser({
              userId: storedUserId,
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            })

            console.log('[Callback] Successfully linked! Redirecting to profile...')
            // Force full page reload to refresh user data with LINE fields
            window.location.href = '/staff/profile'
          } else {
            // Login mode: Authenticate with Supabase
            console.log('[Callback] Login mode: Authenticating with LINE')

            // Check for invite data from admin invitation flow
            const inviteStaffId = localStorage.getItem('staff_invite_staff_id') || undefined
            if (inviteStaffId) {
              console.log('[Callback] Found invite staff ID:', inviteStaffId)
            }

            // Auto-retry 2×20s. loginWithLine self-heals on retry: a signUp that timed out
            // still created the account, so the next attempt's sign-in-first branch just returns it.
            setProgress('กำลังเข้าสู่ระบบ…')
            rec('loginWithLine start')
            await withRetry(() => authService.loginWithLine({
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            }, 'STAFF', inviteStaffId), {
              tries: 2, ms: 20000, backoffMs: 1500, label: 'loginWithLine()',
              onAttempt: (n, m) => setProgress(n > 1 ? `เข้าสู่ระบบช้า กำลังลองใหม่… (${n}/${m})` : 'กำลังเข้าสู่ระบบ…'),
            })
            rec('loginWithLine ok → redirect')

            // Clean up invite data from localStorage
            localStorage.removeItem('staff_invite_token')
            localStorage.removeItem('staff_invite_staff_id')
            localStorage.removeItem('staff_invite_name')

            // Redirect to saved deep link path (from LIFF liff.state) or dashboard
            const savedPath = localStorage.getItem('staff_redirect_after_login')
            const targetPath = savedPath || config.defaultPath
            // Don't remove here — StaffLayout will clean up after landing
            console.log('[Callback] Redirecting to:', targetPath)
            liffService.clearReloginMark() // login succeeded → reset the expired-token loop guard
            window.location.href = targetPath
          }
        } else {
          // Handle Google OAuth callback
          console.log('[Callback] Detected Google OAuth callback')

          // Supabase automatically exchanges the code for session tokens
          // Just wait a moment for the session to be set
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Get current session
          const { data: { session }, error: sessionError } = await withTimeout(
            supabase.auth.getSession(), 8000, 'supabase.auth.getSession()'
          )

          if (sessionError || !session) {
            throw new Error('OAuth authentication failed')
          }

          console.log('[Callback] Session obtained, checking profile...')

          // Get or create profile with STAFF role
          const expectedRole = localStorage.getItem('staff_oauth_expected_role') || 'STAFF'
          localStorage.removeItem('staff_oauth_expected_role')

          // Check current profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            throw new Error('Failed to fetch profile: ' + profileError.message)
          }

          // If profile doesn't exist or has wrong role, update it
          if (!profile || profile.role !== expectedRole) {
            console.log('[Callback] Updating profile role to', expectedRole)

            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
                // [R2] keep LINE pic in line_picture_url; only seed avatar_url when empty (don't clobber an upload)
                line_picture_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                ...(profile?.avatar_url ? {} : { avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture }),
                role: expectedRole,
                status: 'ACTIVE',
                language: 'th',
              })

            if (updateError) {
              throw new Error('Failed to update profile: ' + updateError.message)
            }

            // Check if staff record exists, if not create one
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('id')
              .eq('profile_id', session.user.id)
              .single()

            if (staffError && staffError.code === 'PGRST116') {
              // Staff record doesn't exist, create it
              console.log('[Callback] Creating staff record...')

              const { error: createStaffError } = await supabase
                .from('staff')
                .insert({
                  profile_id: session.user.id,
                  name_th: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Staff',
                  name_en: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Staff',
                  phone: session.user.phone || '0000000000',
                  // [R2] deprecate staff.avatar_url — source of truth is profiles.avatar_url
                  status: 'pending', // Requires admin approval
                })

              if (createStaffError) {
                console.error('[Callback] Failed to create staff record:', createStaffError)
                // Don't throw - staff record will be created by trigger eventually
              }
            }
          }

          console.log('[Callback] Authentication complete, redirecting...')

          // Clear OAuth parameters from URL
          window.history.replaceState({}, '', window.location.pathname)

          // Redirect to saved deep link path or dashboard
          const targetPath = localStorage.getItem('staff_redirect_after_login') || config.defaultPath
          // Don't remove here — StaffLayout will clean up after landing
          console.log('[Callback] Redirecting to:', targetPath)
          window.location.href = targetPath
        }
      } catch (err: any) {
        console.error('[Callback] Error:', err)
        rec(`ERROR: ${err?.message || String(err)}`)

        // [FIX 2026-07-03] A timed-out step may have SUCCEEDED late (field data:
        // loginWithLine/liff.init slow-but-successful). Re-check the session once —
        // if we're actually authenticated, finish the login instead of showing failure.
        try {
          const { data: { session } } = await withTimeout(supabase.auth.getSession(), 5000, 'session re-check (callback)')
          if (session) {
            console.log('[Callback] Step timed out but session exists — proceeding')
            const targetPath = localStorage.getItem('staff_redirect_after_login') || config.defaultPath
            window.location.href = targetPath
            return
          }
        } catch { /* fall through to error card */ }

        // [P11 2026-07-06] Expired LINE token reaching the callback route → fresh re-auth
        // (logout → login) instead of a dead "Authentication Failed" card. Skip in link mode
        // (a reauth would drop the line_link_* flags mid-link). Loop-guarded inside reloginFresh.
        const isLinkMode = localStorage.getItem('line_link_mode') === 'true'
        if (liffService.isTokenExpiredError(err) && !isLinkMode) {
          console.log('[Callback] Access token expired → fresh LINE re-authorization')
          if (liffService.reloginFresh()) return // redirected to LINE; page unloads
          setDiagText(diagRef.current.join('\n'))
          setError('เซสชัน LINE หมดอายุ กรุณาแตะ "ลองอีกครั้ง" เพื่อเข้าสู่ระบบใหม่')
          return
        }

        // 🔴 [FIRST-LOGIN AUTO-RECOVER 2026-07-07] Device evidence: liff.init() reliably HANGS
        // exchanging the FIRST code, but a CLEAN re-init (no code) at /staff/login picks up the
        // LINE session liff.login() already established and auto-logs-in (the staff's manual
        // "ลองอีกครั้ง" proved this exact path lands on /staff/jobs). So do it AUTOMATICALLY once —
        // strip the spent code + go to a clean /staff/login — instead of dead-ending on the error
        // card. One-shot 60s guard (sessionStorage) so a persistently-failing case can't loop.
        // Gate on !isLoggedIn (the liff.init-hang case); skip link-mode.
        try {
          const RECOVER_KEY = 'staff_liff_autorecover_ts'
          const last = Number(sessionStorage.getItem(RECOVER_KEY) || '0')
          const recentlyRecovered = last > 0 && Date.now() < last + 60_000
          if (!isLinkMode && !recentlyRecovered && !liffService.isLoggedIn()) {
            sessionStorage.setItem(RECOVER_KEY, String(Date.now()))
            rec('AUTO-RECOVER → clean /staff/login (liff session should already exist)')
            const u = new URL(window.location.href)
            ;['code', 'state', 'liffClientId', 'liffRedirectUri', 'liffIsEscapedFromApp'].forEach((p) => u.searchParams.delete(p))
            window.history.replaceState({}, '', u.toString())
            window.location.href = '/staff/login'
            return
          }
        } catch { /* fall through to the error card */ }

        setDiagText(diagRef.current.join('\n'))
        setError(err.message || 'Authentication failed')
      }
    }

    // Ultimate safety net for any await that slips past the per-step timeouts (e.g. the
    // Google-branch DB calls / link-mode). Must sit ABOVE the worst-case auto-retry budget
    // (liff.init 2×15 + getProfile 2×10 + loginWithLine 2×20 + backoffs ≈ 93s) so it never
    // aborts a legit retry sequence — the per-step timeouts (device-confirmed to fire) are the
    // real control, this is just the last-resort backstop. (P10, 2026-07-06: was 75s.)
    const watchdog = setTimeout(() => {
      rec('WATCHDOG 100s fired')
      setDiagText(diagRef.current.join('\n'))
      setError((prev) => prev || 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาแตะ "ลองอีกครั้ง"')
    }, 100000)

    handleCallback().finally(() => clearTimeout(watchdog))

    return () => clearTimeout(watchdog)
  }, [navigate, config.defaultPath])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bliss-50 to-bliss-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-bliss-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-bliss-600 mb-6">{error}</p>
            {/* 🔴 [FIRST-LOGIN-LOOP FIX 2026-07-07] Retry = mint a FRESH authorization code
                (handleRetryFresh: strip the spent ?code= + liff.logout()→login()), NOT
                window.location.reload() — reloading re-exchanges the already-consumed single-use
                code, which is exactly what looped the first-login forever. */}
            <button
              onClick={handleRetryFresh}
              className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold mb-3"
            >
              ลองอีกครั้ง
            </button>
            {/* [FIRST-LOGIN-LOOP FIX 2026-07-07] Dev diagnostics — the staff screenshots this so
                we can see the exact fail path from a LINE in-app browser we can't reproduce. */}
            {diagText && (
              <details className="w-full mb-3 text-left">
                <summary className="text-xs text-bliss-400 cursor-pointer">รายละเอียด (สำหรับทีมพัฒนา)</summary>
                <pre className="text-[10px] leading-snug text-bliss-500 whitespace-pre-wrap break-all bg-bliss-50 rounded p-2 mt-1">{diagText}</pre>
              </details>
            )}
            <button
              onClick={() => navigate('/staff/login', { replace: true })}
              className="text-sm text-bliss-500 hover:text-bliss-700 transition"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bliss-50 to-bliss-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-bliss-800 mb-2">
            Signing you in...
          </h2>
          <p className="text-bliss-600">
            Please wait while we complete your authentication.
          </p>
          {/* [P10] Live progress so a slow-but-working first-login reads as active retrying,
              not a frozen spinner that makes staff give up. */}
          {progress && (
            <p className="text-sm text-emerald-700 mt-3 font-medium">{progress}</p>
          )}
        </div>
      </div>
    </div>
  )
}
