import { describe, it, expect, vi } from 'vitest'
import {
  getCustomerBookings,
  getBookingsByStatus,
  getBookingById,
  getBookingByNumber,
  createBooking,
  cancelBooking,
  getUpcomingBookings,
  createBookingWithServices,
} from '../bookingService'

function createChainableBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return builder
}

function createMultiCallClient(responses: any[], authUser: any = { id: 'u1' }) {
  let callIndex = 0
  return {
    from: vi.fn().mockImplementation(() => {
      const builder: any = {}
      const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      const response = responses[callIndex] || { data: null, error: null }
      callIndex++
      builder.then = (resolve: any) => Promise.resolve(response).then(resolve)
      return builder
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authUser } }),
    },
  } as any
}

describe('getCustomerBookings', () => {
  it('returns bookings for customer', async () => {
    const mockBookings = [
      { id: 'b1', customer_id: 'c1', status: 'confirmed' },
      { id: 'b2', customer_id: 'c1', status: 'completed' },
    ]
    // Source calls from('bookings') then from('jobs'), use multi-call client
    const client = createMultiCallClient([
      { data: mockBookings, error: null },
      { data: [], error: null }, // jobs query returns empty
    ])

    const result = await getCustomerBookings(client, 'c1')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'b1', customer_id: 'c1', status: 'confirmed', jobs: [] })
    expect(result[1]).toMatchObject({ id: 'b2', customer_id: 'c1', status: 'completed', jobs: [] })
    expect(client.from).toHaveBeenCalledWith('bookings')
  })

  it('throws on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'DB error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(getCustomerBookings(client, 'c1')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('getBookingsByStatus', () => {
  it('returns bookings filtered by status', async () => {
    const mockBookings = [{ id: 'b1', status: 'confirmed' }]
    const builder = createChainableBuilder({ data: mockBookings, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getBookingsByStatus(client, 'c1', 'confirmed' as any)
    expect(result).toEqual(mockBookings)
  })

  it('throws on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(getBookingsByStatus(client, 'c1', 'pending' as any)).rejects.toBeDefined()
  })
})

describe('getBookingById', () => {
  it('returns booking with addons', async () => {
    const mockBooking = { id: 'b1', booking_number: 'BK-001' }
    const mockAddons = [{ id: 'a1', quantity: 2 }]
    const client: any = {
      from: vi.fn().mockImplementation((table: string) => {
        const builder: any = {}
        const methods = ['select', 'eq', 'single']
        methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
        if (table === 'bookings') {
          builder.then = (resolve: any) => Promise.resolve({ data: mockBooking, error: null }).then(resolve)
        } else {
          builder.then = (resolve: any) => Promise.resolve({ data: mockAddons, error: null }).then(resolve)
        }
        return builder
      }),
    }

    const result = await getBookingById(client, 'b1')
    expect(result).toBeDefined()
    expect(result!.id).toBe('b1')
    expect(result!.addons).toEqual(mockAddons)
  })

  it('returns null for PGRST116', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    const result = await getBookingById(client, 'bad-id')
    expect(result).toBeNull()
  })

  it('throws on other errors', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: '500', message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(getBookingById(client, 'b1')).rejects.toBeDefined()
  })

  it('throws on addon fetch error', async () => {
    const client = createMultiCallClient([
      { data: { id: 'b1' }, error: null },
      { data: null, error: { message: 'addon error' } },
    ])
    await expect(getBookingById(client, 'b1')).rejects.toBeDefined()
  })
})

describe('getBookingByNumber', () => {
  it('returns booking with addons', async () => {
    const mockBooking = { id: 'b1', booking_number: 'BK-001' }
    const mockAddons = [{ id: 'a1' }]
    const client: any = {
      from: vi.fn().mockImplementation((table: string) => {
        const builder: any = {}
        const methods = ['select', 'eq', 'single']
        methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
        if (table === 'bookings') {
          builder.then = (resolve: any) => Promise.resolve({ data: mockBooking, error: null }).then(resolve)
        } else {
          builder.then = (resolve: any) => Promise.resolve({ data: mockAddons, error: null }).then(resolve)
        }
        return builder
      }),
    }

    const result = await getBookingByNumber(client, 'BK-001')
    expect(result).toBeDefined()
    expect(result!.addons).toEqual(mockAddons)
  })

  it('returns null for PGRST116', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    const result = await getBookingByNumber(client, 'BK-BAD')
    expect(result).toBeNull()
  })

  it('throws on other errors', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: '500', message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(getBookingByNumber(client, 'BK')).rejects.toBeDefined()
  })

  it('throws on addon fetch error', async () => {
    const client = createMultiCallClient([
      { data: { id: 'b1', booking_number: 'BK-001' }, error: null },
      { data: null, error: { message: 'addon error' } },
    ])
    await expect(getBookingByNumber(client, 'BK-001')).rejects.toBeDefined()
  })
})

describe('createBooking', () => {
  it('creates booking without addons', async () => {
    const mockBooking = { id: 'b-new', status: 'pending' }
    const builder = createChainableBuilder({ data: mockBooking, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await createBooking(client, { customer_id: 'c1' } as any)
    expect(result).toEqual(mockBooking)
    expect(client.from).toHaveBeenCalledWith('bookings')
  })

  it('creates booking with addons', async () => {
    const client: any = {
      from: vi.fn().mockImplementation((table: string) => {
        const builder: any = {}
        const methods = ['select', 'eq', 'single', 'insert']
        methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
        if (table === 'bookings') {
          builder.then = (resolve: any) => Promise.resolve({ data: { id: 'b-new' }, error: null }).then(resolve)
        } else {
          builder.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
        }
        return builder
      }),
    }

    const addons = [{ service_addon_id: 'sa1', quantity: 1, price_per_unit: 100, total_price: 100 }]
    const result = await createBooking(client, { customer_id: 'c1' } as any, addons as any)
    expect(result.id).toBe('b-new')
    expect(client.from).toHaveBeenCalledWith('booking_addons')
  })

  it('throws on booking insert error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'insert error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(createBooking(client, {} as any)).rejects.toBeDefined()
  })

  it('throws on addon insert error', async () => {
    const client = createMultiCallClient([
      { data: { id: 'b-new' }, error: null },
      { data: null, error: { message: 'addon error' } },
    ])
    await expect(createBooking(client, {} as any, [{ quantity: 1 }] as any)).rejects.toBeDefined()
  })
})

describe('cancelBooking', () => {
  it('cancels booking', async () => {
    const mockCancelled = { id: 'b1', status: 'cancelled' }
    const builder = createChainableBuilder({ data: mockCancelled, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await cancelBooking(client, 'b1')
    expect(result.status).toBe('cancelled')
  })

  it('throws on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(cancelBooking(client, 'b1')).rejects.toBeDefined()
  })
})

describe('getUpcomingBookings', () => {
  it('returns upcoming bookings', async () => {
    const mockBookings = [{ id: 'b1', status: 'confirmed', booking_date: '2030-01-01' }]
    const builder = createChainableBuilder({ data: mockBookings, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getUpcomingBookings(client, 'c1')
    expect(result).toEqual(mockBookings)
  })

  it('throws on error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any
    await expect(getUpcomingBookings(client, 'c1')).rejects.toBeDefined()
  })
})

describe('createBookingWithServices', () => {
  const baseBookingData = {
    customer_id: 'c1',
    booking_date: '2026-02-01',
    booking_time: '10:00',
    service_format: 'single' as const,
    recipient_count: 1,
    final_price: 2000,
  }

  const baseServices = [
    { service_id: 's1', duration: 60, price: 2000, recipient_index: 0 },
  ]

  it('creates booking with single service', async () => {
    const client = createMultiCallClient([
      { data: { id: 'new-booking' }, error: null },
      { data: null, error: null },
    ])

    const result = await createBookingWithServices(client, baseBookingData, baseServices)
    expect(result).toBe('new-booking')
    expect(client.from).toHaveBeenCalledTimes(2)
  })

  it('creates booking with services and addons', async () => {
    const client = createMultiCallClient([
      { data: { id: 'new-booking' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ])

    const addons = [{ service_addon_id: 'sa1', quantity: 1, price_per_unit: 100, total_price: 100 }] as any
    const result = await createBookingWithServices(client, baseBookingData, baseServices, addons)
    expect(result).toBe('new-booking')
    expect(client.from).toHaveBeenCalledTimes(3)
  })

  it('creates booking with promotion usage', async () => {
    const client = createMultiCallClient([
      { data: { id: 'promo-booking' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ])

    const bookingData = {
      ...baseBookingData,
      promotion_id: 'promo-1',
      discount_amount: 200,
    }

    const result = await createBookingWithServices(client, bookingData, baseServices)
    expect(result).toBe('promo-booking')
  })

  it('handles couple services', async () => {
    const client = createMultiCallClient([
      { data: { id: 'couple-booking' }, error: null },
      { data: null, error: null },
    ])

    const bookingData = {
      ...baseBookingData,
      service_format: 'simultaneous' as const,
      recipient_count: 2,
      final_price: 4000,
    }

    const services = [
      { service_id: 's1', duration: 60, price: 2000, recipient_index: 0, recipient_name: 'A' },
      { service_id: 's2', duration: 60, price: 2000, recipient_index: 1, recipient_name: 'B' },
    ]

    const result = await createBookingWithServices(client, bookingData, services)
    expect(result).toBe('couple-booking')
  })

  it('uses first service as primary when no index 0', async () => {
    const client = createMultiCallClient([
      { data: { id: 'fallback' }, error: null },
      { data: null, error: null },
    ])

    const services = [
      { service_id: 's1', duration: 60, price: 2000, recipient_index: 1 },
    ]

    const result = await createBookingWithServices(client, baseBookingData, services)
    expect(result).toBe('fallback')
  })

  it('throws on booking insert error', async () => {
    const builder = createChainableBuilder({ data: null, error: { message: 'insert error' } })
    const client = { from: vi.fn().mockReturnValue(builder), auth: { getUser: vi.fn() } } as any
    await expect(createBookingWithServices(client, baseBookingData, baseServices)).rejects.toBeDefined()
  })

  it('throws on booking_services insert error', async () => {
    const client = createMultiCallClient([
      { data: { id: 'b1' }, error: null },
      { data: null, error: { message: 'services error' } },
    ])
    await expect(createBookingWithServices(client, baseBookingData, baseServices)).rejects.toBeDefined()
  })

  it('throws on addon insert error', async () => {
    const client = createMultiCallClient([
      { data: { id: 'b1' }, error: null },
      { data: null, error: null },
      { data: null, error: { message: 'addon error' } },
    ])

    const addons = [{ service_addon_id: 'sa1', quantity: 1, price_per_unit: 100, total_price: 100 }] as any
    await expect(createBookingWithServices(client, baseBookingData, baseServices, addons)).rejects.toBeDefined()
  })
})
