import { describe, it, expect, vi } from 'vitest'
import {
  getReviewByBookingId,
  createReview,
  getServiceReviewStats,
  getServiceReviews,
  getTopReviews,
  getAllServiceReviewStats,
  reviewService,
} from '../reviewService'

function createChainableBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return builder
}

function createRpcClient(resolveValue: any) {
  return {
    rpc: vi.fn().mockImplementation(() => {
      const p: any = {}
      p.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
      return p
    }),
    from: vi.fn(),
  } as any
}

describe('getReviewByBookingId', () => {
  it('should return review for a booking', async () => {
    const mockReview = { id: 'r1', booking_id: 'b1', rating: 5, review: 'Great!' }
    const builder = createChainableBuilder({ data: mockReview, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getReviewByBookingId(client, 'b1')
    expect(result).toEqual(mockReview)
    expect(client.from).toHaveBeenCalledWith('reviews')
    expect(builder.eq).toHaveBeenCalledWith('booking_id', 'b1')
    expect(builder.maybeSingle).toHaveBeenCalled()
  })

  it('should return null when no review exists', async () => {
    const builder = createChainableBuilder({ data: null, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getReviewByBookingId(client, 'b-unknown')
    expect(result).toBeNull()
  })

  it('should throw on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'DB error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    await expect(getReviewByBookingId(client, 'b1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('createReview', () => {
  it('should create a new review', async () => {
    const mockReview = { id: 'r-new', booking_id: 'b1', rating: 4, review: 'Good service' }
    const builder = createChainableBuilder({ data: mockReview, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const input = { booking_id: 'b1', rating: 4, review: 'Good service', customer_id: 'c1' }
    const result = await createReview(client, input as any)

    expect(result).toEqual(mockReview)
    expect(client.from).toHaveBeenCalledWith('reviews')
    expect(builder.insert).toHaveBeenCalledWith(input)
    expect(builder.select).toHaveBeenCalled()
    expect(builder.single).toHaveBeenCalled()
  })

  it('should throw on insert error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'Constraint violation' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    await expect(createReview(client, {} as any)).rejects.toEqual({ message: 'Constraint violation' })
  })
})

describe('getServiceReviewStats', () => {
  it('should return stats for all services', async () => {
    const mockStats = [
      { service_id: 's1', avg_rating: 4.5, review_count: 10, avg_cleanliness: 4.0, avg_professionalism: 4.5, avg_skill: 4.5 },
      { service_id: 's2', avg_rating: 3.8, review_count: 5, avg_cleanliness: 3.5, avg_professionalism: 4.0, avg_skill: 4.0 },
    ]
    const client = createRpcClient({ data: mockStats, error: null })

    const result = await getServiceReviewStats(client)
    expect(result).toEqual(mockStats)
    expect(client.rpc).toHaveBeenCalledWith('get_service_review_stats', { p_service_id: null })
  })

  it('should return stats for a specific service', async () => {
    const mockStats = [
      { service_id: 's1', avg_rating: 4.5, review_count: 10, avg_cleanliness: 4.0, avg_professionalism: 4.5, avg_skill: 4.5 },
    ]
    const client = createRpcClient({ data: mockStats, error: null })

    const result = await getServiceReviewStats(client, 's1')
    expect(result).toEqual(mockStats)
    expect(client.rpc).toHaveBeenCalledWith('get_service_review_stats', { p_service_id: 's1' })
  })

  it('should return empty array when no data', async () => {
    const client = createRpcClient({ data: null, error: null })

    const result = await getServiceReviewStats(client)
    expect(result).toEqual([])
  })

  it('should throw on error', async () => {
    const client = createRpcClient({ data: null, error: { message: 'RPC error' } })
    await expect(getServiceReviewStats(client)).rejects.toEqual({ message: 'RPC error' })
  })
})

describe('getServiceReviews', () => {
  it('should return reviews for a service', async () => {
    const mockReviews = [
      { id: 'r1', rating: 5, review: 'Great', customer_display_name: 'John', service_id: 's1' },
    ]
    const client = createRpcClient({ data: mockReviews, error: null })

    const result = await getServiceReviews(client, 's1')
    expect(result).toEqual(mockReviews)
    expect(client.rpc).toHaveBeenCalledWith('get_visible_reviews', {
      p_service_id: 's1',
      p_limit: 5,
      p_min_rating: 1,
    })
  })

  it('should use custom limit', async () => {
    const client = createRpcClient({ data: [], error: null })

    await getServiceReviews(client, 's1', 10)
    expect(client.rpc).toHaveBeenCalledWith('get_visible_reviews', {
      p_service_id: 's1',
      p_limit: 10,
      p_min_rating: 1,
    })
  })

  it('should return empty array when no data', async () => {
    const client = createRpcClient({ data: null, error: null })

    const result = await getServiceReviews(client, 's1')
    expect(result).toEqual([])
  })

  it('should throw on error', async () => {
    const client = createRpcClient({ data: null, error: { message: 'RPC error' } })
    await expect(getServiceReviews(client, 's1')).rejects.toEqual({ message: 'RPC error' })
  })
})

describe('getTopReviews', () => {
  it('should return top rated reviews', async () => {
    const mockReviews = [
      { id: 'r1', rating: 5, review: 'Amazing' },
      { id: 'r2', rating: 4, review: 'Good' },
    ]
    const client = createRpcClient({ data: mockReviews, error: null })

    const result = await getTopReviews(client)
    expect(result).toEqual(mockReviews)
    expect(client.rpc).toHaveBeenCalledWith('get_visible_reviews', {
      p_service_id: null,
      p_limit: 6,
      p_min_rating: 4,
    })
  })

  it('should use custom limit', async () => {
    const client = createRpcClient({ data: [], error: null })

    await getTopReviews(client, 3)
    expect(client.rpc).toHaveBeenCalledWith('get_visible_reviews', {
      p_service_id: null,
      p_limit: 3,
      p_min_rating: 4,
    })
  })

  it('should return empty array when no data', async () => {
    const client = createRpcClient({ data: null, error: null })

    const result = await getTopReviews(client)
    expect(result).toEqual([])
  })

  it('should throw on error', async () => {
    const client = createRpcClient({ data: null, error: { message: 'RPC error' } })
    await expect(getTopReviews(client)).rejects.toEqual({ message: 'RPC error' })
  })
})

describe('getAllServiceReviewStats', () => {
  it('should return stats as a map keyed by service_id', async () => {
    const mockStats = [
      { service_id: 's1', avg_rating: 4.5, review_count: 10, avg_cleanliness: null, avg_professionalism: null, avg_skill: null },
      { service_id: 's2', avg_rating: 3.8, review_count: 5, avg_cleanliness: null, avg_professionalism: null, avg_skill: null },
    ]
    const client = createRpcClient({ data: mockStats, error: null })

    const result = await getAllServiceReviewStats(client)
    expect(result).toEqual({
      s1: mockStats[0],
      s2: mockStats[1],
    })
  })

  it('should skip entries with null service_id', async () => {
    const mockStats = [
      { service_id: 's1', avg_rating: 4.5, review_count: 10 },
      { service_id: null, avg_rating: 0, review_count: 0 },
    ]
    const client = createRpcClient({ data: mockStats, error: null })

    const result = await getAllServiceReviewStats(client)
    expect(Object.keys(result)).toHaveLength(1)
    expect(result['s1']).toBeDefined()
  })

  it('should return empty object when no stats', async () => {
    const client = createRpcClient({ data: null, error: null })

    const result = await getAllServiceReviewStats(client)
    expect(result).toEqual({})
  })

  it('should throw on error', async () => {
    const client = createRpcClient({ data: null, error: { message: 'RPC error' } })
    await expect(getAllServiceReviewStats(client)).rejects.toEqual({ message: 'RPC error' })
  })
})

describe('reviewService object', () => {
  it('should export all service methods', () => {
    expect(reviewService.getReviewByBookingId).toBe(getReviewByBookingId)
    expect(reviewService.createReview).toBe(createReview)
    expect(reviewService.getServiceReviewStats).toBe(getServiceReviewStats)
    expect(reviewService.getServiceReviews).toBe(getServiceReviews)
    expect(reviewService.getTopReviews).toBe(getTopReviews)
    expect(reviewService.getAllServiceReviewStats).toBe(getAllServiceReviewStats)
  })
})
