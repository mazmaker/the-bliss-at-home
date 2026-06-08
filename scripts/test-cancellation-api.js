// Test cancellation API endpoints
require('dotenv').config({ path: '../apps/server/.env' });

async function testCancellationAPI() {
  const baseUrl = 'https://the-bliss-at-home-server.vercel.app';

  console.log('🔧 Testing Cancellation API Endpoints...');
  console.log('🌐 Base URL:', baseUrl);

  try {
    // Test 1: Get cancellation policy
    console.log('\n1️⃣ Testing GET /api/cancellation-policy');
    const policyResponse = await fetch(`${baseUrl}/api/cancellation-policy`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (test-script)',
      }
    });

    console.log('   Status:', policyResponse.status);
    console.log('   Headers:', Object.fromEntries(policyResponse.headers.entries()));

    if (policyResponse.ok) {
      const policyData = await policyResponse.json();
      console.log('   ✅ Policy retrieved successfully');
      console.log('   📊 Tiers found:', policyData.data?.tiers?.length || 0);
      console.log('   📋 Settings:', policyData.data?.settings ? 'Present' : 'Missing');
    } else {
      const errorText = await policyResponse.text();
      console.log('   ❌ Error:', errorText);
    }

    // Test 2: Test with example booking ID
    console.log('\n2️⃣ Testing GET /api/cancellation-policy/check/:bookingId');
    const exampleBookingId = '92b252d8-23db-487b-93e5-2f60132432dc'; // From user's logs
    const checkResponse = await fetch(`${baseUrl}/api/cancellation-policy/check/${exampleBookingId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (test-script)',
      }
    });

    console.log('   Status:', checkResponse.status);

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log('   ✅ Booking check successful');
      console.log('   🔍 Can cancel:', checkData.data?.canCancel);
      console.log('   🔄 Can reschedule:', checkData.data?.canReschedule);
      console.log('   💰 Refund percentage:', checkData.data?.refundPercentage);
    } else {
      const errorText = await checkResponse.text();
      console.log('   ⚠️ Check failed:', errorText);
    }

    // Test 3: Check server health
    console.log('\n3️⃣ Testing server health');
    const healthResponse = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('   Server Status:', healthResponse.status);
    if (healthResponse.ok) {
      console.log('   ✅ Server is responding');
    }

    console.log('\n🎉 Cancellation API test completed!');

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testCancellationAPI().catch(console.error);