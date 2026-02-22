import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, CreditCard, Smartphone, Building2, Banknote, Download, ChevronRight, AlertCircle, FileText } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCustomerTransactions, useTransactionSummary } from '@bliss/supabase/hooks/useTransactions'
import { downloadReceipt, type ReceiptPdfData } from '../utils/receiptPdfGenerator'
import { getStoredLanguage } from '@bliss/i18n'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function TransactionHistory() {
  const [filter, setFilter] = useState<'all' | 'successful' | 'refunded' | 'failed' | 'pending'>('all')

  // Fetch customer and transactions from Supabase
  const { data: customer } = useCurrentCustomer()
  const { data: transactionsData, isLoading, error } = useCustomerTransactions(customer?.id)
  const { data: summary } = useTransactionSummary(customer?.id)

  // Transform and filter transactions
  const transactions = useMemo(() => {
    if (!transactionsData) return []

    return transactionsData.map((txn) => ({
      id: txn.id,
      transaction_number: txn.transaction_number,
      booking_id: txn.booking?.booking_number || txn.booking_id,
      customer_id: txn.customer_id,
      amount: Number(txn.amount),
      currency: txn.currency || 'THB',
      payment_method: txn.payment_method,
      status: txn.status,
      card_brand: txn.card_brand,
      card_last_digits: txn.card_last_digits,
      description: txn.description || 'Payment',
      created_at: txn.created_at,
      updated_at: txn.updated_at,
    }))
  }, [transactionsData])

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions
    return transactions.filter((txn) => txn.status === filter)
  }, [transactions, filter])

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />
      case 'promptpay':
        return <Smartphone className="w-5 h-5" />
      case 'internet_banking':
        return <Building2 className="w-5 h-5" />
      case 'cash':
        return <Banknote className="w-5 h-5" />
      default:
        return <Receipt className="w-5 h-5" />
    }
  }

  const getPaymentMethodLabel = (method: string, cardBrand?: string, lastDigits?: string) => {
    switch (method) {
      case 'credit_card':
        return `${cardBrand || 'Card'} •••• ${lastDigits || ''}`
      case 'promptpay':
        return 'PromptPay'
      case 'internet_banking':
        return 'Internet Banking'
      case 'cash':
        return 'Cash'
      default:
        return method
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'successful':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Successful</span>
      case 'refunded':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Refunded</span>
      case 'failed':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Failed</span>
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>
      default:
        return <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-medium rounded-full">{status}</span>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-amber-700 mb-4"></div>
            <p className="text-stone-600">Loading transactions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Error Loading Transactions</h2>
            <p className="text-stone-600 mb-6">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Transaction History</h1>
          <p className="text-stone-600">View all your payment transactions and receipts</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
              filter === 'all'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setFilter('successful')}
            className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
              filter === 'successful'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            Successful
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('refunded')}
            className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
              filter === 'refunded'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            Refunded
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
              filter === 'failed'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            Failed
          </button>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Receipt className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No transactions found</h3>
            <p className="text-stone-600 mb-6">You don't have any transactions yet</p>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800"
            >
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-xl shadow p-4 md:p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start gap-4">
                  {/* Payment Icon */}
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getPaymentIcon(transaction.payment_method)}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-stone-900 mb-1">{transaction.description}</h3>
                        <p className="text-sm text-stone-500">
                          {getPaymentMethodLabel(
                            transaction.payment_method,
                            transaction.card_brand ?? undefined,
                            transaction.card_last_digits ?? undefined
                          )}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-stone-900">฿{transaction.amount}</p>
                        {getStatusBadge(transaction.status ?? '')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <p className="text-stone-500">
                        {new Date(transaction.created_at!).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>

                      <div className="flex items-center gap-2">
                        {(transaction.status === 'successful' || transaction.status === 'refunded') && (
                          <button
                            onClick={async () => {
                              try {
                                const lang = getStoredLanguage() as 'th' | 'en' | 'cn'
                                const dateLocale = lang === 'th' ? 'th-TH' : lang === 'cn' ? 'zh-CN' : 'en-US'
                                const resp = await fetch(`${API_URL}/api/receipts/${transaction.id}`)
                                const result = await resp.json()
                                if (result.success) {
                                  const d = result.data
                                  downloadReceipt({
                                    receiptNumber: d.receipt_number,
                                    transactionDate: new Date(d.transaction_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }),
                                    bookingNumber: d.booking_number,
                                    serviceName: d.service_name,
                                    serviceNameEn: d.service_name_en,
                                    bookingDate: new Date(d.booking_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }),
                                    bookingTime: d.booking_time,
                                    amount: d.amount,
                                    paymentMethod: d.payment_method,
                                    cardBrand: d.card_brand,
                                    cardLastDigits: d.card_last_digits,
                                    customerName: d.customer_name,
                                    addons: d.addons,
                                    language: lang,
                                    company: {
                                      name: d.company.companyName,
                                      nameTh: d.company.companyNameTh,
                                      address: d.company.companyAddress,
                                      phone: d.company.companyPhone,
                                      email: d.company.companyEmail,
                                      taxId: d.company.companyTaxId,
                                    },
                                  } as ReceiptPdfData)
                                }
                              } catch (err) {
                                console.error('Failed to download receipt:', err)
                              }
                            }}
                            className="text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            ใบเสร็จ
                          </button>
                        )}
                        <Link
                          to={`/bookings/${transaction.booking_id}`}
                          className="text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                        >
                          ดูการจอง
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {transaction.status === 'refunded' && (
                      <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-sm text-purple-800">
                        <AlertCircle className="w-4 h-4" />
                        This transaction has been refunded to your original payment method
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {transactions.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-stone-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">Total Transactions</p>
                <p className="text-xl font-bold text-stone-900">
                  {summary?.total_transactions || transactions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-1">Total Spent</p>
                <p className="text-xl font-bold text-amber-700">
                  ฿{summary?.total_spent || transactions.filter(t => t.status === 'successful').reduce((sum, t) => sum + t.amount, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-1">Successful</p>
                <p className="text-xl font-bold text-green-600">
                  {summary?.successful_transactions || transactions.filter((t) => t.status === 'successful').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-1">Refunded</p>
                <p className="text-xl font-bold text-purple-600">
                  {transactions.filter((t) => t.status === 'refunded').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionHistory
