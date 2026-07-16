/**
 * versionGate — auto cache-bust for the LINE-LIFF WebView (2026-07-15).
 *
 * THE problem this solves: the staff app runs inside the LINE in-app WebView, which caches
 * `index.html` very aggressively. When a new build deploys, the served `index.html` points at new
 * hashed assets (`/assets/index-<hash>.js`), but the WebView keeps serving its CACHED `index.html`
 * → it loads the OLD bundle → the staff runs stale code (e.g. a pre-v5 build that still shows the
 * false "ยังไม่ยืนยันตัวตน/ยังไม่เพิ่มเอกสาร" checklist + a defaulted-OFF availability pill) until
 * they FULLY restart the LINE app. Deployed fixes never reach them automatically.
 *
 * THE fix: on cold-load (once) and on every WebView RESUME (visibilitychange→visible), fetch the
 * live `index.html` with a cache-busting query + `no-store` (so we bypass the WebView cache and read
 * what the SERVER currently serves), extract its entry-bundle hash, and compare it to the hash of the
 * bundle THIS page actually loaded. If they differ, a newer build is live → `location.reload()` to
 * pick it up. Paired with the `no-store` Cache-Control on `index.html` (apps/staff/vercel.json) so
 * the reload fetches fresh HTML instead of the cached copy (which would otherwise reload-loop).
 *
 * No build-time tooling / version.json needed — a new deploy already changes the entry hash.
 * Inert in dev (the entry script is the unhashed `/src/main.tsx`, so `currentEntryHash()` is null).
 */

// The hash of the entry bundle THIS page loaded, read from the actual <script> tag in the DOM.
// Prod: `/assets/index-<hash>.js`. Dev: `/src/main.tsx` (no match → null → the gate is inert).
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

// The entry-bundle hash the SERVER currently serves, from a cache-busted, no-store index.html fetch.
async function deployedEntryHash(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_vg=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/\/assets\/index-([^."]+)\.js/)
    return m ? m[1] : null
  } catch {
    return null // offline / transient — try again on the next resume, never block the app
  }
}

let checking = false
// Guard so a stubborn cache (reload can't shake it) reloads AT MOST once per detected version,
// never an infinite reload loop.
const RELOADED_KEY = 'vg-reloaded-for'

async function checkForNewVersion(): Promise<void> {
  if (checking) return
  const cur = currentEntryHash()
  if (!cur) return
  checking = true
  try {
    const dep = await deployedEntryHash()
    if (!dep || dep === cur) return
    // A newer build is live and we're on an older one.
    if (sessionStorage.getItem(RELOADED_KEY) === dep) return // already tried reloading for this build
    sessionStorage.setItem(RELOADED_KEY, dep)
    location.reload()
  } finally {
    checking = false
  }
}

/**
 * Start the gate. Checks shortly after cold-load (catches a stale cached cold-load — the main
 * symptom) and on every WebView resume (LIFF backgrounds constantly). Deliberately does NOT poll
 * while foregrounded, so it never reloads a staff mid-action (e.g. during a running ServiceTimer);
 * a resume is a safe moment to pick up a new build.
 */
export function startVersionGate(): void {
  if (!currentEntryHash()) return // dev build → inert
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForNewVersion()
  })
  setTimeout(() => void checkForNewVersion(), 8_000)
}
