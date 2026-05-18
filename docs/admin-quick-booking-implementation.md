# Admin Quick Booking - Implementation Plan

**Updated Analysis Summary:**
- **Difficulty:** 6/10 (reduced from 7/10)  
- **Time Estimate:** 20-25 hours (reduced from 25-35 hours)
- **Key Changes:** No payment processing, just record keeping + Admin super privileges

## Phase 2: UI Components Development (4-5 hours)

### 2.1 Main Quick Booking Page
```typescript
// apps/admin/src/pages/QuickBooking/index.tsx
export default function QuickBooking() {
  const [step, setStep] = useState(1) // 1-5 steps
  const [bookingData, setBookingData] = useState({})
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <BookingProgress currentStep={step} />
      
      {/* Step content */}
      {step === 1 && <CustomerSearch onNext={setCustomer} />}
      {step === 2 && <ServiceSelection onNext={setServices} />}
      {step === 3 && <StaffAssignment onNext={setStaff} />}
      {step === 4 && <PaymentProcessing onNext={setPayment} />}
      {step === 5 && <BookingConfirmation booking={bookingData} />}
    </div>
  )
}
```

### 2.2 Customer Search Component
```typescript
// apps/admin/src/pages/QuickBooking/CustomerSearch.tsx
export default function CustomerSearch({ onNext }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)

  const searchCustomers = async (query: string) => {
    // Search by phone, email, or name
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`phone.ilike.%${query}%,email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10)
    
    setSearchResults(data || [])
  }

  return (
    <div className="space-y-6">
      <h2>ค้นหาลูกค้า</h2>
      
      {/* Search input */}
      <SearchInput 
        placeholder="เบอร์โทร, อีเมล, หรือชื่อ"
        onSearch={searchCustomers}
      />
      
      {/* Search results */}
      <CustomerResults 
        customers={searchResults}
        onSelect={onNext}
      />
      
      {/* Create new customer */}
      <Button onClick={() => setShowCreateForm(true)}>
        เพิ่มลูกค้าใหม่
      </Button>
      
      {showCreateForm && (
        <CreateCustomerForm onSubmit={onNext} />
      )}
    </div>
  )
}
```

### 2.3 Service Selection Component
```typescript
// apps/admin/src/pages/QuickBooking/ServiceSelection.tsx
export default function ServiceSelection({ customer, onNext }) {
  const [selectedServices, setSelectedServices] = useState([])
  const [addOns, setAddOns] = useState([])
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [totalPrice, setTotalPrice] = useState(0)

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => supabase.from('services').select('*').eq('status', 'active')
  })

  const calculatePrice = () => {
    // Real-time price calculation
    const basePrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
    const addOnPrice = addOns.reduce((sum, a) => sum + a.price, 0)
    const customerDiscount = calculateCustomerDiscount(customer, selectedServices)
    const codeDiscount = appliedDiscount ? appliedDiscount.amount : 0
    
    return Math.max(0, basePrice + addOnPrice - customerDiscount - codeDiscount)
  }

  const applyDiscountCode = async (code) => {
    try {
      const discount = await validateDiscountCode(code)
      if (discount.valid) {
        setAppliedDiscount(discount)
        setTotalPrice(calculatePrice())
      } else {
        alert('โค้ดส่วนลดไม่ถูกต้อง')
      }
    } catch (error) {
      alert('ไม่สามารถตรวจสอบโค้ดส่วนลดได้')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Service selection */}
      <div>
        <h3>เลือกบริการ</h3>
        <ServiceCategories 
          services={services}
          selected={selectedServices}
          onSelect={setSelectedServices}
        />
        
        <h3>บริการเสริม</h3>
        <AddOnsList 
          addOns={addOns}
          onSelect={setAddOns}
        />
        
        {/* Discount Code */}
        <div className="mt-6">
          <h4>โค้ดส่วนลด</h4>
          <div className="flex gap-2">
            <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="กรอกโค้ดส่วนลด"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button 
              onClick={() => applyDiscountCode(discountCode)}
              disabled={!discountCode}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              ใช้
            </button>
          </div>
          {appliedDiscount && (
            <div className="text-green-600 text-sm mt-1">
              ✓ ส่วนลด: {appliedDiscount.name} (-{appliedDiscount.amount} บาท)
            </div>
          )}
        </div>
      </div>
      
      {/* Price summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <PriceSummary
          services={selectedServices}
          addOns={addOns}
          total={totalPrice}
          customer={customer}
        />
        
        <Button onClick={() => onNext({ selectedServices, addOns, totalPrice })}>
          ดำเนินการต่อ
        </Button>
      </div>
    </div>
  )
}
```

## Phase 3: Customer Management (5-6 hours)

### 3.1 Customer Search API
```typescript
// packages/supabase/src/services/customerService.ts
export const customerService = {
  async searchCustomers(query: string) {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        bookings(count)
      `)
      .or(`
        phone.ilike.%${query}%,
        email.ilike.%${query}%,
        name.ilike.%${query}%
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return data
  },

  async createCustomer(customerData: CustomerInput) {
    // Validate phone number format
    const phone = validatePhoneNumber(customerData.phone)
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...customerData,
        phone,
        created_by_admin: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

### 3.2 Customer Profile Enhancement
```sql
-- Add admin-specific customer fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS
  created_by_admin BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  preferred_contact_method TEXT DEFAULT 'phone',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  last_admin_booking TIMESTAMP;
```

## Phase 4: Staff Assignment Logic (4-5 hours)

### 4.1 Auto-Assignment Algorithm
```typescript
// apps/admin/src/services/staffAssignment.ts
export class StaffAssignmentService {
  
  async getAvailableStaff(serviceIds: string[], dateTime: DateTime) {
    const { data: staff } = await supabase
      .from('staff')
      .select(`
        *,
        profiles!inner(full_name, avatar_url),
        staff_skills!inner(service_id),
        bookings!left(id, booking_date, booking_time, status)
      `)
      .eq('status', 'active')
      .in('staff_skills.service_id', serviceIds)

    // Filter by availability
    return staff.filter(s => this.isAvailable(s, dateTime))
  }

  async autoAssignStaff(
    serviceIds: string[], 
    dateTime: DateTime,
    customerLocation?: { lat: number, lng: number }
  ) {
    const availableStaff = await this.getAvailableStaff(serviceIds, dateTime)
    
    // Scoring algorithm
    const scoredStaff = availableStaff.map(staff => ({
      staff,
      score: this.calculateStaffScore(staff, {
        serviceMatch: this.getServiceMatchScore(staff, serviceIds),
        availability: this.getAvailabilityScore(staff, dateTime),
        workload: this.getWorkloadScore(staff, dateTime),
        proximity: this.getProximityScore(staff, customerLocation),
        rating: staff.rating || 0
      })
    }))

    // Return highest scored staff
    return scoredStaff.sort((a, b) => b.score - a.score)[0]?.staff
  }

  private calculateStaffScore(staff: Staff, factors: ScoreFactors): number {
    return (
      factors.serviceMatch * 0.3 +
      factors.availability * 0.25 + 
      factors.workload * 0.2 +
      factors.proximity * 0.15 +
      factors.rating * 0.1
    )
  }
}
```

### 4.2 Manual Assignment UI
```typescript
// apps/admin/src/pages/QuickBooking/StaffAssignment.tsx
export default function StaffAssignment({ booking, onNext }) {
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [availableStaff, setAvailableStaff] = useState([])

  const handleAutoAssign = async () => {
    const staff = await staffAssignmentService.autoAssignStaff(
      booking.serviceIds,
      booking.dateTime,
      booking.customerLocation
    )
    setSelectedStaff(staff)
  }

  return (
    <div className="space-y-6">
      {/* Assignment mode toggle */}
      <TabGroup value={assignmentMode} onChange={setAssignmentMode}>
        <Tab value="auto">กำหนดอัตโนมัติ</Tab>
        <Tab value="manual">เลือกเอง</Tab>
      </TabGroup>

      {assignmentMode === 'auto' ? (
        <AutoAssignment onAssign={handleAutoAssign} />
      ) : (
        <ManualAssignment 
          staff={availableStaff}
          selected={selectedStaff}
          onSelect={setSelectedStaff}
        />
      )}

      {/* Selected staff preview */}
      {selectedStaff && (
        <StaffPreview 
          staff={selectedStaff}
          onConfirm={() => onNext(selectedStaff)}
        />
      )}
    </div>
  )
}
```

## Phase 5: Payment Method Recording (2-3 hours)

### 5.1 Payment Method Selection Component  
```typescript
// apps/admin/src/pages/QuickBooking/PaymentMethodRecording.tsx
export default function PaymentMethodRecording({ booking, onNext }) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  const paymentMethods = [
    { value: 'cash', label: 'เงินสด' },
    { value: 'bank_transfer', label: 'โอนเงิน' },
    { value: 'credit_card', label: 'บัตรเครดิต' },
    { value: 'promptpay', label: 'PromptPay' },
    { value: 'voucher', label: 'คูปอง/เครดิต' },
    { value: 'other', label: 'อื่นๆ' }
  ]

  const recordPayment = () => {
    // No actual payment processing - just record for analytics
    const paymentRecord = {
      method: paymentMethod,
      amount: booking.totalAmount,
      notes: paymentNotes,
      recorded_by_admin: true
    }
    
    onNext(paymentRecord)
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2>บันทึกช่องทางชำระเงิน</h2>
      
      {/* Payment summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">สรุปยอด</h3>
        <div className="text-2xl font-bold text-green-600">
          ฿{booking.totalAmount?.toLocaleString()}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          ⚠️ ระบบไม่ประมวลผลการชำระเงิน<br/>
          แค่บันทึกช่องทางสำหรับสถิติและรายงาน
        </p>
      </div>
      
      {/* Payment method selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          ลูกค้าจ่าย ผ่านช่องทางไหน?
        </label>
        <select 
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {paymentMethods.map(method => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">หมายเหตุ (ถ้ามี)</label>
        <textarea
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          placeholder="เช่น: จ่ายเงินสด 3000 บาท ทอนเงิน 500 บาท"
          className="w-full px-3 py-2 border rounded-lg resize-none"
          rows={3}
        />
      </div>
      
      <button
        onClick={recordPayment}
        className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium"
      >
        บันทึกและดำเนินการต่อ
      </button>
    </div>
  )
}
```

## Phase 6: Integration & Testing (4-6 hours)

### 6.1 API Integration
```typescript
// apps/admin/src/services/adminBookingService.ts
export const adminBookingService = {
  async createBooking(bookingData: AdminBookingInput) {
    // Create booking with admin context
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        created_by_admin_id: getCurrentAdmin().id,
        booking_source: 'admin_app',
        status: 'pending_staff_confirmation', // Staff must accept first
        payment_method_recorded: bookingData.paymentMethod,
        discount_code_applied: bookingData.discountCode,
        admin_notes: bookingData.notes,
        admin_override_restrictions: bookingData.hasTimeOverride || false
      })
      .select()
      .single()

    if (error) throw error

    // Calculate and record earnings (same as customer bookings)
    await recordBookingEarnings(booking.id, booking.total_amount)

    // Notify assigned staff  
    await notifyStaff(booking.staff_id, booking.id, 'admin')
    
    // Log admin action
    await logAdminAction('admin_booking_created', {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      total_amount: booking.total_amount,
      payment_method: bookingData.paymentMethod
    })
    
    return booking
  },

  async notifyStaff(staffId: string, bookingId: string, source: string = 'customer') {
    const isAdminBooking = source === 'admin'
    
    // Send notification to staff app
    await notificationService.send({
      to: staffId,
      type: 'new_booking_assigned',
      title: isAdminBooking ? '📋 งานใหม่จาก Admin' : '📱 งานใหม่จากลูกค้า',
      body: isAdminBooking 
        ? 'มีการจองใหม่ผ่าน Admin ที่ต้องการการยืนยัน'
        : 'มีการจองใหม่ที่ต้องการการยืนยัน',
      data: { 
        bookingId,
        source,
        isAdminBooking 
      }
    })

    // Also send LINE notification for admin bookings (higher priority)
    if (isAdminBooking) {
      await lineNotificationService.send({
        to: staffId,
        message: `🔥 งานด่วนจาก Admin!\n\nมีการจองใหม่ที่ต้องรับงานใน Staff App`
      })
    }
  }
}
```

### 6.2 Staff App Integration
```typescript
// apps/staff/src/components/AdminBookingNotification.tsx
export default function AdminBookingNotification({ booking }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <AdminIcon className="w-5 h-5 text-blue-600" />
        <span className="text-blue-800 font-medium">จองผ่าน Admin</span>
      </div>
      
      <div className="text-sm text-blue-700">
        <p>ลูกค้า: {booking.customerName}</p>
        <p>บริการ: {booking.serviceName}</p>
        <p>เวลา: {booking.bookingTime}</p>
        <p>Admin: {booking.createdBy}</p>
      </div>
      
      {/* Accept/Reject buttons */}
      <div className="flex gap-2 mt-4">
        <Button onClick={() => acceptBooking(booking.id)}>
          รับงาน
        </Button>
        <Button variant="outline" onClick={() => rejectBooking(booking.id)}>
          ปฏิเสธ
        </Button>
      </div>
    </div>
  )
}
```

## Success Criteria & Testing

### Functional Testing
- [ ] Admin can search/create customers successfully
- [ ] Service selection calculates prices correctly
- [ ] Discount codes work (same as customer app)
- [ ] Admin can bypass time restrictions
- [ ] Staff assignment works (auto + manual)
- [ ] Payment method recording (no actual processing)
- [ ] Staff receives notifications properly (with admin badge)
- [ ] Staff can accept/reject admin bookings (same workflow)
- [ ] Booking flows through normal staff workflow
- [ ] GPS tracking works for admin bookings  
- [ ] Revenue and earnings calculated correctly

### Performance Testing
- [ ] Customer search responds < 500ms
- [ ] Booking creation completes < 2 seconds
- [ ] System handles 10 concurrent admin bookings

### Security Testing  
- [ ] Only authorized admins can access
- [ ] Customer data is protected
- [ ] Payment data is secure
- [ ] Audit logs are created properly

### User Acceptance Testing
- [ ] Admin workflow is intuitive
- [ ] Error messages are helpful
- [ ] Edge cases are handled gracefully
- [ ] Staff experience is unchanged