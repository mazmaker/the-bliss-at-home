/**
 * Omise Payment Service
 * Handles all Omise payment operations
 */

import Omise from 'omise'

// Lazy initialization - create Omise client when first used
let omiseInstance: any = null

function getOmiseClient() {
  if (!omiseInstance) {
    const publicKey = process.env.OMISE_PUBLIC_KEY || ''
    const secretKey = process.env.OMISE_SECRET_KEY || ''

    console.log('🔑 Omise Keys Check:')
    console.log('  Public Key:', publicKey ? `${publicKey.substring(0, 15)}...` : 'NOT FOUND')
    console.log('  Secret Key:', secretKey ? `${secretKey.substring(0, 15)}...` : 'NOT FOUND')

    if (!publicKey || !secretKey) {
      throw new Error('Omise keys not found in environment variables. Please check OMISE_PUBLIC_KEY and OMISE_SECRET_KEY in .env file.')
    }

    omiseInstance = Omise({
      publicKey,
      secretKey,
    })

    console.log('✅ Omise client initialized')
  }

  return omiseInstance
}

export interface CreateChargeParams {
  amount: number // Amount in smallest currency unit (satangs for THB)
  currency: string
  token?: string // Card token from Omise.js
  customerId?: string // Saved customer ID
  description: string
  metadata?: Record<string, any>
  returnUri?: string // For 3DS
  capture?: boolean
}

export interface CreateCustomerParams {
  email: string
  description: string
  card?: string // Card token
  metadata?: Record<string, any>
}

export interface ChargeResponse {
  id: string
  object: string
  amount: number
  currency: string
  status: string
  paid: boolean
  transaction: string | null
  card?: {
    brand: string
    lastDigits: string
    expirationMonth: number
    expirationYear: number
    name: string
  }
  failureCode?: string
  failureMessage?: string
  metadata?: Record<string, any>
  createdAt: string
}

/**
 * Create a charge (payment)
 */
export async function createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
  try {
    const chargeData: any = {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      capture: params.capture !== false, // Auto-capture by default
      metadata: params.metadata || {},
    }

    // Use token or customer ID
    if (params.token) {
      chargeData.card = params.token
    } else if (params.customerId) {
      chargeData.customer = params.customerId
    } else {
      throw new Error('Either token or customerId must be provided')
    }

    // Add return URI for 3DS
    if (params.returnUri) {
      chargeData.return_uri = params.returnUri
    }

    const omise = getOmiseClient()
    const charge = await omise.charges.create(chargeData)

    return {
      id: charge.id,
      object: charge.object,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      paid: charge.paid,
      transaction: charge.transaction,
      card: charge.card
        ? {
            brand: charge.card.brand,
            lastDigits: charge.card.last_digits,
            expirationMonth: charge.card.expiration_month,
            expirationYear: charge.card.expiration_year,
            name: charge.card.name,
          }
        : undefined,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
      metadata: charge.metadata,
      createdAt: charge.created_at,
    }
  } catch (error: any) {
    console.error('Omise createCharge error:', error)
    throw new Error(error.message || 'Failed to create charge')
  }
}

/**
 * Create an Omise customer (to save card for future use)
 */
export async function createCustomer(params: CreateCustomerParams): Promise<any> {
  try {
    const omise = getOmiseClient()
    const customer = await omise.customers.create({
      email: params.email,
      description: params.description,
      card: params.card,
      metadata: params.metadata || {},
    })

    return {
      id: customer.id,
      email: customer.email,
      description: customer.description,
      defaultCard: customer.default_card,
      cards: customer.cards?.data || [],
      metadata: customer.metadata,
      createdAt: customer.created_at,
    }
  } catch (error: any) {
    console.error('Omise createCustomer error:', error)
    throw new Error(error.message || 'Failed to create customer')
  }
}

/**
 * Retrieve a charge by ID
 */
export async function getCharge(chargeId: string): Promise<ChargeResponse> {
  try {
    const omise = getOmiseClient()
    const charge = await omise.charges.retrieve(chargeId)

    return {
      id: charge.id,
      object: charge.object,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      paid: charge.paid,
      transaction: charge.transaction,
      card: charge.card
        ? {
            brand: charge.card.brand,
            lastDigits: charge.card.last_digits,
            expirationMonth: charge.card.expiration_month,
            expirationYear: charge.card.expiration_year,
            name: charge.card.name,
          }
        : undefined,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message,
      metadata: charge.metadata,
      createdAt: charge.created_at,
    }
  } catch (error: any) {
    console.error('Omise getCharge error:', error)
    throw new Error(error.message || 'Failed to retrieve charge')
  }
}

/**
 * Create a refund
 */
export async function createRefund(chargeId: string, amount?: number): Promise<any> {
  try {
    const omise = getOmiseClient()
    const refund = await omise.charges.refund(chargeId, { amount })

    return {
      id: refund.id,
      object: refund.object,
      amount: refund.amount,
      currency: refund.currency,
      charge: refund.charge,
      transaction: refund.transaction,
      status: refund.status,
      createdAt: refund.created_at,
    }
  } catch (error: any) {
    console.error('Omise createRefund error:', error)
    throw new Error(error.message || 'Failed to create refund')
  }
}

/**
 * Verify webhook signature (for security)
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // TODO: Implement webhook signature verification
  // Omise uses HMAC-SHA256 with secret key
  // For now, return true (implement in production)
  return true
}

export const omiseService = {
  createCharge,
  createCustomer,
  getCharge,
  createRefund,
  verifyWebhookSignature,
}
