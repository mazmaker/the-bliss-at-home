import { describe, it, expect, vi } from 'vitest'
import {
  getTransactionSummary,
  getCustomerTransactions,
  getTransactionsByStatus,
  getTransactionById,
  getTransactionByNumber,
} from '../transactionService'

function createChainableBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'order', 'limit', 'single']
  methods.forEach(m => {
    builder[m] = vi.fn().mockReturnValue(builder)
  })
  // Make builder thenable so `await builder.select().eq()` resolves
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return builder
}

function createMockClient(transactions: any[] | null, error: any = null) {
  const builder = createChainableBuilder({ data: transactions, error })
  return {
    from: vi.fn().mockReturnValue(builder),
  } as any
}

describe('getTransactionSummary', () => {
  it('returns zero summary for no transactions', async () => {
    const client = createMockClient([])
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.total_transactions).toBe(0)
    expect(result.total_spent).toBe(0)
    expect(result.successful_transactions).toBe(0)
    expect(result.failed_transactions).toBe(0)
    expect(result.pending_transactions).toBe(0)
    expect(result.success_rate).toBe(0)
  })

  it('counts successful transactions and sums amount', async () => {
    const transactions = [
      { status: 'successful', amount: 1000 },
      { status: 'successful', amount: 2500 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.total_transactions).toBe(2)
    expect(result.successful_transactions).toBe(2)
    expect(result.total_spent).toBe(3500)
    expect(result.success_rate).toBe(100)
  })

  it('counts failed transactions', async () => {
    const transactions = [
      { status: 'failed', amount: 500 },
      { status: 'failed', amount: 300 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.failed_transactions).toBe(2)
    expect(result.total_spent).toBe(0)
    expect(result.success_rate).toBe(0)
  })

  it('counts pending transactions', async () => {
    const transactions = [
      { status: 'pending', amount: 800 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.pending_transactions).toBe(1)
    expect(result.total_spent).toBe(0) // pending doesn't add to spent
  })

  it('calculates correct success_rate for mixed statuses', async () => {
    const transactions = [
      { status: 'successful', amount: 1000 },
      { status: 'successful', amount: 2000 },
      { status: 'failed', amount: 500 },
      { status: 'pending', amount: 700 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.total_transactions).toBe(4)
    expect(result.successful_transactions).toBe(2)
    expect(result.failed_transactions).toBe(1)
    expect(result.pending_transactions).toBe(1)
    expect(result.total_spent).toBe(3000)
    expect(result.success_rate).toBe(50) // 2/4 * 100
  })

  it('handles null amount gracefully', async () => {
    const transactions = [
      { status: 'successful', amount: null },
      { status: 'successful', amount: 1000 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.total_spent).toBe(1000)
  })

  it('handles unknown status (neither successful/failed/pending)', async () => {
    const transactions = [
      { status: 'refunded', amount: 500 },
      { status: 'successful', amount: 1000 },
    ]
    const client = createMockClient(transactions)
    const result = await getTransactionSummary(client, 'customer-1')
    expect(result.total_transactions).toBe(2)
    expect(result.successful_transactions).toBe(1)
    expect(result.failed_transactions).toBe(0)
    expect(result.pending_transactions).toBe(0)
    expect(result.success_rate).toBe(50) // 1/2
  })

  it('throws on error', async () => {
    const client = createMockClient(null, { message: 'DB error' })
    await expect(getTransactionSummary(client, 'customer-1')).rejects.toThrow()
  })
})

describe('getCustomerTransactions', () => {
  it('should return transactions for customer', async () => {
    const mockTxns = [
      { id: 't1', amount: 1000, status: 'successful', booking: { id: 'b1' } },
      { id: 't2', amount: 500, status: 'pending', booking: { id: 'b2' } },
    ]
    const client = createMockClient(mockTxns)

    const result = await getCustomerTransactions(client, 'c1')
    expect(result).toEqual(mockTxns)
    expect(result).toHaveLength(2)
    expect(client.from).toHaveBeenCalledWith('transactions')
  })

  it('should throw on error', async () => {
    const client = createMockClient(null, { message: 'error' })
    await expect(getCustomerTransactions(client, 'c1')).rejects.toBeDefined()
  })
})

describe('getTransactionsByStatus', () => {
  it('should return transactions filtered by status', async () => {
    const mockTxns = [
      { id: 't1', amount: 1000, status: 'successful' },
    ]
    const client = createMockClient(mockTxns)

    const result = await getTransactionsByStatus(client, 'c1', 'successful')
    expect(result).toEqual(mockTxns)
  })

  it('should throw on error', async () => {
    const client = createMockClient(null, { message: 'error' })
    await expect(getTransactionsByStatus(client, 'c1', 'pending')).rejects.toBeDefined()
  })
})

describe('getTransactionById', () => {
  it('should return transaction by id', async () => {
    const mockTxn = { id: 't1', amount: 1000, status: 'successful', booking: { id: 'b1' } }
    const builder = createChainableBuilder({ data: mockTxn, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getTransactionById(client, 't1')
    expect(result).toEqual(mockTxn)
  })

  it('should return null for PGRST116', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getTransactionById(client, 'bad-id')
    expect(result).toBeNull()
  })

  it('should throw on other errors', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: '500', message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    await expect(getTransactionById(client, 't1')).rejects.toBeDefined()
  })
})

describe('getTransactionByNumber', () => {
  it('should return transaction by number', async () => {
    const mockTxn = { id: 't1', transaction_number: 'TXN-001', amount: 1000 }
    const builder = createChainableBuilder({ data: mockTxn, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getTransactionByNumber(client, 'TXN-001')
    expect(result).toEqual(mockTxn)
  })

  it('should return null for PGRST116', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    const result = await getTransactionByNumber(client, 'TXN-BAD')
    expect(result).toBeNull()
  })

  it('should throw on other errors', async () => {
    const builder = createChainableBuilder({ data: null, error: { code: '500', message: 'error' } })
    const client = { from: vi.fn().mockReturnValue(builder) } as any

    await expect(getTransactionByNumber(client, 'TXN-001')).rejects.toBeDefined()
  })
})
