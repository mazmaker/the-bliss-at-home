import { supabase } from './supabase'

export type SOSSourceType = 'customer' | 'staff' | 'all'
export type SOSStatus = 'pending' | 'acknowledged' | 'resolved' | 'cancelled'
export type SOSPriority = 'low' | 'medium' | 'high' | 'critical'

export interface SOSAlert {
  id: string
  customer_id: string | null
  staff_id: string | null
  booking_id: string | null
  latitude: number | null
  longitude: number | null
  location_accuracy: number | null
  message: string | null
  user_agent: string | null
  status: SOSStatus
  priority: SOSPriority
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  source_type?: SOSSourceType
  source_name?: string
  source_phone?: string
}

// ============================================
// SOS ALERT QUERIES
// ============================================

export async function getAllSOSAlerts(sourceFilter: SOSSourceType = 'all') {
  let query = supabase
    .from('sos_alerts')
    .select(`
      *,
      customers:customer_id (
        full_name,
        phone
      ),
      staff:staff_id (
        name_th,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  // Apply source filter
  if (sourceFilter === 'customer') {
    query = query.not('customer_id', 'is', null)
  } else if (sourceFilter === 'staff') {
    query = query.not('staff_id', 'is', null)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((alert) => {
    // Determine source type and extract relevant info
    let sourceType: SOSSourceType = 'customer'
    let sourceName = ''
    let sourcePhone = ''

    if (alert.customer_id && alert.customers) {
      sourceType = 'customer'
      sourceName = alert.customers.full_name || 'Unknown Customer'
      sourcePhone = alert.customers.phone || ''
    } else if (alert.staff_id && alert.staff) {
      sourceType = 'staff'
      sourceName = alert.staff.name_th || 'Unknown Staff'
      sourcePhone = alert.staff.phone || ''
    }

    return {
      ...alert,
      source_type: sourceType,
      source_name: sourceName,
      source_phone: sourcePhone,
    }
  }) as SOSAlert[]
}

export async function getPendingSOSAlerts(sourceFilter: SOSSourceType = 'all') {
  let query = supabase
    .from('sos_alerts')
    .select(`
      *,
      customers:customer_id (
        full_name,
        phone
      ),
      staff:staff_id (
        name_th,
        phone
      )
    `)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })

  // Apply source filter
  if (sourceFilter === 'customer') {
    query = query.not('customer_id', 'is', null)
  } else if (sourceFilter === 'staff') {
    query = query.not('staff_id', 'is', null)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((alert) => {
    // Determine source type and extract relevant info
    let sourceType: SOSSourceType = 'customer'
    let sourceName = ''
    let sourcePhone = ''

    if (alert.customer_id && alert.customers) {
      sourceType = 'customer'
      sourceName = alert.customers.full_name || 'Unknown Customer'
      sourcePhone = alert.customers.phone || ''
    } else if (alert.staff_id && alert.staff) {
      sourceType = 'staff'
      sourceName = alert.staff.name_th || 'Unknown Staff'
      sourcePhone = alert.staff.phone || ''
    }

    return {
      ...alert,
      source_type: sourceType,
      source_name: sourceName,
      source_phone: sourcePhone,
    }
  }) as SOSAlert[]
}

export async function acknowledgeSOSAlert(id: string, adminId: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: adminId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

export async function resolveSOSAlert(id: string, adminId: string, notes: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

export async function cancelSOSAlert(id: string) {
  const { data, error } = await supabase
    .from('sos_alerts')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SOSAlert
}

// ============================================
// STATISTICS
// ============================================

export async function getSOSStatistics() {
  const { data: alerts, error } = await supabase
    .from('sos_alerts')
    .select('id, status, customer_id, staff_id, created_at')

  if (error) throw error

  const total = alerts?.length || 0
  const pending = alerts?.filter((a) => a.status === 'pending').length || 0
  const acknowledged = alerts?.filter((a) => a.status === 'acknowledged').length || 0
  const resolved = alerts?.filter((a) => a.status === 'resolved').length || 0
  const fromCustomers = alerts?.filter((a) => a.customer_id !== null).length || 0
  const fromStaff = alerts?.filter((a) => a.staff_id !== null).length || 0

  // Get alerts from last 24 hours
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
  const last24Hours = alerts?.filter(
    (a) => new Date(a.created_at) >= twentyFourHoursAgo
  ).length || 0

  return {
    total,
    pending,
    acknowledged,
    resolved,
    from_customers: fromCustomers,
    from_staff: fromStaff,
    last_24_hours: last24Hours,
  }
}
