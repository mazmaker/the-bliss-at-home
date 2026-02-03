import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// SOS Alert types (matching admin sosQueries.ts)
export type SOSStatus = 'pending' | 'acknowledged' | 'resolved' | 'cancelled';
export type SOSPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SOSAlert {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  booking_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  message: string | null;
  user_agent: string | null;
  status: SOSStatus;
  priority: SOSPriority;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSOSAlertInput {
  customer_id?: string;
  staff_id?: string;
  booking_id?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  message?: string;
  user_agent?: string;
  priority?: SOSPriority;
}

/**
 * Create a new SOS alert
 */
export async function createSOSAlert(
  client: SupabaseClient<Database>,
  input: CreateSOSAlertInput
): Promise<SOSAlert> {
  const alertData = {
    customer_id: input.customer_id || null,
    staff_id: input.staff_id || null,
    booking_id: input.booking_id || null,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    location_accuracy: input.location_accuracy || null,
    message: input.message || null,
    user_agent: input.user_agent || null,
    status: 'pending' as SOSStatus,
    priority: input.priority || ('high' as SOSPriority),
  };

  const { data, error } = await client
    .from('sos_alerts')
    .insert(alertData)
    .select()
    .single();

  if (error) throw error;
  return data as SOSAlert;
}

/**
 * Get SOS alerts for a customer
 */
export async function getCustomerSOSAlerts(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<SOSAlert[]> {
  const { data, error } = await client
    .from('sos_alerts')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as SOSAlert[];
}

/**
 * Cancel an SOS alert (customer can cancel their own pending alerts)
 */
export async function cancelSOSAlert(
  client: SupabaseClient<Database>,
  alertId: string
): Promise<SOSAlert> {
  const { data, error } = await client
    .from('sos_alerts')
    .update({ status: 'cancelled' as SOSStatus })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data as SOSAlert;
}

export const sosService = {
  createSOSAlert,
  getCustomerSOSAlerts,
  cancelSOSAlert,
};
