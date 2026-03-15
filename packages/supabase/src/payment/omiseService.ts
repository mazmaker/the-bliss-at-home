/**
 * Omise Payment Service
 * Handles payment processing with Omise API
 */

import type {
  CardDetails,
  OmiseToken,
  OmiseCharge,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
} from './types'

// Omise Configuration
const OMISE_PUBLIC_KEY = import.meta.env.VITE_OMISE_PUBLIC_KEY || 'pkey_test_66i2hvhmgh0xgb0jkjb'
const OMISE_API_URL = 'https://api.omise.co'

// Load Omise.js script dynamically
let omiseLoaded = false
let omiseLoadPromise: Promise<void> | null = null

function loadOmiseScript(): Promise<void> {
  if (omiseLoaded) {
    return Promise.resolve()
  }

  if (omiseLoadPromise) {
    return omiseLoadPromise
  }

  omiseLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.omise.co/omise.js'
    script.onload = () => {
      omiseLoaded = true
      // Set public key
      if (window.Omise) {
        window.Omise.setPublicKey(OMISE_PUBLIC_KEY)
      }
      resolve()
    }
    script.onerror = () => {
      omiseLoadPromise = null
      reject(new Error('Failed to load Omise.js'))
    }
    document.head.appendChild(script)
  })

  return omiseLoadPromise
}

/**
 * Create Omise token from card details
 * This token will be sent to backend to create a charge
 */
export async function createCardToken(cardDetails: CardDetails): Promise<OmiseToken> {
  await loadOmiseScript()

  return new Promise((resolve, reject) => {
    if (!window.Omise) {
      reject(new Error('Omise.js not loaded'))
      return
    }

    window.Omise.createToken('card', {
      name: cardDetails.name,
      number: cardDetails.number.replace(/\s/g, ''),
      expiration_month: cardDetails.expiration_month,
      expiration_year: cardDetails.expiration_year,
      security_code: cardDetails.security_code,
    }, (statusCode: number, response: any) => {
      if (statusCode === 200 && response.object === 'token') {
        resolve(response as OmiseToken)
      } else {
        reject(new Error(response.message || 'Failed to create token'))
      }
    })
  })
}

/**
 * Create payment charge via backend API
 * Backend will use secret key to create actual charge
 */
export async function createCharge(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch('/api/payments/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Payment failed',
      }
    }

    const charge = await response.json()
    return {
      success: true,
      charge: charge as OmiseCharge,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Create PromptPay QR code payment source
 */
export async function createPromptPaySource(amount: number, description: string): Promise<PaymentResponse> {
  try {
    const response = await fetch('/api/payments/promptpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'THB',
        description,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to create PromptPay QR',
      }
    }

    const result = await response.json()
    return {
      success: true,
      paymentUrl: result.qr_code_url,
      charge: result.charge,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Create Internet Banking payment source
 */
export async function createInternetBankingSource(
  amount: number,
  description: string,
  bank: string
): Promise<PaymentResponse> {
  try {
    const response = await fetch('/api/payments/internet-banking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'THB',
        description,
        bank,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to create banking payment',
      }
    }

    const result = await response.json()
    return {
      success: true,
      paymentUrl: result.authorize_uri,
      charge: result.charge,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Request refund for a charge
 */
export async function requestRefund(refundRequest: RefundRequest): Promise<RefundResponse> {
  try {
    const response = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundRequest),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Refund failed',
      }
    }

    const refund = await response.json()
    return {
      success: true,
      refund,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Get charge details
 */
export async function getCharge(chargeId: string): Promise<OmiseCharge | null> {
  try {
    const response = await fetch(`/api/payments/charge/${chargeId}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to get charge:', error)
    return null
  }
}

// Export payment service
export const omiseService = {
  createCardToken,
  createCharge,
  createPromptPaySource,
  createInternetBankingSource,
  requestRefund,
  getCharge,
}

// Window.Omise type is declared in PaymentForm.tsx
