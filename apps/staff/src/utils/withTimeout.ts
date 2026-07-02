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
