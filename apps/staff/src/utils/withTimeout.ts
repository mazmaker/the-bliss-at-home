// Time-box an awaited step so a hung network/SDK call (supabase query, liff.init /
// liff.getProfile, loginWithLine, rpc) can NEVER freeze a spinner forever.
// Same proven pattern as pages/auth/Callback.tsx — on timeout it rejects, so the
// caller's catch/finally runs and the UI shows an actionable error instead of an
// eternal spinner. NOTE: a timeout does NOT cancel the in-flight request; callers
// that mutate state must treat "timed out" as "unknown outcome" and re-check.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        console.error(`[withTimeout] Step timed out after ${ms}ms: ${label}`)
        reject(new Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'))
      }, ms)
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>
  // finally clears the timer the instant the real promise settles — otherwise every
  // successful call leaks a live 8-15s timer AND fires a bogus "timed out" console.error
}

// Same time-box for PostgrestBuilder-style thenables (supabase queries are not real
// Promises until awaited). Wrapping via Promise.resolve() keeps types intact.
export function queryWithTimeout<T>(thenable: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return withTimeout(Promise.resolve(thenable), ms, label)
}

// Auto-retry a TRANSIENT async step with a fail-fast per-attempt timeout + linear backoff.
// This automates what staff were doing BY HAND (re-clicking LINE login until a fast-enough
// mobile-network window succeeds) — the confirmed root cause of the first-login
// "Signing you in..." stall (2026-07-06 device data: the error card DID eventually appear
// = not a dead hang, and manual retries DID eventually work = transient slowness). So a few
// short auto-retries land the login without the user staring at a 60s spinner or giving up.
//
// `factory` MUST create a FRESH promise each call (a settled promise can't be re-awaited):
//   withRetry(() => liffService.initialize(id), { tries: 3, ms: 10000, label: 'liff.init()' })
// Each attempt is time-boxed by `ms` (fail fast → retry), NOT the total. `onAttempt` lets the
// UI show live "กำลังเชื่อมต่อ… (ครั้งที่ N/M)" feedback so a slow attempt reads as progress,
// not a freeze. Retrying is SAFE for our steps: liff.init short-circuits once initialized,
// getProfile is a pure read, and loginWithLine self-heals (its sign-in-first branch returns
// the account a prior timed-out signUp already created).
export async function withRetry<T>(
  factory: () => Promise<T>,
  opts: { tries: number; ms: number; label: string; backoffMs?: number; onAttempt?: (attempt: number, tries: number) => void }
): Promise<T> {
  const { tries, ms, label, backoffMs = 1000, onAttempt } = opts
  let lastErr: unknown
  for (let attempt = 1; attempt <= tries; attempt++) {
    onAttempt?.(attempt, tries)
    try {
      return await withTimeout(factory(), ms, `${label} (attempt ${attempt}/${tries})`)
    } catch (err) {
      lastErr = err
      console.warn(`[withRetry] ${label} attempt ${attempt}/${tries} failed:`, (err as any)?.message || err)
      if (attempt < tries) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt)) // linear backoff: 1s, 2s, …
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed after ${tries} attempts`)
}
