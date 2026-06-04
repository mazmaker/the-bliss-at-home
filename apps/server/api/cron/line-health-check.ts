/**
 * LINE Health Check - Vercel Cron Job
 * Runs every 30 minutes to check LINE API connectivity
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 LINE health check triggered at:', new Date().toISOString())

  try {
    // Verify this is called by Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!token) {
      console.error('❌ LINE_CHANNEL_ACCESS_TOKEN not configured')
      return NextResponse.json({
        success: false,
        error: 'LINE token not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Test LINE API connectivity with a simple quota check
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.line.me/v2/bot/quota', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ LINE API health check failed:', response.status, error)

      return NextResponse.json({
        success: false,
        status: response.status,
        error: error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('✅ LINE API healthy:', data)

    return NextResponse.json({
      success: true,
      quota: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error('⏰ LINE health check timeout')
      return NextResponse.json({
        success: false,
        error: 'Timeout',
        timestamp: new Date().toISOString()
      }, { status: 408 })
    }

    console.error('💥 LINE health check error:', error)
    return NextResponse.json({
      success: false,
      error: error?.toString() || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also allow POST for manual testing
export async function POST(request: NextRequest) {
  console.log('🧪 Manual LINE health check triggered via POST')
  return GET(request)
}