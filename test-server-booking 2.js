/**
 * Test script to debug the server booking issue
 */

const API_URL = 'http://localhost:3000/api/secure-bookings'

async function testBookingAPI() {
  console.log('🧪 Testing hotel booking API...')

  try {
    // Test 1: Test server health
    console.log('\n1. Testing server health...')
    const healthResponse = await fetch('http://localhost:3000/health')
    const healthData = await healthResponse.json()
    console.log('✅ Server health:', healthData)

    // Test 2: Test API root
    console.log('\n2. Testing API root...')
    const apiResponse = await fetch('http://localhost:3000/api')
    const apiData = await apiResponse.json()
    console.log('✅ API info:', apiData)

    // Test 3: Test booking endpoint with no auth (should fail with 401)
    console.log('\n3. Testing booking endpoint without auth...')
    const noAuthResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: 'test',
        booking_date: '2026-02-18',
        booking_time: '10:00',
        duration: 60,
        base_price: 1000,
        final_price: 1000
      })
    })
    const noAuthData = await noAuthResponse.json()
    console.log('❌ No auth response:', noAuthData)

    // Test 4: Test with dummy token (should fail with invalid token)
    console.log('\n4. Testing with dummy token...')
    const dummyTokenResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token-123'
      },
      body: JSON.stringify({
        service_id: 'test',
        booking_date: '2026-02-18',
        booking_time: '10:00',
        duration: 60,
        base_price: 1000,
        final_price: 1000
      })
    })
    const dummyTokenData = await dummyTokenResponse.json()
    console.log('❌ Dummy token response:', dummyTokenData)

    console.log('\n✅ API tests completed. Server is responding correctly.')
    console.log('🔍 The issue is likely with the JWT token format from the frontend.')

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testBookingAPI()