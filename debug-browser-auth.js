// Debug Browser Auth
// Copy paste ใน Browser Console (F12) เมื่อ login แล้ว

console.log('🔍 Debug Hotel Authentication Status')
console.log('=====================================')

// Get current user from localStorage
const session = localStorage.getItem('supabase.auth.token')
if (session) {
  try {
    const parsed = JSON.parse(session)
    console.log('👤 Current User Session:')
    console.log('   User ID:', parsed.currentSession?.user?.id)
    console.log('   Email:', parsed.currentSession?.user?.email)
    console.log('   Role:', parsed.currentSession?.user?.user_metadata?.role)
    console.log('   Hotel ID in metadata:', parsed.currentSession?.user?.user_metadata?.hotel_id)
    console.log('')
  } catch (e) {
    console.error('Cannot parse session:', e)
  }
} else {
  console.log('❌ No session found')
}

// Get current URL hotel ID
const currentPath = window.location.pathname
const hotelIdMatch = currentPath.match(/\/hotel\/([^\/]+)/)
if (hotelIdMatch) {
  console.log('🏨 Hotel ID from URL:', hotelIdMatch[1])
} else {
  console.log('❌ No hotel ID in URL')
}

console.log('')
console.log('📋 Full URL:', window.location.href)
console.log('📋 Path:', window.location.pathname)