import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseQuery = vi.fn((options: any) => ({
  data: undefined,
  isLoading: true,
  error: null,
  _options: options,
}))

const mockInvalidateQueries = vi.fn()
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: mockInvalidateQueries,
}))

const mockUseMutation = vi.fn((options: any) => {
  // Store options for testing onSuccess callback
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    _options: options,
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => mockUseQueryClient(),
}))

const mockGetBrowserClient = vi.fn(() => ({ id: 'mock-client' }))

vi.mock('../../client', () => ({
  getBrowserClient: () => mockGetBrowserClient(),
}))

vi.mock('../../types/database.types', () => ({}))

import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useSupabaseQuery
  // ============================================
  describe('useSupabaseQuery', () => {
    it('should be a function', () => {
      expect(typeof useSupabaseQuery).toBe('function')
    })

    it('should call useQuery with the provided queryKey', () => {
      const queryFn = vi.fn()
      useSupabaseQuery({
        queryKey: ['test', 'key'],
        queryFn,
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['test', 'key'],
        })
      )
    })

    it('should set default staleTime to 1 minute (60000ms)', () => {
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn: vi.fn(),
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 60000,
        })
      )
    })

    it('should set default gcTime to 5 minutes (300000ms)', () => {
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn: vi.fn(),
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gcTime: 300000,
        })
      )
    })

    it('should allow overriding staleTime', () => {
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn: vi.fn(),
        staleTime: 120000,
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 120000,
        })
      )
    })

    it('should allow overriding gcTime', () => {
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn: vi.fn(),
        gcTime: 600000,
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gcTime: 600000,
        })
      )
    })

    it('should wrap queryFn to use getBrowserClient', () => {
      const queryFn = vi.fn()
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn,
      })
      // Get the wrapped queryFn passed to useQuery
      const wrappedQueryFn = mockUseQuery.mock.calls[0][0].queryFn
      wrappedQueryFn()
      expect(mockGetBrowserClient).toHaveBeenCalled()
      expect(queryFn).toHaveBeenCalledWith({ id: 'mock-client' })
    })

    it('should pass through enabled option', () => {
      useSupabaseQuery({
        queryKey: ['test'],
        queryFn: vi.fn(),
        enabled: false,
      })
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })
  })

  // ============================================
  // useSupabaseMutation
  // ============================================
  describe('useSupabaseMutation', () => {
    it('should be a function', () => {
      expect(typeof useSupabaseMutation).toBe('function')
    })

    it('should call useMutation', () => {
      useSupabaseMutation({
        mutationFn: vi.fn(),
      })
      expect(mockUseMutation).toHaveBeenCalled()
    })

    it('should wrap mutationFn to use getBrowserClient', () => {
      const mutationFn = vi.fn()
      useSupabaseMutation({ mutationFn })
      const wrappedMutationFn = mockUseMutation.mock.calls[0][0].mutationFn
      wrappedMutationFn('test-variables')
      expect(mockGetBrowserClient).toHaveBeenCalled()
      expect(mutationFn).toHaveBeenCalledWith({ id: 'mock-client' }, 'test-variables')
    })

    it('should invalidate queries with static keys on success', () => {
      useSupabaseMutation({
        mutationFn: vi.fn(),
        invalidateKeys: [['key1'], ['key2']],
      })
      const options = mockUseMutation.mock.calls[0][0]
      // Simulate onSuccess
      options.onSuccess('data', 'variables', 'context')
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['key1'] })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['key2'] })
    })

    it('should invalidate queries with function-based keys on success', () => {
      const invalidateKeysFn = vi.fn((data: any) => [['result', data.id]])
      useSupabaseMutation({
        mutationFn: vi.fn(),
        invalidateKeys: invalidateKeysFn,
      })
      const options = mockUseMutation.mock.calls[0][0]
      options.onSuccess({ id: '123' }, 'variables', 'context')
      expect(invalidateKeysFn).toHaveBeenCalledWith({ id: '123' })
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['result', '123'] })
    })

    it('should call user onSuccess callback if provided', () => {
      const userOnSuccess = vi.fn()
      useSupabaseMutation({
        mutationFn: vi.fn(),
        onSuccess: userOnSuccess,
      })
      const options = mockUseMutation.mock.calls[0][0]
      options.onSuccess('data', 'variables', 'context')
      expect(userOnSuccess).toHaveBeenCalledWith('data', 'variables', 'context')
    })

    it('should not call invalidateQueries if invalidateKeys is not provided', () => {
      useSupabaseMutation({
        mutationFn: vi.fn(),
      })
      const options = mockUseMutation.mock.calls[0][0]
      options.onSuccess('data', 'variables', 'context')
      expect(mockInvalidateQueries).not.toHaveBeenCalled()
    })

    it('should call both invalidateKeys and user onSuccess', () => {
      const userOnSuccess = vi.fn()
      useSupabaseMutation({
        mutationFn: vi.fn(),
        invalidateKeys: [['test']],
        onSuccess: userOnSuccess,
      })
      const options = mockUseMutation.mock.calls[0][0]
      options.onSuccess('data', 'variables', 'context')
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['test'] })
      expect(userOnSuccess).toHaveBeenCalledWith('data', 'variables', 'context')
    })
  })
})
