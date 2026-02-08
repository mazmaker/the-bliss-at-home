import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface TransactionWithBooking extends Transaction {
  booking?: Database['public']['Tables']['bookings']['Row'];
}

interface TransactionSummary {
  total_spent: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  pending_transactions: number;
  success_rate: number;
}

/**
 * Get customer transactions
 */
export async function getCustomerTransactions(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<TransactionWithBooking[]> {
  const { data, error } = await client
    .from('transactions')
    .select(`
      *,
      booking:bookings(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as TransactionWithBooking[];
}

/**
 * Get transactions by status
 */
export async function getTransactionsByStatus(
  client: SupabaseClient<Database>,
  customerId: string,
  status: string
): Promise<TransactionWithBooking[]> {
  const { data, error } = await client
    .from('transactions')
    .select(`
      *,
      booking:bookings(*)
    `)
    .eq('customer_id', customerId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as TransactionWithBooking[];
}

/**
 * Get transaction summary statistics
 */
export async function getTransactionSummary(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<TransactionSummary> {
  const { data: transactions, error } = await client
    .from('transactions')
    .select('status, amount')
    .eq('customer_id', customerId);

  if (error) throw error;

  const summary: TransactionSummary = {
    total_spent: 0,
    total_transactions: transactions?.length || 0,
    successful_transactions: 0,
    failed_transactions: 0,
    pending_transactions: 0,
    success_rate: 0,
  };

  transactions?.forEach((transaction) => {
    if (transaction.status === 'successful') {
      summary.successful_transactions++;
      summary.total_spent += Number(transaction.amount || 0);
    } else if (transaction.status === 'failed') {
      summary.failed_transactions++;
    } else if (transaction.status === 'pending') {
      summary.pending_transactions++;
    }
  });

  if (summary.total_transactions > 0) {
    summary.success_rate =
      (summary.successful_transactions / summary.total_transactions) * 100;
  }

  return summary;
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  client: SupabaseClient<Database>,
  transactionId: string
): Promise<TransactionWithBooking | null> {
  const { data, error } = await client
    .from('transactions')
    .select(`
      *,
      booking:bookings(*)
    `)
    .eq('id', transactionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as TransactionWithBooking;
}

/**
 * Get transaction by transaction number
 */
export async function getTransactionByNumber(
  client: SupabaseClient<Database>,
  transactionNumber: string
): Promise<TransactionWithBooking | null> {
  const { data, error } = await client
    .from('transactions')
    .select(`
      *,
      booking:bookings(*)
    `)
    .eq('transaction_number', transactionNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as TransactionWithBooking;
}

export const transactionService = {
  getCustomerTransactions,
  getTransactionsByStatus,
  getTransactionSummary,
  getTransactionById,
  getTransactionByNumber,
};
