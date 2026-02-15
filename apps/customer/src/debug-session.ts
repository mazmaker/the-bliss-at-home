// @ts-nocheck
/**
 * Debug script to check session storage
 * Run this in browser console to see what's happening
 */

export function debugSession() {
  console.group('🔍 Session Debug Info')

  // 1. Check all localStorage keys
  console.log('📦 All localStorage keys:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      console.log(`  ${key}:`, value?.substring(0, 100) + '...')
    }
  }

  // 2. Check specific auth keys
  console.log('\n🔑 Auth-related keys:')
  const authKeys = [
    'bliss-customer-auth',
    'sb-rbdvlfriqjnwpxmmgisf-auth-token',
    'supabase.auth.token',
  ]

  authKeys.forEach(key => {
    const value = localStorage.getItem(key)
    console.log(`  ${key}:`, value ? '✅ EXISTS' : '❌ MISSING')
    if (value) {
      try {
        const parsed = JSON.parse(value)
        console.log('    expires_at:', parsed.expires_at ? new Date(parsed.expires_at * 1000) : 'N/A')
        console.log('    user:', parsed.user?.email || parsed.currentSession?.user?.email || 'N/A')
      } catch (e) {
        console.log('    (not JSON)')
      }
    }
  })

  // 3. Check Supabase client
  console.log('\n🔌 Supabase Clients:')
  console.log('  window.__supabaseClient:', window.__supabaseClient ? '✅ EXISTS' : '❌ MISSING')

  console.groupEnd()

  return {
    allKeys: Object.keys(localStorage),
    hasBlissAuth: !!localStorage.getItem('bliss-customer-auth'),
    hasSupabaseAuth: !!localStorage.getItem('sb-rbdvlfriqjnwpxmmgisf-auth-token'),
    clientInWindow: !!window.__supabaseClient,
  }
}

/**
 * Clean up old/duplicate sessions from localStorage
 */
export function cleanupOldSessions() {
  console.group('🧹 Cleaning up old sessions')

  // Remove old Supabase default key
  const oldKey = 'sb-rbdvlfriqjnwpxmmgisf-auth-token'
  if (localStorage.getItem(oldKey)) {
    console.log(`Removing old session: ${oldKey}`)
    localStorage.removeItem(oldKey)
  }

  // Keep only the bliss-customer-auth key
  console.log('✅ Cleanup complete')
  console.groupEnd()
}

// Auto-run on import
if (typeof window !== 'undefined') {
  (window as any).debugSession = debugSession
  (window as any).cleanupOldSessions = cleanupOldSessions
  console.log('💡 Run debugSession() in console to check session storage')
  console.log('💡 Run cleanupOldSessions() to remove old sessions')

  // Auto-cleanup on first load
  cleanupOldSessions()
}
