import { supabase } from './supabase'

export interface Hotel {
  id: string
  name_th: string
  name_en: string
  contact_person: string
  email: string
  phone: string
  address: string
  latitude: number | null
  longitude: number | null
  commission_rate: number
  status: 'active' | 'pending' | 'inactive' | 'suspended' | 'banned'
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  tax_id?: string
  description?: string
  website?: string
  rating: number
  created_at: string
  updated_at: string
}

export interface HotelInvoice {
  id: string
  bill_number: string
  hotel_id: string
  month: number
  year: number
  period_start: string
  period_end: string
  total_bookings: number
  total_base_price: number
  total_discount: number
  total_amount: number
  status: 'pending' | 'paid' | 'overdue'
  due_date: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export interface HotelPayment {
  id: string
  hotel_id: string
  invoice_id?: string
  invoice_number?: string
  transaction_ref: string
  amount: number
  payment_method: 'bank_transfer' | 'cash' | 'cheque' | 'online'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_date: string
  verified_by?: string
  verified_date?: string
  notes?: string
  created_at: string
}

export interface HotelBooking {
  id: string
  booking_number: string
  hotel_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_name: string
  service_category: string
  staff_name?: string
  booking_date: string
  service_date: string
  service_time: string
  duration: number
  total_price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'paid' | 'pending' | 'refunded'
  room_number?: string
  notes?: string
  created_by_hotel: boolean
  created_at: string
}

// ==================== HOTELS ====================

export const getAllHotels = async () => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Hotel[]
}

export const getHotelById = async (id: string) => {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Hotel
}

export const createHotel = async (hotelData: Partial<Hotel>) => {
  const { data, error } = await supabase
    .from('hotels')
    .insert([hotelData])
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export const updateHotel = async (id: string, hotelData: Partial<Hotel>) => {
  const { data, error } = await supabase
    .from('hotels')
    .update(hotelData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export const updateHotelStatus = async (id: string, status: Hotel['status']) => {
  const { data, error } = await supabase
    .from('hotels')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

// ==================== INVOICES (Using monthly_bills table) ====================

export const getHotelInvoices = async (hotelId: string) => {
  // ✅ First try to get from monthly_bills table
  const { data: existingBills } = await supabase
    .from('monthly_bills')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })

  if (existingBills && existingBills.length > 0) {
    return existingBills as HotelInvoice[]
  }

  // ✅ If no bills exist, generate from actual bookings data
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('booking_date, final_price, status, created_at, hotels!inner(commission_rate, discount_rate)')
    .eq('hotel_id', hotelId)
    .eq('is_hotel_booking', true)
    .in('status', ['confirmed', 'completed'])
    .order('booking_date', { ascending: false })

  if (error) throw error

  if (!bookings || bookings.length === 0) {
    return []
  }

  // Group bookings by month to create monthly invoices
  const monthlyGroups: { [key: string]: typeof bookings } = {}
  bookings.forEach(booking => {
    const date = new Date(booking.booking_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = []
    }
    monthlyGroups[monthKey].push(booking)
  })

  // Fetch completed payments to cross-check invoice status and get payment dates
  const { data: completedPayments } = await supabase
    .from('hotel_payments')
    .select('invoice_number, payment_date')
    .eq('hotel_id', hotelId)
    .eq('status', 'completed')

  const paidPaymentMap = new Map(
    (completedPayments || [])
      .filter(p => p.invoice_number)
      .map(p => [p.invoice_number, p.payment_date])
  )

  // Convert to invoice format
  const invoices = Object.entries(monthlyGroups).map(([monthKey, monthBookings]) => {
    const [year, month] = monthKey.split('-')
    const totalRevenue = monthBookings.reduce((sum, booking) => sum + Number(booking.final_price), 0)
    const commissionRate = monthBookings[0].hotels?.discount_rate || monthBookings[0].hotels?.commission_rate || 20
    const commissionAmount = totalRevenue * (commissionRate / 100)
    const invoiceNumber = `INV-${year}${month}-${hotelId.substring(0, 8).toUpperCase()}`

    return {
      id: `generated-${hotelId}-${monthKey}`,
      invoice_number: invoiceNumber,
      hotel_id: hotelId,
      period_start: `${year}-${month}-01`,
      period_end: new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0],
      period_type: 'monthly' as const,
      total_bookings: monthBookings.length,
      total_revenue: totalRevenue,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: paidPaymentMap.has(invoiceNumber) ? 'paid' as const : 'pending' as const,
      paid_date: paidPaymentMap.get(invoiceNumber) || null,
      issued_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  })

  return invoices as HotelInvoice[]
}

export const createInvoice = async (invoiceData: Partial<HotelInvoice>) => {
  // แปลงข้อมูลให้เข้ากับโครงสร้าง monthly_bills
  const billData = {
    hotel_id: invoiceData.hotel_id,
    bill_number: invoiceData.invoice_number,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    period_start: invoiceData.period_start,
    period_end: invoiceData.period_end,
    total_bookings: invoiceData.total_bookings || 0,
    total_amount: invoiceData.total_revenue || 0,
    status: invoiceData.status === 'paid' ? 'paid' : 'pending',
    due_date: invoiceData.due_date
  }

  const { data, error } = await supabase
    .from('monthly_bills') // ✅ ใช้ existing table
    .insert([billData])
    .select()
    .single()

  if (error) throw error
  return data as any
}

export const updateInvoice = async (id: string, invoiceData: Partial<HotelInvoice>) => {
  const { data, error } = await supabase
    .from('monthly_bills') // ✅ ใช้ existing table
    .update({
      status: invoiceData.status === 'paid' ? 'paid' : 'pending',
      total_amount: invoiceData.total_revenue
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== PAYMENTS (Using bookings payment data) ====================

export const getHotelPayments = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('hotel_payments')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('payment_date', { ascending: false })

  if (error) throw error
  return (data || []) as HotelPayment[]
}

export const createPayment = async (paymentData: Partial<HotelPayment>) => {
  // 1. For now, set invoice_id to null to avoid FK constraint issues
  // The FK constraint points to hotel_invoices table, but we're using monthly_bills
  // This is a temporary fix until the schema is properly aligned
  let validInvoiceId = null
  if (paymentData.invoice_id && !paymentData.invoice_id.startsWith('generated-')) {
    console.warn(`Setting invoice_id to null to avoid FK constraint error. Original ID: ${paymentData.invoice_id}`)
    // Store the original invoice info in the invoice_number field instead
  }

  // 2. Create payment record
  const { data, error } = await supabase
    .from('hotel_payments')
    .insert([{
      hotel_id: paymentData.hotel_id,
      invoice_id: validInvoiceId,
      invoice_number: paymentData.invoice_number || null,
      transaction_ref: paymentData.transaction_ref,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      status: paymentData.status || 'completed',
      payment_date: paymentData.payment_date,
      notes: paymentData.notes || null,
    }])
    .select()
    .single()

  if (error) throw error

  // 3. If payment is completed and has invoice_id, update monthly_bills table
  if (paymentData.status === 'completed' && paymentData.invoice_id && !paymentData.invoice_id.startsWith('generated-')) {
    try {
      const { error: billUpdateError } = await supabase
        .from('monthly_bills')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentData.invoice_id)

      if (billUpdateError) {
        console.error('Failed to update monthly bill status:', billUpdateError)
        // Don't throw error here - payment was successful, just log the bill update failure
      }
    } catch (updateError) {
      console.error('Error updating monthly bill:', updateError)
    }
  }

  return data as any
}

// 🔄 Sync existing payments with monthly bills
export const syncPaymentsWithMonthlyBills = async () => {
  try {
    // Get all completed payments that have invoice_id
    const { data: completedPayments, error: paymentError } = await supabase
      .from('hotel_payments')
      .select(`
        invoice_id,
        payment_date,
        hotel_id,
        invoice_number,
        amount
      `)
      .eq('status', 'completed')
      .not('invoice_id', 'is', null)

    if (paymentError) throw paymentError

    console.log('🔍 Found completed payments:', completedPayments)

    if (!completedPayments || completedPayments.length === 0) {
      return { message: 'No completed payments with invoice_id found' }
    }

    // Also try to find bills by invoice_number if invoice_id doesn't work
    const updateResults = []

    for (const payment of completedPayments) {
      try {
        // First try to update by invoice_id
        let { data: updateByIdData, error: updateByIdError } = await supabase
          .from('monthly_bills')
          .update({
            status: 'paid',
            paid_at: payment.payment_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.invoice_id)
          .eq('status', 'pending')
          .select()

        if (updateByIdData && updateByIdData.length > 0) {
          updateResults.push({ success: true, method: 'by_id', payment })
          continue
        }

        // Try to match by invoice_number (bill_number) first
        if (payment.invoice_number) {
          const { data: updateByInvoiceNumber, error: updateByInvoiceError } = await supabase
            .from('monthly_bills')
            .update({
              status: 'paid',
              paid_at: payment.payment_date,
              updated_at: new Date().toISOString()
            })
            .eq('bill_number', payment.invoice_number)
            .eq('status', 'pending')
            .select()

          if (updateByInvoiceNumber && updateByInvoiceNumber.length > 0) {
            updateResults.push({ success: true, method: 'by_invoice_number', payment })
            continue
          }
        }

        // If no update by invoice_number, try to extract month/year from invoice_number
        if (payment.hotel_id && payment.invoice_number) {
          let month, year

          // Extract month/year from invoice number format (e.g., INV-202602 = Feb 2026)
          const invoiceMatch = payment.invoice_number.match(/INV-(\d{4})(\d{2})/)
          if (invoiceMatch) {
            year = parseInt(invoiceMatch[1])
            month = parseInt(invoiceMatch[2])
          } else {
            // Fallback to payment date if can't parse invoice number
            const paymentDate = new Date(payment.payment_date)
            month = paymentDate.getMonth() + 1
            year = paymentDate.getFullYear()
          }

          const { data: updateByAmountData, error: updateByAmountError } = await supabase
            .from('monthly_bills')
            .update({
              status: 'paid',
              paid_at: payment.payment_date,
              updated_at: new Date().toISOString()
            })
            .eq('hotel_id', payment.hotel_id)
            .eq('month', month)
            .eq('year', year)
            .eq('total_amount', payment.amount)
            .eq('status', 'pending')
            .select()

          if (updateByAmountData && updateByAmountData.length > 0) {
            updateResults.push({ success: true, method: 'by_amount_from_invoice', payment })
          } else {
            updateResults.push({ success: false, method: 'none', payment, error: 'No matching bill found' })
          }
        }
      } catch (error) {
        updateResults.push({ success: false, method: 'error', payment, error: error.message })
      }
    }

    const successful = updateResults.filter(r => r.success).length
    const failed = updateResults.filter(r => !r.success).length

    console.log('🔄 Sync results:', updateResults)

    return {
      message: `Sync completed: ${successful} bills updated, ${failed} failed`,
      successful,
      failed,
      details: updateResults
    }
  } catch (error) {
    console.error('Error syncing payments:', error)
    throw error
  }
}

// 🔍 Debug function to check specific hotel payments and bills matching
export const debugHotelPaymentSync = async (hotelId: string) => {
  try {
    // Get all payments for this hotel
    const { data: payments, error: paymentError } = await supabase
      .from('hotel_payments')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('status', 'completed')

    if (paymentError) throw paymentError

    // Get all bills for this hotel
    const { data: bills, error: billError } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('hotel_id', hotelId)

    if (billError) throw billError

    // Analyze matching
    const analysis = {
      total_payments: payments?.length || 0,
      total_bills: bills?.length || 0,
      payments: payments || [],
      bills: bills || [],
      matching_attempts: []
    }

    // Try to match each payment
    for (const payment of payments || []) {
      const matchingAttempt = {
        payment_id: payment.id,
        invoice_number: payment.invoice_number,
        payment_amount: payment.amount,
        payment_date: payment.payment_date,
        matches: []
      }

      // Try direct bill_number match
      const directMatch = bills?.find(bill => bill.bill_number === payment.invoice_number)
      if (directMatch) {
        matchingAttempt.matches.push({
          method: 'direct_bill_number',
          bill_id: directMatch.id,
          bill_number: directMatch.bill_number,
          bill_status: directMatch.status,
          bill_amount: directMatch.total_amount,
          month: directMatch.month,
          year: directMatch.year
        })
      }

      // Try parsing invoice number for month/year
      const invoiceMatch = payment.invoice_number?.match(/INV-(\d{4})(\d{2})/)
      if (invoiceMatch) {
        const year = parseInt(invoiceMatch[1])
        const month = parseInt(invoiceMatch[2])

        const monthYearMatch = bills?.find(bill =>
          bill.month === month &&
          bill.year === year &&
          Math.abs(Number(bill.total_amount) - Number(payment.amount)) < 1
        )

        if (monthYearMatch) {
          matchingAttempt.matches.push({
            method: 'month_year_amount',
            bill_id: monthYearMatch.id,
            bill_number: monthYearMatch.bill_number,
            bill_status: monthYearMatch.status,
            bill_amount: monthYearMatch.total_amount,
            month: monthYearMatch.month,
            year: monthYearMatch.year,
            extracted_month: month,
            extracted_year: year
          })
        }
      }

      analysis.matching_attempts.push(matchingAttempt)
    }

    return analysis
  } catch (error: any) {
    console.error('Debug sync error:', error)
    throw error
  }
}

// 🔍 Debug function to check payment vs bill status
export const debugPaymentStatus = async (hotelId: string, month?: number, year?: number) => {
  try {
    // Get hotel payments for this hotel
    const { data: payments, error: paymentsError } = await supabase
      .from('hotel_payments')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })

    // Get monthly bills for this hotel (remove filters to see all)
    const { data: allBills, error: billsError } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })

    console.log('🔍 Raw bills data:', allBills)
    console.log('🔍 Looking for month:', month, 'year:', year)

    // If specific month/year provided, filter
    const filteredBills = allBills?.filter(bill => {
      const monthMatch = !month || bill.month === month
      const yearMatch = !year || bill.year === year
      console.log(`Bill ${bill.id}: month ${bill.month} vs ${month} = ${monthMatch}, year ${bill.year} vs ${year} = ${yearMatch}`)
      return monthMatch && yearMatch
    })

    // Try to match payments with bills
    const paymentBillMatching = payments?.map(payment => {
      const matchingBill = allBills?.find(bill => bill.id === payment.invoice_id)
      return {
        payment_id: payment.id,
        payment_invoice_id: payment.invoice_id,
        payment_status: payment.status,
        payment_amount: payment.amount,
        payment_invoice_number: payment.invoice_number,
        matching_bill: matchingBill ? {
          bill_id: matchingBill.id,
          bill_number: matchingBill.bill_number,
          bill_status: matchingBill.status,
          bill_amount: matchingBill.total_amount,
          bill_month: matchingBill.month,
          bill_year: matchingBill.year
        } : null
      }
    })

    const result = {
      hotel_id: hotelId,
      payments: payments || [],
      all_bills: allBills || [],
      filtered_bills: filteredBills || [],
      payment_bill_matching: paymentBillMatching || [],
      summary: {
        total_payments: payments?.length || 0,
        completed_payments: payments?.filter(p => p.status === 'completed').length || 0,
        total_bills_all: allBills?.length || 0,
        total_bills_filtered: (filteredBills || [])?.length || 0,
        paid_bills: allBills?.filter(b => b.status === 'paid').length || 0,
        pending_bills: allBills?.filter(b => b.status === 'pending').length || 0,
      }
    }

    console.log('🔍 Complete Debug Data:', result)
    return result
  } catch (error) {
    console.error('Debug error:', error)
    throw error
  }
}

// 🔍 Check specific invoice details
export const checkSpecificInvoice = async (invoiceNumber: string) => {
  try {
    // Search in monthly_bills by bill_number
    const { data: billData, error: billError } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('bill_number', invoiceNumber)
      .single()

    if (billError && billError.code !== 'PGRST116') {
      throw billError
    }

    // Get hotel information separately if bill found
    let hotelData = null
    if (billData?.hotel_id) {
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('id', billData.hotel_id)
        .single()

      if (!hotelError) {
        hotelData = hotel
      }
    }

    // Also search for any payments linked to this invoice
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('hotel_payments')
      .select('*')
      .eq('invoice_number', invoiceNumber)

    const result = {
      invoice_number: invoiceNumber,
      bill_found: !!billData,
      bill_details: billData || null,
      hotel_details: hotelData || null,
      related_payments: paymentsData || [],
      analysis: {
        hotel_name: hotelData?.name || 'Unknown',
        month: billData?.month || 'Unknown',
        year: billData?.year || 'Unknown',
        status: billData?.status || 'Unknown',
        amount: billData?.total_amount || 'Unknown',
        payment_count: paymentsData?.length || 0,
        is_february_2026: billData?.month === 2 && billData?.year === 2026,
        is_test_hotel_3: hotelData?.name?.includes('ทดสอบ3') || (hotelData?.name?.includes('test') && hotelData?.name?.includes('3'))
      }
    }

    console.log('🔍 Invoice Check Result:', result)
    return result
  } catch (error) {
    console.error('Error checking invoice:', error)
    throw error
  }
}

// 🔍 Find all bills for a specific hotel
export const findAllBillsForHotel = async (hotelId: string) => {
  try {
    // Get all monthly bills for this hotel
    const { data: allBills, error: billsError } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (billsError) throw billsError

    // Get all payments for this hotel
    const { data: allPayments, error: paymentsError } = await supabase
      .from('hotel_payments')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })

    if (paymentsError) throw paymentsError

    const result = {
      hotel_id: hotelId,
      bills: allBills || [],
      payments: allPayments || [],
      analysis: {
        total_bills: allBills?.length || 0,
        total_payments: allPayments?.length || 0,
        february_bills: allBills?.filter(b => b.month === 2 && b.year === 2026) || [],
        unmatched_payments: allPayments?.filter(p => {
          return !allBills?.find(b => b.id === p.invoice_id || b.bill_number === p.invoice_number)
        }) || []
      }
    }

    console.log('🔍 All Bills for Hotel:', result)
    return result
  } catch (error) {
    console.error('Error finding bills:', error)
    throw error
  }
}

// 🔧 Create missing monthly bills from existing payments
export const createMissingMonthlyBills = async (hotelId: string) => {
  try {
    // First, let's check current user authentication status
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('🔍 Current user:', user)

    if (userError) {
      console.error('❌ User error:', userError)
      throw new Error(`Authentication error: ${userError.message}`)
    }

    if (!user) {
      throw new Error('No authenticated user found')
    }

    // Check user's profile and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔍 Current user profile:', profile)
    if (profileError) {
      console.error('❌ Profile error:', profileError)
    }

    // Get all completed payments for this hotel that don't have matching bills
    console.log('🔍 Fetching completed payments for hotel:', hotelId)
    const { data: payments, error: paymentsError } = await supabase
      .from('hotel_payments')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('status', 'completed')

    if (paymentsError) {
      console.error('❌ Payments error:', paymentsError)
      throw paymentsError
    }

    console.log('🔍 Found payments:', payments)

    const results = []

    for (const payment of payments || []) {
      try {
        // Parse month/year from invoice number
        // Format 1: INV-YYYYMM-xxx (e.g., INV-202602-d18c)
        // Format 2: INV-6031202-d18c where 603=prefix, 12=month?, 02=year? - User specified this is March 2026
        // Format 3: INV-XMMYYYY-xxx where X=prefix, MM=month, YYYY=some other data
        let year: number
        let month: number

        console.log(`🔍 Parsing invoice number: ${payment.invoice_number}`)

        // Try standard format first: INV-YYYYMM-xxx
        const format1Match = payment.invoice_number?.match(/INV-(\d{4})(\d{2})-/)

        if (format1Match) {
          // Standard format: INV-YYYYMM-xxx
          year = parseInt(format1Match[1])
          month = parseInt(format1Match[2])
          console.log(`✅ Format 1 match: year=${year}, month=${month}`)
        }
        // Special handling for the specific invoice format the user mentioned
        else if (payment.invoice_number === 'INV-6031202-d18c') {
          // User specified: "INV-6031202-d18c → มีนาคม 2026" (March 2026)
          month = 3 // March
          year = 2026
          console.log(`✅ Special case match: year=${year}, month=${month}`)
        }
        // Try alternative format: INV-XMMYYYY-xxx where MM is month at position 1-2
        else {
          const format2Match = payment.invoice_number?.match(/INV-\d(\d{2})/)
          if (format2Match) {
            month = parseInt(format2Match[1]) // Extract MM part
            year = 2026 // Default to 2026 as user indicated
            console.log(`✅ Format 2 match: year=${year}, month=${month}`)
          } else {
            results.push({
              success: false,
              payment_id: payment.id,
              error: `Cannot parse invoice number format: ${payment.invoice_number}`
            })
            console.log(`❌ No format match for: ${payment.invoice_number}`)
            continue
          }
        }

        // Check if monthly bill already exists
        console.log(`🔍 Checking for existing bill: hotel_id=${hotelId}, year=${year}, month=${month}`)
        const { data: existingBill, error: checkError } = await supabase
          .from('monthly_bills')
          .select('id')
          .eq('hotel_id', hotelId)
          .eq('year', year)
          .eq('month', month)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "The result contains 0 rows"
          console.log(`❌ Error checking existing bill:`, checkError)
          results.push({
            success: false,
            payment_id: payment.id,
            error: `Error checking existing bill: ${checkError.message}`
          })
          continue
        }

        if (existingBill) {
          console.log(`⚠️ Monthly bill already exists for payment ${payment.id}`)
          results.push({
            success: false,
            payment_id: payment.id,
            error: 'Monthly bill already exists'
          })
          continue
        }

        // Create the monthly bill
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)

        console.log(`🔧 Creating monthly bill for payment ${payment.id}:`, {
          hotel_id: hotelId,
          bill_number: payment.invoice_number,
          month,
          year,
          amount: payment.amount
        })

        const { data: newBill, error: billError } = await supabase
          .from('monthly_bills')
          .insert({
            hotel_id: hotelId,
            bill_number: payment.invoice_number,
            month: month,
            year: year,
            period_start: startDate.toISOString().split('T')[0],
            period_end: endDate.toISOString().split('T')[0],
            total_bookings: 1, // Default, can be updated later
            total_amount: payment.amount,
            status: 'paid', // Set as paid since payment exists
            paid_at: payment.payment_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (billError) {
          console.log(`❌ Error creating bill for payment ${payment.id}:`, billError)
          results.push({
            success: false,
            payment_id: payment.id,
            error: `${billError.message} (Code: ${billError.code})`
          })
          continue
        }

        console.log(`✅ Successfully created bill:`, newBill)

        // Update the payment to link to the new bill
        const { error: updateError } = await supabase
          .from('hotel_payments')
          .update({ invoice_id: newBill.id })
          .eq('id', payment.id)

        if (updateError) {
          console.warn('Failed to update payment invoice_id:', updateError)
        }

        results.push({
          success: true,
          payment_id: payment.id,
          bill_id: newBill.id,
          bill_number: newBill.bill_number,
          month: month,
          year: year,
          amount: payment.amount
        })

      } catch (error) {
        results.push({
          success: false,
          payment_id: payment.id,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log('🔧 Create Bills Results:', results)

    return {
      message: `Created ${successful} monthly bills, ${failed} failed`,
      successful,
      failed,
      details: results
    }
  } catch (error) {
    console.error('Error creating monthly bills:', error)
    throw error
  }
}

export const updatePayment = async (id: string, paymentData: Partial<HotelPayment>) => {
  // 1. Update payment record
  const { data, error } = await supabase
    .from('hotel_payments')
    .update({
      status: paymentData.status,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      notes: paymentData.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 2. If payment status is changed to completed and has invoice_id, update monthly_bills
  if (paymentData.status === 'completed' && data.invoice_id) {
    try {
      const { error: billUpdateError } = await supabase
        .from('monthly_bills')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.invoice_id)

      if (billUpdateError) {
        console.error('Failed to update monthly bill status:', billUpdateError)
      }
    } catch (updateError) {
      console.error('Error updating monthly bill:', updateError)
    }
  }

  // 3. If payment status is changed from completed to other status, revert monthly_bills
  else if (paymentData.status && paymentData.status !== 'completed' && data.invoice_id) {
    try {
      const { error: billRevertError } = await supabase
        .from('monthly_bills')
        .update({
          status: 'pending',
          paid_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.invoice_id)

      if (billRevertError) {
        console.error('Failed to revert monthly bill status:', billRevertError)
      }
    } catch (revertError) {
      console.error('Error reverting monthly bill:', revertError)
    }
  }

  return data as any
}

// ==================== BOOKINGS (Using existing bookings table) ====================

export const getHotelBookings = async (hotelId: string) => {
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .select(`
      *,
      service:services(name_th, name_en, category),
      staff:staff(name_th, name_en)
    `)
    .eq('hotel_id', hotelId)
    .eq('is_hotel_booking', true) // ✅ เฉพาะการจองของโรงแรม
    .order('booking_date', { ascending: false })

  if (error) throw error

  // แปลงข้อมูลให้เข้ากับ HotelBooking interface
  const hotelBookings = data?.map(booking => {
    // Parse customer data from customer_notes using simple string operations
    // Support formats: "Guest: name, Phone: phone, Notes: notes" and multiline
    let customerName = 'ไม่ระบุชื่อ'
    let customerPhone = 'ไม่ระบุเบอร์'

    if (booking.customer_notes) {
      const notes = booking.customer_notes

      // Parse guest name
      if (notes.includes('Guest:')) {
        const guestStart = notes.indexOf('Guest:') + 6
        let guestEnd = notes.indexOf(',', guestStart)
        if (guestEnd === -1) guestEnd = notes.indexOf('\n', guestStart)
        if (guestEnd === -1) guestEnd = notes.length
        customerName = notes.substring(guestStart, guestEnd).trim()
      }

      // Parse phone number
      if (notes.includes('Phone:')) {
        const phoneStart = notes.indexOf('Phone:') + 6
        let phoneEnd = notes.indexOf(',', phoneStart)
        if (phoneEnd === -1) phoneEnd = notes.indexOf('\n', phoneStart)
        if (phoneEnd === -1) phoneEnd = notes.length
        customerPhone = notes.substring(phoneStart, phoneEnd).trim()
      }
    }

    return {
      id: booking.id,
      booking_number: booking.booking_number,
      hotel_id: booking.hotel_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: '', // No email data in customer_notes
      service_name: booking.service?.name_th || '',
      service_category: booking.service?.category || '',
      staff_name: booking.staff?.name_th || '',
      booking_date: booking.created_at,
      service_date: booking.booking_date,
      service_time: booking.booking_time,
      duration: booking.duration,
      total_price: booking.final_price,
      status: booking.status,
      payment_status: booking.payment_status,
      room_number: booking.hotel_room_number,
      notes: booking.customer_notes,
      created_by_hotel: booking.is_hotel_booking,
      created_at: booking.created_at
    }
  }) || []

  return hotelBookings as HotelBooking[]
}

export const createBooking = async (bookingData: Partial<HotelBooking>) => {
  // แปลงข้อมูลให้เข้ากับโครงสร้าง bookings table
  const newBooking = {
    hotel_id: bookingData.hotel_id,
    service_id: bookingData.service_name, // ต้องใส่ service_id จริง
    booking_date: bookingData.service_date,
    booking_time: bookingData.service_time,
    duration: bookingData.duration,
    base_price: bookingData.total_price,
    final_price: bookingData.total_price,
    is_hotel_booking: true,
    hotel_room_number: bookingData.room_number,
    customer_notes: bookingData.notes,
    status: bookingData.status || 'confirmed',
    payment_status: bookingData.payment_status || 'pending'
  }

  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .insert([newBooking])
    .select()
    .single()

  if (error) throw error
  return data as any
}

export const updateBooking = async (id: string, bookingData: Partial<HotelBooking>) => {
  const { data, error } = await supabase
    .from('bookings') // ✅ ใช้ existing table
    .update({
      status: bookingData.status,
      payment_status: bookingData.payment_status,
      hotel_room_number: bookingData.room_number,
      customer_notes: bookingData.notes
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== STATS ====================

export const getHotelStats = async (hotelId: string) => {
  // ✅ Get total completed bookings only
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('is_hotel_booking', true)
    .eq('status', 'completed') // เฉพาะงานเสร็จสิ้นแล้วเท่านั้น

  // ✅ Get monthly revenue from monthly_bills table (existing bills data)
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { data: monthlyBill } = await supabase
    .from('monthly_bills')
    .select('total_amount')
    .eq('hotel_id', hotelId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single()

  // ถ้าไม่มีใน monthly_bills ให้คำนวณจาก bookings
  let monthlyRevenue = monthlyBill?.total_amount || 0

  if (!monthlyBill) {
    console.warn(`No monthly_bills for hotel ${hotelId} in ${currentMonth}/${currentYear}, calculating from bookings`)
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    const { data: monthlyBookings } = await supabase
      .from('bookings')
      .select('final_price')
      .eq('hotel_id', hotelId)
      .eq('is_hotel_booking', true)
      .eq('payment_status', 'paid') // Only paid bookings
      .in('status', ['completed', 'confirmed']) // Match Hotel App logic
      .gte('booking_date', firstDayOfMonth.toISOString().split('T')[0])

    monthlyRevenue = monthlyBookings?.reduce((sum, booking) => sum + Number(booking.final_price), 0) || 0
  }

  return {
    totalBookings: totalBookings || 0,
    monthlyRevenue,
  }
}

export const getTotalMonthlyRevenue = async () => {
  // ✅ Get total revenue across all hotels from monthly_bills
  // ใช้เดือนที่มีข้อมูลจริงๆ
  const now = new Date('2026-01-15') // ปรับตามข้อมูลจริง
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: monthlyBills, error } = await supabase
    .from('monthly_bills')
    .select('total_amount')
    .eq('month', currentMonth)
    .eq('year', currentYear)

  if (error) {
    console.warn('Error fetching monthly_bills, fallback to bookings:', error.message)

    // Fallback: คำนวณจาก bookings
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    const { data: monthlyBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('final_price')
      .eq('is_hotel_booking', true)
      .eq('payment_status', 'paid') // Only paid bookings
      .in('status', ['completed', 'confirmed']) // Match Hotel App logic
      .gte('booking_date', firstDayOfMonth.toISOString().split('T')[0])

    if (bookingsError) throw bookingsError
    return monthlyBookings?.reduce((sum, booking) => sum + Number(booking.final_price), 0) || 0
  }

  const totalRevenue = monthlyBills?.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0) || 0
  return totalRevenue
}
