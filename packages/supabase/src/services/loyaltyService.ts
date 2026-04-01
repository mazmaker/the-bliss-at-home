import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// ==========================================
// Types
// ==========================================

export interface LoyaltySettings {
  loyalty_enabled: boolean;
  points_per_baht: number;
  points_to_baht: number;
  min_redeem_points: number;
  max_discount_percent: number;
  first_booking_bonus: number;
  points_expiry_days: number;
  points_expiry_warning_days: number;
}

export interface CustomerPoints {
  id: string;
  customer_id: string;
  total_points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  lifetime_expired: number;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  customer_id: string;
  type: 'earn' | 'redeem' | 'expire' | 'refund' | 'bonus' | 'admin_adjust';
  points: number;
  balance_after: number;
  booking_id: string | null;
  description: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
}

export interface RedeemValidation {
  valid: boolean;
  error?: string;
  points_to_use: number;
  discount_amount: number;
}

// ==========================================
// Settings
// ==========================================

const DEFAULT_SETTINGS: LoyaltySettings = {
  loyalty_enabled: true,
  points_per_baht: 100,
  points_to_baht: 10,
  min_redeem_points: 100,
  max_discount_percent: 50,
  first_booking_bonus: 50,
  points_expiry_days: 365,
  points_expiry_warning_days: 30,
};

export async function getLoyaltySettings(
  client: SupabaseClient<Database>
): Promise<LoyaltySettings> {
  const loyaltyKeys = [
    'loyalty_enabled', 'points_per_baht', 'points_to_baht',
    'min_redeem_points', 'max_discount_percent', 'first_booking_bonus',
    'points_expiry_days', 'points_expiry_warning_days'
  ];

  const { data, error } = await client
    .from('settings')
    .select('key, value')
    .in('key', loyaltyKeys);

  if (error || !data || data.length === 0) {
    return DEFAULT_SETTINGS;
  }

  const result = { ...DEFAULT_SETTINGS };
  for (const row of data) {
    const val = (row.value as any);
    switch (row.key) {
      case 'loyalty_enabled':
        result.loyalty_enabled = val?.enabled ?? true;
        break;
      case 'points_per_baht':
        result.points_per_baht = val?.value ?? 100;
        break;
      case 'points_to_baht':
        result.points_to_baht = val?.value ?? 10;
        break;
      case 'min_redeem_points':
        result.min_redeem_points = val?.value ?? 100;
        break;
      case 'max_discount_percent':
        result.max_discount_percent = val?.value ?? 50;
        break;
      case 'first_booking_bonus':
        result.first_booking_bonus = val?.value ?? 50;
        break;
      case 'points_expiry_days':
        result.points_expiry_days = val?.value ?? 365;
        break;
      case 'points_expiry_warning_days':
        result.points_expiry_warning_days = val?.value ?? 30;
        break;
    }
  }
  return result;
}

// ==========================================
// Customer Points (Read)
// ==========================================

export async function getCustomerPoints(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<CustomerPoints | null> {
  const { data, error } = await client
    .from('customer_points')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data as CustomerPoints;
}

export async function getOrCreateCustomerPoints(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<CustomerPoints> {
  const existing = await getCustomerPoints(client, customerId);
  if (existing) return existing;

  const { data, error } = await client
    .from('customer_points')
    .insert({ customer_id: customerId })
    .select()
    .single();

  if (error) throw new Error(`Failed to create customer points: ${error.message}`);
  return data as CustomerPoints;
}

// ==========================================
// Point Transactions (Read)
// ==========================================

export async function getPointTransactions(
  client: SupabaseClient<Database>,
  customerId: string,
  options?: { type?: string; limit?: number; offset?: number }
): Promise<{ transactions: PointTransaction[]; total: number }> {
  let query = client
    .from('point_transactions')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (options?.type && options.type !== 'all') {
    // Group filters: "earn" = earn+bonus+admin_adjust, "redeem" = redeem+refund
    if (options.type === 'earn') {
      query = query.in('type', ['earn', 'bonus', 'admin_adjust']);
    } else if (options.type === 'redeem') {
      query = query.in('type', ['redeem', 'refund']);
    } else {
      query = query.eq('type', options.type);
    }
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to get transactions: ${error.message}`);

  return {
    transactions: (data || []) as PointTransaction[],
    total: count || 0,
  };
}

// ==========================================
// Earn Points
// ==========================================

export function calculateEarnedPoints(finalPrice: number, pointsPerBaht: number): number {
  return Math.floor(finalPrice / pointsPerBaht);
}

export async function awardPoints(
  client: SupabaseClient<Database>,
  customerId: string,
  bookingId: string,
  finalPrice: number,
  settings?: LoyaltySettings
): Promise<{ pointsEarned: number; bonusPoints: number }> {
  const s = settings || await getLoyaltySettings(client);
  if (!s.loyalty_enabled) return { pointsEarned: 0, bonusPoints: 0 };

  const cp = await getOrCreateCustomerPoints(client, customerId);
  let totalNewPoints = 0;
  let bonusPoints = 0;

  // Calculate points from price
  const earnedPoints = calculateEarnedPoints(finalPrice, s.points_per_baht);
  if (earnedPoints > 0) {
    totalNewPoints += earnedPoints;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + s.points_expiry_days);

    await client.from('point_transactions').insert({
      customer_id: customerId,
      type: 'earn',
      points: earnedPoints,
      balance_after: cp.total_points + totalNewPoints,
      booking_id: bookingId,
      description: `ได้รับจากการจอง`,
      expires_at: expiresAt.toISOString(),
    });
  }

  // Check first booking bonus
  if (s.first_booking_bonus > 0) {
    const { count } = await client
      .from('point_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('type', 'bonus');

    if (count === 0) {
      bonusPoints = s.first_booking_bonus;
      totalNewPoints += bonusPoints;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + s.points_expiry_days);

      await client.from('point_transactions').insert({
        customer_id: customerId,
        type: 'bonus',
        points: bonusPoints,
        balance_after: cp.total_points + totalNewPoints,
        booking_id: bookingId,
        description: 'โบนัสจองครั้งแรก',
        expires_at: expiresAt.toISOString(),
      });
    }
  }

  // Update customer_points totals
  if (totalNewPoints > 0) {
    await client
      .from('customer_points')
      .update({
        total_points: cp.total_points + totalNewPoints,
        lifetime_earned: cp.lifetime_earned + totalNewPoints,
      })
      .eq('customer_id', customerId);

    // Update booking record
    await client
      .from('bookings')
      .update({ points_earned: earnedPoints + bonusPoints })
      .eq('id', bookingId);

    // Send notifications
    const { data: customerData } = await client
      .from('customers')
      .select('profile_id')
      .eq('id', customerId)
      .single();

    if (customerData?.profile_id) {
      // Get booking number for notification message
      const { data: bookingData } = await client
        .from('bookings')
        .select('booking_number')
        .eq('id', bookingId)
        .single();
      const bookingRef = bookingData?.booking_number || bookingId.slice(0, 8);

      // Notification: earned points
      if (earnedPoints > 0) {
        await client.from('notifications').insert({
          user_id: customerData.profile_id,
          type: 'loyalty_points',
          title: 'ได้รับแต้มสะสม',
          message: `คุณได้รับ ${earnedPoints} แต้มจากการจอง ${bookingRef}`,
          data: { booking_id: bookingId, points: earnedPoints, type: 'earn' },
        });
      }

      // Notification: first booking bonus (separate)
      if (bonusPoints > 0) {
        await client.from('notifications').insert({
          user_id: customerData.profile_id,
          type: 'loyalty_points',
          title: 'โบนัสจองครั้งแรก',
          message: `คุณได้รับโบนัส ${bonusPoints} แต้มสำหรับการจองครั้งแรก!`,
          data: { booking_id: bookingId, points: bonusPoints, type: 'bonus' },
        });
      }
    }
  }

  return { pointsEarned: earnedPoints, bonusPoints };
}

// ==========================================
// Redeem Points
// ==========================================

export function validateRedemption(
  pointsToUse: number,
  availablePoints: number,
  orderAmount: number,
  settings: LoyaltySettings
): RedeemValidation {
  if (pointsToUse <= 0) {
    return { valid: false, error: 'จำนวนแต้มต้องมากกว่า 0', points_to_use: 0, discount_amount: 0 };
  }
  if (pointsToUse > availablePoints) {
    return { valid: false, error: 'แต้มไม่เพียงพอ', points_to_use: 0, discount_amount: 0 };
  }
  if (pointsToUse < settings.min_redeem_points) {
    return { valid: false, error: `แลกขั้นต่ำ ${settings.min_redeem_points} แต้ม`, points_to_use: 0, discount_amount: 0 };
  }

  let discount = Math.floor(pointsToUse / settings.points_to_baht);
  const maxDiscount = Math.floor(orderAmount * settings.max_discount_percent / 100);

  if (discount > maxDiscount) {
    discount = maxDiscount;
    const adjustedPoints = discount * settings.points_to_baht;
    return { valid: true, points_to_use: adjustedPoints, discount_amount: discount };
  }

  return { valid: true, points_to_use: pointsToUse, discount_amount: discount };
}

export async function redeemPoints(
  client: SupabaseClient<Database>,
  customerId: string,
  bookingId: string,
  pointsToUse: number,
  discountAmount: number
): Promise<void> {
  const cp = await getOrCreateCustomerPoints(client, customerId);

  await client.from('point_transactions').insert({
    customer_id: customerId,
    type: 'redeem',
    points: -pointsToUse,
    balance_after: cp.total_points - pointsToUse,
    booking_id: bookingId,
    description: `ใช้แลกส่วนลด ฿${discountAmount}`,
  });

  await client
    .from('customer_points')
    .update({
      total_points: cp.total_points - pointsToUse,
      lifetime_redeemed: cp.lifetime_redeemed + pointsToUse,
    })
    .eq('customer_id', customerId);

  await client
    .from('bookings')
    .update({
      points_redeemed: pointsToUse,
      points_discount: discountAmount,
    })
    .eq('id', bookingId);
}

// ==========================================
// Refund Points (on booking cancel)
// ==========================================

export async function refundPoints(
  client: SupabaseClient<Database>,
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
    .single();

  if (!redeemTx) return 0;

  const pointsToRefund = Math.abs(redeemTx.points);
  const cp = await getOrCreateCustomerPoints(client, customerId);

  await client.from('point_transactions').insert({
    customer_id: customerId,
    type: 'refund',
    points: pointsToRefund,
    balance_after: cp.total_points + pointsToRefund,
    booking_id: bookingId,
    description: `คืนแต้มจากการยกเลิก`,
  });

  await client
    .from('customer_points')
    .update({
      total_points: cp.total_points + pointsToRefund,
      lifetime_redeemed: cp.lifetime_redeemed - pointsToRefund,
    })
    .eq('customer_id', customerId);

  return pointsToRefund;
}

// ==========================================
// Points Expiry (Cron)
// ==========================================

export async function processPointsExpiry(
  client: SupabaseClient<Database>
): Promise<{ expiredCount: number; affectedCustomers: string[] }> {
  const now = new Date().toISOString();

  // Find unexpired earn/bonus transactions past their expiry date
  const { data: expiredTxs, error } = await client
    .from('point_transactions')
    .select('*')
    .in('type', ['earn', 'bonus'])
    .eq('expired', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', now);

  if (error || !expiredTxs || expiredTxs.length === 0) {
    return { expiredCount: 0, affectedCustomers: [] };
  }

  const affectedCustomers = new Set<string>();
  let expiredCount = 0;

  for (const tx of expiredTxs) {
    // Mark as expired
    await client
      .from('point_transactions')
      .update({ expired: true })
      .eq('id', tx.id);

    const cp = await getOrCreateCustomerPoints(client, tx.customer_id);
    const pointsToExpire = tx.points; // positive for earn

    // Create expire transaction
    await client.from('point_transactions').insert({
      customer_id: tx.customer_id,
      type: 'expire',
      points: -pointsToExpire,
      balance_after: Math.max(0, cp.total_points - pointsToExpire),
      description: `แต้มหมดอายุ`,
    });

    // Update customer totals
    await client
      .from('customer_points')
      .update({
        total_points: Math.max(0, cp.total_points - pointsToExpire),
        lifetime_expired: cp.lifetime_expired + pointsToExpire,
      })
      .eq('customer_id', tx.customer_id);

    affectedCustomers.add(tx.customer_id);
    expiredCount++;
  }

  return { expiredCount, affectedCustomers: Array.from(affectedCustomers) };
}

// ==========================================
// Expiry Warning Notifications
// ==========================================

export async function processExpiryWarnings(
  client: SupabaseClient<Database>
): Promise<{ warningCount: number }> {
  const settings = await getLoyaltySettings(client);
  const warningDays = settings.points_expiry_warning_days || 30;

  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  const warningDateStr = warningDate.toISOString();

  // Find earn/bonus transactions that:
  // - have expires_at within warning period
  // - are not yet expired
  // - warning has not been sent yet
  const { data: warningTxs, error } = await client
    .from('point_transactions')
    .select('*')
    .in('type', ['earn', 'bonus'])
    .eq('expired', false)
    .eq('warning_sent', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', warningDateStr)
    .gt('expires_at', new Date().toISOString());

  if (error || !warningTxs || warningTxs.length === 0) {
    return { warningCount: 0 };
  }

  // Group by customer_id to send one notification per customer
  const customerWarnings = new Map<string, { totalPoints: number; earliestExpiry: string }>();

  for (const tx of warningTxs) {
    const existing = customerWarnings.get(tx.customer_id);
    if (existing) {
      existing.totalPoints += tx.points;
      if (tx.expires_at! < existing.earliestExpiry) {
        existing.earliestExpiry = tx.expires_at!;
      }
    } else {
      customerWarnings.set(tx.customer_id, {
        totalPoints: tx.points,
        earliestExpiry: tx.expires_at!,
      });
    }

    // Mark warning as sent
    await client
      .from('point_transactions')
      .update({ warning_sent: true })
      .eq('id', tx.id);
  }

  let warningCount = 0;

  for (const [customerId, info] of customerWarnings) {
    // Look up profile_id from customers table
    const { data: customer } = await client
      .from('customers')
      .select('profile_id')
      .eq('id', customerId)
      .single();

    if (!customer?.profile_id) continue;

    const expiryDate = new Date(info.earliestExpiry);
    const thaiDate = expiryDate.toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    await client.from('notifications').insert({
      user_id: customer.profile_id,
      type: 'points_expiry_warning',
      title: 'แต้มสะสมใกล้หมดอายุ',
      message: `แต้มสะสม ${info.totalPoints.toLocaleString()} แต้มจะหมดอายุในวันที่ ${thaiDate}`,
    });

    warningCount++;
  }

  return { warningCount };
}

// ==========================================
// Admin Adjust
// ==========================================

export async function adminAdjustPoints(
  client: SupabaseClient<Database>,
  customerId: string,
  points: number,
  reason: string
): Promise<void> {
  const cp = await getOrCreateCustomerPoints(client, customerId);
  const newTotal = Math.max(0, cp.total_points + points);

  await client.from('point_transactions').insert({
    customer_id: customerId,
    type: 'admin_adjust',
    points: points,
    balance_after: newTotal,
    description: reason,
  });

  const updates: Record<string, number> = { total_points: newTotal };
  if (points > 0) {
    updates.lifetime_earned = cp.lifetime_earned + points;
  }

  await client
    .from('customer_points')
    .update(updates)
    .eq('customer_id', customerId);

  // Send notification to customer
  const { data: customer } = await client
    .from('customers')
    .select('profile_id')
    .eq('id', customerId)
    .single();

  if (customer?.profile_id) {
    const action = points > 0 ? 'ได้รับ' : 'ถูกหัก';
    const absPoints = Math.abs(points);
    await client.from('notifications').insert({
      user_id: customer.profile_id,
      type: 'points_adjust',
      title: points > 0 ? 'ได้รับแต้มพิเศษ' : 'หักแต้มสะสม',
      message: `${action}แต้มสะสม ${absPoints} แต้ม เหตุผล: ${reason}`,
    });
  }
}

// ==========================================
// Nearest Expiry
// ==========================================

export async function getNearestExpiry(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<{ points: number; expires_at: string } | null> {
  const { data } = await client
    .from('point_transactions')
    .select('points, expires_at')
    .eq('customer_id', customerId)
    .in('type', ['earn', 'bonus'])
    .eq('expired', false)
    .not('expires_at', 'is', null)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)
    .single();

  if (!data) return null;
  return { points: data.points, expires_at: data.expires_at! };
}
