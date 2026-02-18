import { describe, it, expect, vi } from 'vitest'
import { getCustomerStats } from '../customerService'

function createMockClient(bookings: any[] | null, error: any = null) {
  const builder: any = {}
  builder.select = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockResolvedValue({ data: bookings, error })

  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  } as any
}

describe('getCustomerStats', () => {
  it('returns zero stats for empty bookings', async () => {
    const client = createMockClient([])
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats).toEqual({
      total_bookings: 0,
      total_spent: 0,
      completed_bookings: 0,
    })
  })

  it('counts total_bookings correctly', async () => {
    const bookings = [
      { status: 'pending', final_price: 500 },
      { status: 'confirmed', final_price: 800 },
      { status: 'completed', final_price: 1000 },
    ]
    const client = createMockClient(bookings)
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats.total_bookings).toBe(3)
  })

  it('counts only completed bookings', async () => {
    const bookings = [
      { status: 'pending', final_price: 500 },
      { status: 'completed', final_price: 800 },
      { status: 'completed', final_price: 1000 },
      { status: 'cancelled', final_price: 200 },
    ]
    const client = createMockClient(bookings)
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats.completed_bookings).toBe(2)
  })

  it('sums final_price only from completed bookings', async () => {
    const bookings = [
      { status: 'pending', final_price: 500 },
      { status: 'completed', final_price: 800 },
      { status: 'completed', final_price: 1200 },
    ]
    const client = createMockClient(bookings)
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats.total_spent).toBe(2000)
  })

  it('handles null final_price', async () => {
    const bookings = [
      { status: 'completed', final_price: null },
      { status: 'completed', final_price: 500 },
    ]
    const client = createMockClient(bookings)
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats.total_spent).toBe(500)
    expect(stats.completed_bookings).toBe(2)
  })

  it('handles null bookings data', async () => {
    const client = createMockClient(null)
    const stats = await getCustomerStats(client, 'cust-1')
    expect(stats.total_bookings).toBe(0)
    expect(stats.total_spent).toBe(0)
    expect(stats.completed_bookings).toBe(0)
  })

  it('throws when Supabase returns error', async () => {
    const client = createMockClient(null, { message: 'DB error' })
    await expect(getCustomerStats(client, 'cust-1')).rejects.toEqual({ message: 'DB error' })
  })

  it('queries correct table and customer_id', async () => {
    const client = createMockClient([])
    await getCustomerStats(client, 'cust-123')
    expect(client.from).toHaveBeenCalledWith('bookings')
    expect(client._builder.select).toHaveBeenCalledWith('status, final_price')
    expect(client._builder.eq).toHaveBeenCalledWith('customer_id', 'cust-123')
  })
})
