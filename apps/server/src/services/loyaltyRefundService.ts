/**
 * Loyalty Points Refund Service (server-side copy)
 *
 * Duplicated from packages/supabase/src/services/loyaltyService.ts because
 * that package is ESM ("type": "module") and this server compiles to CommonJS.
 * A static cross-package import crashes on Vercel with ERR_REQUIRE_ESM.
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface CustomerPoints {
  customer_id: string
  total_points: number
  lifetime_earned: number
  lifetime_redeemed: number
}

async function getOrCreateCustomerPoints(
  client: SupabaseClient,
  customerId: string
): Promise<CustomerPoints> {
  const { data: existing } = await client
    .from('customer_points')
    .select('*')
    .eq('customer_id', customerId)
    .single()

  if (existing) return existing as CustomerPoints

  const { data, error } = await client
    .from('customer_points')
    .insert({ customer_id: customerId })
    .select()
    .single()

  if (error) throw new Error(`Failed to create customer points: ${error.message}`)
  return data as CustomerPoints
}

/**
 * Refund redeemed points when a booking is cancelled.
 * Returns the number of points refunded (0 if nothing to refund).
 */
export async function refundPoints(
  client: SupabaseClient,
  customerId: string,
  bookingId: string
): Promise<number> {
  // Find the redeem transaction for this booking
  const { data: redeemTx } = await client
    .from('point_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('booking_id', bookingId)
    .eq('type', 'redeem')
    .single()

  if (!redeemTx) return 0

  const pointsToRefund = Math.abs(redeemTx.points)
  const cp = await getOrCreateCustomerPoints(client, customerId)

  await client.from('point_transactions').insert({
    customer_id: customerId,
    type: 'refund',
    points: pointsToRefund,
    balance_after: cp.total_points + pointsToRefund,
    booking_id: bookingId,
    description: `คืนแต้มจากการยกเลิก`,
  })

  await client
    .from('customer_points')
    .update({
      total_points: cp.total_points + pointsToRefund,
      lifetime_redeemed: cp.lifetime_redeemed - pointsToRefund,
    })
    .eq('customer_id', customerId)

  return pointsToRefund
}
