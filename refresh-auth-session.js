/**
 * Refresh Auth Session Script
 * เคลียร์ cache และ refresh session
 */

console.log('🔄 Refreshing Auth Session...')

// 1. Clear localStorage
localStorage.clear()
console.log('✅ Cleared localStorage')

// 2. Clear sessionStorage
sessionStorage.clear()
console.log('✅ Cleared sessionStorage')

// 3. Clear cookies (if any)
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log('✅ Cleared cookies')

// 4. Force refresh page
setTimeout(() => {
  console.log('🔄 Refreshing page...')
  window.location.reload(true)
}, 1000)

console.log('💡 Session refresh completed - page will reload in 1 second')