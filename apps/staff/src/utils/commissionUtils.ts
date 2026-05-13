/**
 * Utility functions for staff commission calculations
 * Handles both decimal and percentage formats
 */

/**
 * Normalize commission rate to percentage format
 * Converts decimal (0.3) to percentage (30) if needed
 */
export function normalizeCommissionRate(rate: number): number {
  if (rate < 1) {
    return rate * 100; // Convert 0.3 to 30
  }
  return rate; // Already in percentage format
}

/**
 * Calculate staff earnings from customer price using commission rate
 */
export function calculateStaffEarnings(customerPrice: number, commissionRate: number): number {
  const normalizedRate = normalizeCommissionRate(commissionRate);
  return Math.round(customerPrice * (normalizedRate / 100));
}

/**
 * Calculate total extension earnings from multiple extensions
 */
export function calculateExtensionEarnings(
  extensions: Array<{ price: number }>,
  commissionRate: number
): number {
  return extensions.reduce((sum, ext) => {
    return sum + calculateStaffEarnings(ext.price || 0, commissionRate);
  }, 0);
}