import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validatePromoCode } from '../promotionService'

function makePromo(overrides: Record<string, any> = {}) {
  const now = Date.now()
  return {
    id: 'promo-1',
    code: 'TESTCODE',
    status: 'active',
    start_date: new Date(now - 86400000).toISOString(),
    end_date: new Date(now + 86400000).toISOString(),
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: null,
    max_discount: null,
    usage_limit: null,
    usage_count: 0,
    usage_limit_per_user: null,
    applies_to: null,
    target_services: null,
    target_categories: null,
    name_th: 'Test Promo',
    name_en: 'Test Promo',
    description_th: null,
    description_en: null,
    image_url: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

function createChainableBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'lte', 'gte', 'order', 'in', 'is', 'limit']
  methods.forEach(m => {
    builder[m] = vi.fn().mockReturnValue(builder)
  })
  builder.single = vi.fn().mockResolvedValue(resolveValue)
  return builder
}

function createMockClient(options: {
  promoData?: any
  promoError?: any
  usageCount?: number
}) {
  const promoBuilder = createChainableBuilder({
    data: options.promoData ?? null,
    error: options.promoError ?? null,
  })

  const usageResult = { count: options.usageCount ?? 0 }
  const usageBuilder: any = {}
  const usageMethods = ['select', 'eq', 'neq', 'lte', 'gte']
  usageMethods.forEach(m => {
    usageBuilder[m] = vi.fn().mockReturnValue(usageBuilder)
  })
  // Make builder thenable so `await builder.select().eq().eq()` resolves
  usageBuilder.then = (resolve: any) => Promise.resolve(usageResult).then(resolve)

  return {
    from: vi.fn((table: string) => {
      if (table === 'promotions') return promoBuilder
      if (table === 'promotion_usage') return usageBuilder
      return createChainableBuilder()
    }),
  } as any
}

describe('validatePromoCode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns voucherInvalid when code not found', async () => {
    const client = createMockClient({ promoError: { code: 'PGRST116' } })
    const result = await validatePromoCode(client, 'INVALID', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherInvalid')
  })

  it('returns voucherInvalid when promo status is not active', async () => {
    const promo = makePromo({ status: 'expired' })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherInvalid')
  })

  it('returns voucherInvalid when promo is expired (past end_date)', async () => {
    const promo = makePromo({
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-01-31T00:00:00Z',
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherInvalid')
  })

  it('returns voucherInvalid when promo has not started yet', async () => {
    const promo = makePromo({
      start_date: '2026-03-01T00:00:00Z',
      end_date: '2026-03-31T00:00:00Z',
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherInvalid')
  })

  it('returns voucherMinOrder when orderAmount < min_order_amount', async () => {
    const promo = makePromo({ min_order_amount: 2000 })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 500, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherMinOrder')
  })

  it('returns voucherUsed when global usage_limit reached', async () => {
    const promo = makePromo({ usage_limit: 10, usage_count: 10 })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherUsed')
  })

  it('returns voucherUsed when per-user limit reached', async () => {
    const promo = makePromo({ usage_limit_per_user: 1 })
    const client = createMockClient({ promoData: promo, usageCount: 1 })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherUsed')
  })

  it('returns voucherNotApplicable for specific_services with no match', async () => {
    const promo = makePromo({
      applies_to: 'specific_services',
      target_services: ['svc-A', 'svc-B'],
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', ['svc-C'], [])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherNotApplicable')
  })

  it('returns voucherNotApplicable for categories with no match', async () => {
    const promo = makePromo({
      applies_to: 'categories',
      target_categories: ['massage', 'spa'],
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], ['nail'])
    expect(result.valid).toBe(false)
    expect(result.errorKey).toBe('voucherNotApplicable')
  })

  it('calculates percentage discount correctly', async () => {
    const promo = makePromo({ discount_type: 'percentage', discount_value: 20 })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(200)
  })

  it('caps percentage discount at max_discount', async () => {
    const promo = makePromo({
      discount_type: 'percentage',
      discount_value: 50,
      max_discount: 300,
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(300)
  })

  it('calculates fixed_amount discount', async () => {
    const promo = makePromo({ discount_type: 'fixed_amount', discount_value: 150 })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(150)
  })

  it('discount cannot exceed orderAmount', async () => {
    const promo = makePromo({ discount_type: 'fixed_amount', discount_value: 5000 })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], [])
    expect(result.valid).toBe(true)
    expect(result.discountAmount).toBe(1000)
  })

  it('returns valid with promotion object on success', async () => {
    const promo = makePromo()
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'testcode', 1000, 'user-1', [], [])
    expect(result.valid).toBe(true)
    expect(result.promotion).toBeDefined()
    expect(result.promotion!.id).toBe('promo-1')
    expect(result.errorKey).toBeNull()
  })

  it('passes when specific_services match', async () => {
    const promo = makePromo({
      applies_to: 'specific_services',
      target_services: ['svc-A', 'svc-B'],
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', ['svc-B'], [])
    expect(result.valid).toBe(true)
  })

  it('passes when categories match', async () => {
    const promo = makePromo({
      applies_to: 'categories',
      target_categories: ['massage', 'spa'],
    })
    const client = createMockClient({ promoData: promo })
    const result = await validatePromoCode(client, 'TESTCODE', 1000, 'user-1', [], ['massage'])
    expect(result.valid).toBe(true)
  })
})
