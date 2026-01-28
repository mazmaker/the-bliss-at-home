/**
 * Supabase Query Hooks
 * Wraps TanStack Query for Supabase operations
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { getBrowserClient } from '../client'

/**
 * Generic Supabase query hook
 * TanStack Query v5 style with object-based options
 */
export function useSupabaseQuery<T = unknown>(
  options: {
    queryKey: unknown[]
    queryFn: (client: SupabaseClient<Database>) => Promise<T>
  } & Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...options,
    queryKey: options.queryKey,
    queryFn: () => options.queryFn(getBrowserClient()),
    staleTime: options.staleTime ?? 1000 * 60, // 1 minute
    gcTime: options.gcTime ?? 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Supabase mutation hook
 * TanStack Query v5 style with object-based options
 */
export function useSupabaseMutation<TData = unknown, TVariables = unknown>(
  options: {
    mutationFn: (client: SupabaseClient<Database>, variables: TVariables) => Promise<TData>
    invalidateKeys?: ((result: TData) => unknown[][]) | unknown[][]
  } & Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn' | 'onSuccess'>
) {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    mutationFn: (variables: TVariables) => options.mutationFn(getBrowserClient(), variables),
    onSuccess: (data, variables, context) => {
      // Invalidate queries if keys are provided
      if (options.invalidateKeys) {
        const keys = typeof options.invalidateKeys === 'function'
          ? options.invalidateKeys(data)
          : options.invalidateKeys

        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key })
        })
      }

      // Call user's onSuccess if provided
      if (options.onSuccess) {
        options.onSuccess(data, variables, context)
      }
    },
  })
}
