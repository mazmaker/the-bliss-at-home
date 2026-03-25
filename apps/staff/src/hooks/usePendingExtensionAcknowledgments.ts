/**
 * Hook for managing pending extension acknowledgments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useAuth } from '@bliss/supabase/auth'

export interface PendingExtension {
  acknowledgmentId: string
  bookingServiceId: string
  jobId: string
  serviceName: string
  customerName: string
  duration: number
  price: number
  extendedAt: string
  bookingNumber: string
}

export function usePendingExtensionAcknowledgments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch pending acknowledgments
  const {
    data: pendingExtensions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['pending-extension-acknowledgments', user?.id],
    queryFn: async (): Promise<PendingExtension[]> => {
      if (!user?.id) return []

      console.log('🔍 Fetching pending extensions for user:', user.id)

      const { data, error } = await supabase.rpc(
        'get_pending_extension_acknowledgments',
        { staff_profile_id: user.id }
      )

      if (error) {
        console.error('❌ Error fetching pending extensions:', error)
        throw error
      }

      console.log('✅ Pending extensions fetched:', data?.length || 0)

      return (data || []).map((item: any) => ({
        acknowledgmentId: item.acknowledgment_id,
        bookingServiceId: item.booking_service_id,
        jobId: item.job_id,
        serviceName: item.service_name,
        customerName: item.customer_name,
        duration: item.duration,
        price: item.price,
        extendedAt: item.extended_at,
        bookingNumber: item.booking_number
      }))
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Acknowledge single extension
  const acknowledgeMutation = useMutation({
    mutationFn: async (acknowledgmentId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      console.log('✅ Acknowledging extension:', acknowledgmentId)

      const { error } = await supabase
        .from('extension_acknowledgments')
        .update({
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', acknowledgmentId)
        .eq('staff_profile_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      // Refetch pending extensions
      queryClient.invalidateQueries({
        queryKey: ['pending-extension-acknowledgments']
      })
      // Refetch job details to update extension info
      queryClient.invalidateQueries({
        queryKey: ['job']
      })
      queryClient.invalidateQueries({
        queryKey: ['booking-services']
      })
    },
    onError: (error) => {
      console.error('❌ Error acknowledging extension:', error)
    }
  })

  // Acknowledge all extensions
  const acknowledgeAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      if (pendingExtensions.length === 0) return

      console.log('✅ Acknowledging all extensions:', pendingExtensions.length)

      const acknowledgmentIds = pendingExtensions.map(ext => ext.acknowledgmentId)

      const { error } = await supabase
        .from('extension_acknowledgments')
        .update({
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', acknowledgmentIds)
        .eq('staff_profile_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pending-extension-acknowledgments']
      })
      queryClient.invalidateQueries({
        queryKey: ['job']
      })
      queryClient.invalidateQueries({
        queryKey: ['booking-services']
      })
    },
    onError: (error) => {
      console.error('❌ Error acknowledging all extensions:', error)
    }
  })

  return {
    pendingExtensions,
    isLoading,
    error,
    refetch,
    acknowledgeExtension: acknowledgeMutation.mutateAsync,
    acknowledgeAll: acknowledgeAllMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending || acknowledgeAllMutation.isPending
  }
}