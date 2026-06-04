/**
 * Daily Payout Check - Vercel Cron Job
 * Runs every day at 00:01 to generate automatic payouts
 *
 * Cron Expression: 1 0 * * * (every day at 00:01 UTC)
 */

import { NextRequest, NextResponse } from 'next/server'
import { dailyPayoutCheck } from '../../../../packages/supabase/src/earnings/automatedPayout'

export async function GET(request: NextRequest) {
  console.log('🕐 Daily payout cron job triggered at:', new Date().toISOString())

  try {
    // Verify this is called by Vercel Cron (optional security)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run the daily payout check
    const result = await dailyPayoutCheck()

    if (result.success) {
      console.log(`✅ Daily payout check completed successfully`)
      console.log(`📊 Processed: ${result.processed} staff`)

      if (result.errors.length > 0) {
        console.warn(`⚠️ Errors encountered:`, result.errors)
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        processed: result.processed,
        errors: result.errors
      })
    } else {
      console.error('❌ Daily payout check failed:', result.errors)

      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        processed: result.processed,
        errors: result.errors
      }, { status: 500 })
    }

  } catch (error) {
    console.error('💥 Critical error in daily payout cron:', error)

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error?.toString() || 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow POST for manual testing
export async function POST(request: NextRequest) {
  console.log('🧪 Manual payout check triggered via POST')
  return GET(request)
}