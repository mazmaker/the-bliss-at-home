# Payment Integration Guide

This document describes the Omise payment integration for The Bliss at Home customer application.

## Overview

The payment system supports multiple payment methods through Omise Payment Gateway:
- Credit/Debit Cards (Visa, Mastercard, JCB, etc.)
- PromptPay QR Code
- Internet Banking
- Cash on Delivery

## Architecture

### Frontend (Customer App)

1. **Payment Service Module** (`packages/supabase/src/payment/`)
   - `types.ts` - TypeScript interfaces for payment operations
   - `omiseService.ts` - Omise.js integration for tokenization
   - `index.ts` - Exports

2. **UI Components** (`apps/customer/src/`)
   - `components/CreditCardForm.tsx` - Secure card input form
   - `pages/PaymentConfirmation.tsx` - Success page with receipt
   - `pages/TransactionHistory.tsx` - Payment history list
   - `pages/BookingWizard.tsx` - Checkout flow with payment

### Backend (Server App) - TODO

Backend API endpoints need to be implemented in `apps/server/src/routes/payments.ts`:

```typescript
// Required API endpoints:
POST /api/payments/charge - Create charge with Omise
POST /api/payments/promptpay - Create PromptPay QR
POST /api/payments/internet-banking - Create banking payment
POST /api/payments/refund - Process refund
GET  /api/payments/charge/:id - Get charge status
GET  /api/payments/transactions - List user transactions
GET  /api/payments/receipt?transaction_id=xxx - Get receipt data
```

## Configuration

### 1. Environment Variables

Add to `apps/customer/.env`:
```bash
VITE_OMISE_PUBLIC_KEY=pkey_test_66i2hvhmgh0xgb0jkjb
```

Add to `apps/server/.env`:
```bash
OMISE_SECRET_KEY=skey_test_66i2hvi1rkcjnnc0u8v
OMISE_PUBLIC_KEY=pkey_test_66i2hvhmgh0xgb0jkjb
```

### 2. Install Omise SDK (Server)

```bash
cd apps/server
pnpm add omise
```

## Implementation Steps

### Backend API Implementation (Required)

#### 1. Install Omise SDK

```bash
cd apps/server
pnpm add omise
```

#### 2. Create Omise Client

Create `apps/server/src/services/omiseClient.ts`:

```typescript
import Omise from 'omise'

export const omiseClient = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
})
```

#### 3. Implement Payment Routes

Create `apps/server/src/routes/payments.ts`:

```typescript
import express from 'express'
import { omiseClient } from '../services/omiseClient'
import { supabase } from '../services/supabase'

const router = express.Router()

// Create charge for credit card
router.post('/charge', async (req, res) => {
  try {
    const { amount, currency = 'thb', description, token, metadata } = req.body

    const charge = await omiseClient.charges.create({
      amount: amount * 100, // Convert to satang (smallest unit)
      currency,
      description,
      card: token, // Omise token from frontend
      metadata,
    })

    // Save transaction to database
    await supabase.from('transactions').insert({
      omise_charge_id: charge.id,
      customer_id: req.user.id, // From auth middleware
      amount: amount,
      currency,
      payment_method: 'credit_card',
      status: charge.status === 'successful' ? 'successful' : 'pending',
      card_brand: charge.card?.brand,
      card_last_digits: charge.card?.last_digits,
      description,
      metadata,
    })

    res.json(charge)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
})

// Create PromptPay QR
router.post('/promptpay', async (req, res) => {
  try {
    const { amount, currency = 'thb', description } = req.body

    const source = await omiseClient.sources.create({
      type: 'promptpay',
      amount: amount * 100,
      currency,
    })

    const charge = await omiseClient.charges.create({
      amount: amount * 100,
      currency,
      source: source.id,
      description,
    })

    res.json({
      qr_code_url: source.scannable_code.image.download_uri,
      charge,
    })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
})

// Request refund
router.post('/refund', async (req, res) => {
  try {
    const { charge_id, amount, reason } = req.body

    const refund = await omiseClient.charges.refund(charge_id, {
      amount: amount ? amount * 100 : undefined, // Partial or full refund
      metadata: { reason },
    })

    // Update transaction status in database
    await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .eq('omise_charge_id', charge_id)

    res.json(refund)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
})

export default router
```

#### 4. Add Routes to Server

In `apps/server/src/index.ts`:

```typescript
import paymentRoutes from './routes/payments'

// Add payment routes
app.use('/api/payments', authMiddleware, paymentRoutes)
```

### Database Schema (Supabase)

Create `transactions` table:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  omise_charge_id VARCHAR(100),
  omise_token_id VARCHAR(100),
  card_brand VARCHAR(50),
  card_last_digits VARCHAR(4),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (auth.jwt() ->> 'role' = 'ADMIN');
```

## Payment Flow

### Credit Card Payment

1. User enters card details in `CreditCardForm.tsx`
2. Frontend calls `omiseService.createCardToken()` to tokenize card (client-side, secure)
3. Token is sent to backend API `/api/payments/charge`
4. Backend creates charge using Omise secret key
5. Backend saves transaction to database
6. Frontend redirects to `/payment/confirmation?transaction_id=xxx`
7. Email receipt sent to customer

### PromptPay Payment

1. User selects PromptPay
2. Frontend calls backend API `/api/payments/promptpay`
3. Backend creates PromptPay source and charge
4. Frontend displays QR code for user to scan
5. Backend webhook receives payment confirmation
6. Transaction status updated to "successful"

### Refund Process

1. Admin or customer requests refund from BookingDetails page
2. Frontend calls backend API `/api/payments/refund`
3. Backend processes refund via Omise API
4. Transaction status updated to "refunded"
5. Email notification sent to customer

## Security Notes

1. **Never expose Secret Key** - Only use public key in frontend
2. **PCI Compliance** - Card data never touches your server (tokenized by Omise.js)
3. **HTTPS Required** - Omise requires SSL/TLS for production
4. **Webhook Verification** - Verify webhook signatures from Omise
5. **Amount Validation** - Always validate amounts server-side

## Testing

### Test Cards

Omise provides test cards:
- Success: `4242424242424242`
- Failure: `4000000000000002`
- 3D Secure: `4000000000000051`

### Test Mode

Use test keys:
- Public: `pkey_test_66i2hvhmgh0xgb0jkjb`
- Secret: `skey_test_66i2hvi1rkcjnnc0u8v`

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Enable HTTPS on all endpoints
- [ ] Set up Omise webhooks for async payment confirmations
- [ ] Implement proper error logging and monitoring
- [ ] Add receipt PDF generation
- [ ] Set up email notifications (SendGrid/AWS SES)
- [ ] Test refund process thoroughly
- [ ] Implement rate limiting on payment endpoints
- [ ] Add fraud detection rules in Omise Dashboard

## Support

- Omise Documentation: https://docs.opn.ooo/
- Omise Dashboard: https://dashboard.omise.co/
- Technical Support: support@omise.co

## Future Enhancements

- [ ] Installment payments (ผ่อนชำระ)
- [ ] Mobile banking (SCB Easy, KBank, etc.)
- [ ] Recurring payments for packages
- [ ] Multi-currency support
- [ ] Gift card/voucher system
- [ ] Loyalty points integration
