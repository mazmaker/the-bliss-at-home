/**
 * Supabase Query Hooks
 * Wraps TanStack Query for Supabase operations
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Generic Supabase query hook
 */
export function useSupabaseQuery<T = unknown>(
  queryKey: unknown[],
  queryFn: (client: SupabaseClient<Database>) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  // Import getBrowserClient dynamically to avoid SSR issues
  const { getBrowserClient } = require('../client')

  return useQuery({
    queryKey,
    queryFn: () => queryFn(getBrowserClient()),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Supabase mutation hook
 */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query'

export function useSupabaseMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (client: SupabaseClient<Database>, variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
  const { getBrowserClient } = require('../client')

  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(getBrowserClient(), variables),
    ...options,
  })
}
