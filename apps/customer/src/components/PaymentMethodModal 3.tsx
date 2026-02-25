import { useState } from 'react'
import { Modal } from '@bliss/ui'
import { omiseService, type CardDetails } from '@bliss/supabase/payment'
import { useQueryClient } from '@tanstack/react-query'
import CreditCardForm from './CreditCardForm'
import toast from 'react-hot-toast'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
}

function PaymentMethodModal({ isOpen, onClose, customerId }: PaymentMethodModalProps) {
  const [isDefault, setIsDefault] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const queryClient = useQueryClient()

  const handleCardSubmit = async (cardDetails: CardDetails) => {
    setIsProcessing(true)
    try {
      // Step 1: Tokenize card with Omise
      const token = await omiseService.createCardToken(cardDetails)

      // Step 2: Send token to backend to create Omise Customer
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/add-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          card_token: token.id,
          is_default: isDefault,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add payment method')
      }

      // Invalidate payment methods cache to refetch
      await queryClient.invalidateQueries({
        queryKey: ['paymentMethods', 'customer', customerId],
      })

      toast.success('Payment method added successfully')
      onClose()
      // Reset form
      setIsDefault(false)
    } catch (error: any) {
      console.error('Failed to add payment method:', error)
      toast.error(error.message || 'Failed to add payment method')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Payment Method"
      size="md"
    >
      <div className="space-y-4">
        <CreditCardForm
          onSubmit={handleCardSubmit}
          isLoading={isProcessing}
          submitButtonText="Add Payment Method"
        />

        {/* Set as Default Checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is-default-payment"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={isProcessing}
            className="w-4 h-4 text-amber-700 border-stone-300 rounded focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <label
            htmlFor="is-default-payment"
            className="text-sm text-stone-700 cursor-pointer"
          >
            Set as default payment method
          </label>
        </div>
      </div>
    </Modal>
  )
}

export default PaymentMethodModal
