/**
 * versionGate — auto cache-bust for the admin app (2026-07-15).
 *
 * THE problem this solves: the admin app is a Vite SPA that LAZY-loads route chunks (e.g. the
 * Quick Booking wizard is a separate `/assets/QuickBooking-<hash>.js`). When a chunk-only fix
 * deploys, the served `index.html` points at the new hashed chunks, but a browser holding a CACHED
 * `index.html` keeps loading the OLD chunk → the admin runs stale code (e.g. the pre-P15 Quick
 * Booking that shows a picked 120-min duration as the default 60 on the confirm step) until a hard
 * refresh. Deployed fixes don't reach the admin automatically. (The team had been hand-busting via
 * `// cache bust` comments in main.tsx.)
 *
 * THE fix: on cold-load (once) and on tab re-focus/resume (visibilitychange→visible), fetch the live
 * `index.html` with a cache-busting query + `no-store` (bypassing the browser cache to read what the
 * SERVER currently serves), extract its entry-bundle hash, and compare it to the hash THIS page
 * loaded. If they differ, a newer build is live → `location.reload()`. Paired with the `no-store`
 * Cache-Control on `index.html` (apps/admin/vercel.json) so the reload fetches fresh HTML → fresh
 * chunk refs. Admin is a NORMAL browser (not the LINE WebView), so the no-store header alone already
 * largely fixes it; this gate is the belt-and-suspenders that also auto-reloads without a manual refresh.
 *
 * No build-time tooling / version.json needed — a new deploy changes the entry hash (Rollup cascades
 * a changed lazy-chunk hash up into the entry's import refs). Inert in dev (entry is `/src/main.tsx`).
 */

function currentEntryHash(): string | null {
  const scripts = Array.from(
    document.querySelectorAll('script[type="module"][src]')
  ) as HTMLScriptElement[]
  for (const s of scripts) {
    const m = s.src.match(/\/assets\/index-([^./]+)\.js/)
    if (m) return m[1]
  }
  return null
}

async function deployedEntryHash(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_vg=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/\/assets\/index-([^."]+)\.js/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

let checking = false
const RELOADED_KEY = 'vg-reloaded-for'

async function checkForNewVersion(): Promise<void> {
  if (checking) return
  const cur = currentEntryHash()
  if (!cur) return
  checking = true
  try {
    const dep = await deployedEntryHash()
    if (!dep || dep === cur) return
    if (sessionStorage.getItem(RELOADED_KEY) === dep) return // already tried reloading for this build
    sessionStorage.setItem(RELOADED_KEY, dep)
    location.reload()
  } finally {
    checking = false
  }
}

/**
 * Start the gate. Checks shortly after cold-load (catches a stale cached cold-load) and on tab
 * re-focus. No foreground polling, so it never reloads an admin mid-form (e.g. mid Quick-Booking wizard).
 */
export function startVersionGate(): void {
  if (!currentEntryHash()) return // dev build → inert
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForNewVersion()
  })
  setTimeout(() => void checkForNewVersion(), 8_000)
}
