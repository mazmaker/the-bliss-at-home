import { describe, it, expect, vi } from 'vitest'
import { getCustomerStats, getCustomerById, updateCustomer, getCurrentCustomer } from '../customerService'

function createMockClient(bookings: any[] | null, error: any = null) {
  const builder: any = {}
  builder.select = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockResolvedValue({ data: bookings, error })

  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  } as any
}

function createChainableClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

function createMultiCallClient(responses: any[]) {
  let callIndex = 0
  return {
    from: vi.fn().mockImplementation(() => {
      const builder: any = {}
      const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      const response = responses[callIndex] || { data: null, error: null }
      callIndex++
      builder.then = (resolve: any) => Promise.resolve(response).then(resolve)
      return builder
    }),
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

describe('getCustomerById', () => {
  it('should return customer by id', async () => {
    const mockCustomer = { id: 'c1', full_name: 'John', phone: '0891234567' }
    const client = createChainableClient({ data: mockCustomer, error: null })

    const result = await getCustomerById(client, 'c1')
    expect(result).toEqual(mockCustomer)
    expect(client.from).toHaveBeenCalledWith('customers')
  })

  it('should return null for PGRST116 (not found)', async () => {
    const client = createChainableClient({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const result = await getCustomerById(client, 'bad-id')
    expect(result).toBeNull()
  })

  it('should throw on other errors', async () => {
    const client = createChainableClient({ data: null, error: { code: '500', message: 'error' } })
    await expect(getCustomerById(client, 'c1')).rejects.toBeDefined()
  })
})

describe('updateCustomer', () => {
  it('should update customer and sync name to profiles', async () => {
    const mockUpdated = { id: 'c1', full_name: 'Updated Name', profile_id: 'p1' }
    const client = createMultiCallClient([
      { data: mockUpdated, error: null }, // update customers
      { data: null, error: null }, // update profiles
    ])

    const result = await updateCustomer(client, 'c1', { full_name: 'Updated Name' } as any)
    expect(result.full_name).toBe('Updated Name')
    // Should call from twice: once for customers, once for profiles
    expect(client.from).toHaveBeenCalledTimes(2)
  })

  it('should update customer without syncing when no name change', async () => {
    const mockUpdated = { id: 'c1', phone: '0899999999', profile_id: 'p1' }
    const client = createMultiCallClient([
      { data: mockUpdated, error: null },
    ])

    const result = await updateCustomer(client, 'c1', { phone: '0899999999' } as any)
    expect(result.phone).toBe('0899999999')
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('should throw on error', async () => {
    const client = createChainableClient({ data: null, error: { message: 'Update failed' } })
    await expect(updateCustomer(client, 'c1', {} as any)).rejects.toBeDefined()
  })
})

describe('getCurrentCustomer', () => {
  it('should return null when no user', async () => {
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as any

    const result = await getCurrentCustomer(client)
    expect(result).toBeNull()
  })

  it('should return existing customer', async () => {
    const mockCustomer = { id: 'c1', full_name: 'Test', profile_id: 'u1' }
    const builder: any = {}
    const methods = ['select', 'eq', 'maybeSingle']
    methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
    builder.then = (resolve: any) => Promise.resolve({ data: mockCustomer, error: null }).then(resolve)

    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } } }) },
      from: vi.fn().mockReturnValue(builder),
    } as any

    const result = await getCurrentCustomer(client)
    expect(result).toEqual(mockCustomer)
  })

  it('should create customer when not found', async () => {
    const newCustomer = { id: 'c-new', full_name: 'test', profile_id: 'u1' }
    let callCount = 0
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com', user_metadata: {} } } }) },
      from: vi.fn().mockImplementation(() => {
        const builder: any = {}
        const methods = ['select', 'eq', 'maybeSingle', 'insert', 'single']
        methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
        callCount++
        if (callCount === 1) {
          // First call: maybeSingle returns null (not found)
          builder.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
        } else {
          // Second call: insert returns new customer
          builder.then = (resolve: any) => Promise.resolve({ data: newCustomer, error: null }).then(resolve)
        }
        return builder
      }),
    } as any

    const result = await getCurrentCustomer(client)
    expect(result).toEqual(newCustomer)
  })
})
