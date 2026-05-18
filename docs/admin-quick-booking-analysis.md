# Admin Quick Booking - Detailed Analysis

## User Stories

### Primary User Story
**As an Admin**, I want to create bookings for customers who call or walk-in, so that they can receive services without using the customer app.

### Acceptance Criteria
- [ ] Admin can search existing customers or create new ones
- [ ] Admin can select services and add-ons with real-time pricing
- [ ] Admin can apply discount codes (same system as customer app)
- [ ] Admin can assign staff automatically or manually
- [ ] Admin can record payment method (no actual payment processing)
- [ ] Staff receives notification and can accept/reject the booking (same as customer bookings)
- [ ] Booking flows through normal staff workflow (GPS tracking, completion)
- [ ] Revenue and earnings are calculated normally for reports
- [ ] All data is consistent with customer app bookings

## Admin Super User Privileges

### Time Restrictions Override
```
Admin can bypass ALL customer restrictions:
- No 3-hour advance booking requirement
- No 2-week advance booking limit  
- Can book immediately (same-time booking)
- Can book far future dates
- Can backdate bookings if needed

Admin has emergency booking powers:
- Force assign staff even if "unavailable"
- Override daily service quotas
- Book outside business hours
```

### Validation Differences
```
Customer App: Hard validation blocks (cannot proceed)
Admin App: Warning messages only (can proceed anyway)
         
Example: "Staff appears busy at this time - continue anyway?"
```

## Workflow Design

### 1. Customer Identification
```
Admin Input:
- Phone number OR
- Name + phone OR  
- Email

System Actions:
- Search existing customers
- If found: load profile + booking history
- If not found: show "create new customer" form
- Validate customer data
```

### 2. Service Selection
```
Admin Interface:
- Service category selection
- Individual service selection  
- Add-ons selection
- Discount code input field (same system as customer app)
- Duration adjustment
- Special requests/notes

System Actions:
- Real-time price calculation
- Discount code validation and application
- Availability checking
- Final total calculation with discounts
```

### 3. Staff Assignment
```
Options:
A) Auto-assignment based on:
   - Staff availability
   - Service expertise
   - Location proximity
   - Current workload

B) Manual assignment:
   - Show available staff list
   - Admin selects specific staff
   - Override availability if needed (emergency booking)
```

### 4. Payment Method Recording
```
Payment Methods (Record Only - No Processing):
- Cash (เงินสด)
- Bank transfer (โอนเงิน)  
- Credit card (บัตรเครดิต)
- PromptPay
- Voucher/Credit (คูปอง)
- Other (อื่นๆ)

Admin Actions:
- Select payment method from dropdown
- Add notes if needed
- Save booking with payment info for revenue tracking

Note: NO actual payment processing - just data recording for reports
Revenue and staff earnings are calculated normally from booking amounts
```

### 5. Staff Notification & Workflow
```
System Actions:
- Create booking in database with status 'pending_staff_confirmation'
- Notify assigned staff via LINE/in-app notification
- Staff can accept/reject (SAME workflow as customer bookings)
- If rejected: auto-assign next available staff OR admin manually reassign
- Once accepted: status changes to 'confirmed'
- Normal workflow continues (GPS tracking, service delivery, completion)

Note: Admin bookings do NOT auto-confirm - staff must accept first
```

## Data Model Extensions

### Customer Table Updates
```sql
-- Add admin-created customer support
ALTER TABLE customers ADD COLUMN 
  created_by_admin BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  preferred_contact_method TEXT;
```

### Booking Table Updates  
```sql
-- Add admin booking support
ALTER TABLE bookings ADD COLUMN
  created_by_admin_id UUID REFERENCES profiles(id),
  booking_source TEXT DEFAULT 'customer_app', -- 'admin_app', 'customer_app'  
  admin_notes TEXT,
  payment_method_recorded TEXT, -- 'cash', 'transfer', 'credit_card', 'promptpay', 'voucher', 'other'
  admin_override_restrictions BOOLEAN DEFAULT FALSE, -- Track if admin bypassed rules
  discount_code_applied TEXT; -- Store applied discount code
```

### New Table: Admin Booking Logs
```sql
CREATE TABLE admin_booking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  admin_id UUID REFERENCES profiles(id),
  action TEXT, -- 'created', 'modified', 'cancelled'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### Permission Model
```
Admin Permissions:
- admin.bookings.create
- admin.bookings.read_all  
- admin.customers.create
- admin.customers.search
- admin.payments.process

Staff Permissions:
- staff.bookings.read_assigned
- staff.bookings.accept_reject
- (no change from current)
```

### RLS Policies
```sql
-- Admin can see all bookings they create
CREATE POLICY "Admin can manage their bookings" ON bookings
  FOR ALL TO authenticated
  USING (created_by_admin_id = auth.uid());

-- Staff can see admin-created bookings assigned to them  
CREATE POLICY "Staff can see admin bookings" ON bookings
  FOR SELECT TO authenticated  
  USING (staff_id = auth.uid());
```

## Technical Architecture

### Frontend Structure
```
apps/admin/src/pages/
├── QuickBooking/
│   ├── index.tsx           # Main quick booking page
│   ├── CustomerSearch.tsx  # Search/create customer
│   ├── ServiceSelection.tsx # Select services + pricing
│   ├── StaffAssignment.tsx # Assign staff
│   ├── PaymentProcessing.tsx # Handle payment
│   └── BookingConfirmation.tsx # Success page
```

### API Endpoints
```
POST /api/admin/bookings
GET /api/admin/customers/search?q={query}
POST /api/admin/customers
POST /api/admin/bookings/{id}/assign-staff
POST /api/admin/payments/process
```

### Integration Points
```
1. Customer App Booking Flow
   ↓ 
2. Admin Quick Booking Flow
   ↓
3. Staff Assignment System
   ↓  
4. Staff App Notification
   ↓
5. Staff Workflow (GPS, Service, Completion)
   ↓
6. Payment & Receipt Generation
```

## Success Metrics

### Performance KPIs
- Time to create booking: < 3 minutes
- Customer search response: < 500ms
- Staff assignment success rate: > 95%
- System availability: > 99.5%

### Business KPIs  
- Admin booking volume vs customer app
- Revenue from admin bookings
- Customer satisfaction for admin bookings
- Staff acceptance rate for admin bookings

### Quality KPIs
- Data accuracy (admin vs customer bookings)
- Error rate in admin bookings
- Support tickets related to admin bookings