import { useSupabaseQuery } from './useSupabaseQuery';
import { transactionService } from '../services';

/**
 * Get customer transactions
 */
export function useCustomerTransactions(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['transactions', 'customer', customerId],
    queryFn: (client) => transactionService.getCustomerTransactions(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get transactions by status
 */
export function useTransactionsByStatus(customerId: string | undefined, status: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['transactions', 'customer', customerId, 'status', status],
    queryFn: (client) => transactionService.getTransactionsByStatus(client, customerId!, status!),
    enabled: !!customerId && !!status,
  });
}

/**
 * Get transaction summary statistics
 */
export function useTransactionSummary(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['transactions', 'summary', customerId],
    queryFn: (client) => transactionService.getTransactionSummary(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get transaction by ID
 */
export function useTransactionById(transactionId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['transactions', 'detail', transactionId],
    queryFn: (client) => transactionService.getTransactionById(client, transactionId!),
    enabled: !!transactionId,
  });
}

/**
 * Get transaction by transaction number
 */
export function useTransactionByNumber(transactionNumber: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['transactions', 'number', transactionNumber],
    queryFn: (client) => transactionService.getTransactionByNumber(client, transactionNumber!),
    enabled: !!transactionNumber,
  });
}
