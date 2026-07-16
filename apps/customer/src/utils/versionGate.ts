/**
 * versionGate — auto cache-bust (2026-07-15).
 *
 * THE problem this solves: a Vite SPA served by Vercel can be held STALE by the browser / in-app
 * WebView cache — it keeps a cached `index.html` that references OLD hashed assets, so a deployed fix
 * (or a rebuilt bundle carrying a new env value like the Google Maps key) never reaches the user until
 * a hard refresh. THE fix: on cold-load (once) and on tab/WebView resume, fetch the live `index.html`
 * with a cache-busting query + `no-store` (bypassing the cache to read what the SERVER serves), compare
 * its entry-bundle hash to the one THIS page loaded, and `location.reload()` if a newer build is live.
 * Paired with the `no-store` Cache-Control on `index.html` (vercel.json). Loop-guarded, no foreground
 * poll (never reloads mid-form), inert in dev (entry is `/src/main.tsx`, unhashed).
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
    if (sessionStorage.getItem(RELOADED_KEY) === dep) return
    sessionStorage.setItem(RELOADED_KEY, dep)
    location.reload()
  } finally {
    checking = false
  }
}

/** Start the gate: check shortly after cold-load and on tab/WebView resume. */
export function startVersionGate(): void {
  if (!currentEntryHash()) return // dev build → inert
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForNewVersion()
  })
  setTimeout(() => void checkForNewVersion(), 8_000)
}
