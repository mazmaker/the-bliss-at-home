# 📋 Hotel App - Extend Session Feature Implementation Guide

**Version:** 1.0
**Date:** 2026-03-24
**Status:** ✅ Approved for Implementation

---

## 🎯 **Quick Start**

### **Development Priority:**
1. **Database Schema** → Migration files
2. **Core Business Logic** → Extension functions
3. **UI Components** → Modal workflow
4. **Integration** → Notifications & real-time updates

### **Key Decisions Confirmed:**
- ✅ **Payment Method:** Hotel Account (paid ทันที)
- ✅ **Staff Assignment:** Original staff priority + fallback
- ✅ **Extension Type:** Add additional service (ไม่ใช่ extend duration)
- ✅ **Duration Options:** ใช้จาก service package (60/90/120)

---

## 📊 **Database Migration (PRIORITY 1)**

### **Create Migration File:**
```bash
# สร้างไฟล์ migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_extend_session_support.sql
```

### **Migration Content:**
```sql
-- Hotel App: Extend Session Feature Support
-- Add support for booking extensions

-- Add extension tracking to booking_services
ALTER TABLE booking_services
ADD COLUMN is_extension BOOLEAN DEFAULT FALSE,
ADD COLUMN extended_at TIMESTAMP NULL,
ADD COLUMN original_booking_service_id UUID NULL;

-- Add extension summary to bookings
ALTER TABLE bookings
ADD COLUMN extension_count INTEGER DEFAULT 0,
ADD COLUMN last_extended_at TIMESTAMP NULL,
ADD COLUMN total_extensions_price DECIMAL(10,2) DEFAULT 0;

-- Add foreign key constraint
ALTER TABLE booking_services
ADD CONSTRAINT fk_booking_services_original
FOREIGN KEY (original_booking_service_id)
REFERENCES booking_services(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_booking_services_extension ON booking_services(booking_id, is_extension);
CREATE INDEX idx_booking_services_original ON booking_services(original_booking_service_id) WHERE original_booking_service_id IS NOT NULL;
CREATE INDEX idx_bookings_extension_count ON bookings(extension_count) WHERE extension_count > 0;
CREATE INDEX idx_bookings_last_extended ON bookings(last_extended_at) WHERE last_extended_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN booking_services.is_extension IS 'True if this service is an extension of original booking';
COMMENT ON COLUMN booking_services.extended_at IS 'Timestamp when this extension was added';
COMMENT ON COLUMN booking_services.original_booking_service_id IS 'Reference to original booking service that was extended';
COMMENT ON COLUMN bookings.extension_count IS 'Number of times this booking has been extended';
COMMENT ON COLUMN bookings.last_extended_at IS 'Timestamp of most recent extension';
COMMENT ON COLUMN bookings.total_extensions_price IS 'Total price of all extensions';

-- Create function to update booking totals when extension is added
CREATE OR REPLACE FUNCTION update_booking_extension_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an extension
  IF NEW.is_extension = TRUE THEN
    UPDATE bookings
    SET
      extension_count = extension_count + 1,
      last_extended_at = NEW.extended_at,
      total_extensions_price = total_extensions_price + NEW.price,
      final_price = final_price + NEW.price,
      updated_at = NOW()
    WHERE id = NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_booking_extension_totals
  AFTER INSERT ON booking_services
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_extension_totals();
```

---

## 📁 **File Structure**

### **New Files to Create:**
```
apps/hotel/src/
├── components/
│   ├── ExtendSessionButton.tsx      # ปุ่มเพิ่มเวลา
│   ├── ExtendSessionModal.tsx       # Modal เลือกเวลา
│   └── BookingExtensionsDisplay.tsx # แสดงรายการ extensions
├── hooks/
│   ├── useExtendSession.ts          # Hook สำหรับ extend session
│   └── useStaffAvailability.ts      # Check staff availability
├── services/
│   ├── extendSessionService.ts      # Business logic
│   └── staffAssignmentService.ts    # Staff assignment logic
└── types/
    └── extendSession.ts             # TypeScript types
```

---

## ⚙️ **Core Implementation**

### **1. Types Definition (START HERE):**
```typescript
// apps/hotel/src/types/extendSession.ts
export interface ExtendSessionRequest {
  bookingId: string;
  additionalDuration: number; // 60, 90, 120
  notes?: string;
}

export interface ExtensionOption {
  duration: number;
  price: number;
  totalNewDuration: number;
  totalNewPrice: number;
  isAvailable: boolean;
}

export interface StaffAssignmentResult {
  assignedStaffId: string;
  isOriginalStaff: boolean;
  reason: string;
  alternativeOptions?: Staff[];
}

export interface ExtendSessionResponse {
  success: boolean;
  newBookingService: BookingService;
  staffAssignment: StaffAssignmentResult;
  newTotalPrice: number;
  newTotalDuration: number;
  estimatedEndTime: Date;
}
```

### **2. Service Layer (PRIORITY 2):**
```typescript
// apps/hotel/src/services/extendSessionService.ts
import { supabase } from '@bliss/supabase/auth';
import { ExtendSessionRequest, ExtendSessionResponse } from '../types/extendSession';

export async function extendBookingSession(
  request: ExtendSessionRequest
): Promise<ExtendSessionResponse> {

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ไม่ได้ล็อกอิน');

  // 1. Validate request
  await validateExtensionRequest(request.bookingId);

  // 2. Calculate price
  const extensionPrice = await calculateExtensionPrice(
    request.bookingId,
    request.additionalDuration
  );

  // 3. Assign staff
  const staffAssignment = await assignStaffForExtension(
    request.bookingId,
    request.additionalDuration
  );

  // 4. Create extension service
  const { data: newBookingService, error } = await supabase
    .from('booking_services')
    .insert({
      booking_id: request.bookingId,
      service_id: await getOriginalServiceId(request.bookingId),
      duration: request.additionalDuration,
      price: extensionPrice,
      recipient_index: await getOriginalRecipientIndex(request.bookingId),
      recipient_name: await getOriginalRecipientName(request.bookingId),
      sort_order: await getNextSortOrder(request.bookingId),
      is_extension: true,
      extended_at: new Date().toISOString(),
      original_booking_service_id: await getOriginalBookingServiceId(request.bookingId)
    })
    .select()
    .single();

  if (error) throw error;

  // 5. Send notifications
  await notifyStaffAboutExtension(
    staffAssignment.assignedStaffId,
    request.bookingId,
    request.additionalDuration
  );

  return {
    success: true,
    newBookingService,
    staffAssignment,
    newTotalPrice: await calculateNewTotalPrice(request.bookingId),
    newTotalDuration: await calculateNewTotalDuration(request.bookingId),
    estimatedEndTime: await calculateNewEndTime(request.bookingId)
  };
}

async function calculateExtensionPrice(
  bookingId: string,
  additionalDuration: number
): Promise<number> {
  // Get original booking service
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_services!inner (
        service_id,
        services (*)
      )
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) throw new Error('ไม่พบการจอง');

  const service = booking.booking_services[0].services;

  // Calculate price based on duration
  let basePrice: number;
  switch(additionalDuration) {
    case 60:  basePrice = service.price_60 || (service.base_price * 0.5); break;
    case 90:  basePrice = service.price_90 || (service.base_price * 0.75); break;
    case 120: basePrice = service.price_120 || service.base_price; break;
    default:  basePrice = (service.base_price / service.duration) * additionalDuration;
  }

  // Apply hotel discount (20% off)
  return Math.floor(basePrice * 0.8);
}
```

### **3. React Hook (PRIORITY 3):**
```typescript
// apps/hotel/src/hooks/useExtendSession.ts
import { useState } from 'react';
import { extendBookingSession } from '../services/extendSessionService';
import { ExtendSessionRequest } from '../types/extendSession';

export function useExtendSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extendSession = async (request: ExtendSessionRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await extendBookingSession(request);

      // Success feedback
      if (typeof window !== 'undefined') {
        // Show success toast/notification
        alert(`เพิ่มเวลาสำเร็จ! เวลารวม: ${result.newTotalDuration} นาที`);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(message);

      // Error feedback
      if (typeof window !== 'undefined') {
        alert(`ไม่สามารถเพิ่มเวลาได้: ${message}`);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    extendSession,
    loading,
    error,
    clearError: () => setError(null)
  };
}
```

---

## 🎨 **UI Components (PRIORITY 4)**

### **ExtendSessionButton:**
```typescript
// apps/hotel/src/components/ExtendSessionButton.tsx
import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { ExtendSessionModal } from './ExtendSessionModal';
import { Booking } from '../types/booking';

interface Props {
  booking: Booking;
  onExtended?: () => void;
}

export function ExtendSessionButton({ booking, onExtended }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Check if extension is allowed
  const canExtend =
    booking.status === 'confirmed' &&
    booking.extension_count < 3;

  const handleExtensionComplete = () => {
    setShowModal(false);
    onExtended?.();
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!canExtend}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
          ${canExtend
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        <Plus className="w-4 h-4" />
        เพิ่มเวลาบริการ
      </button>

      {showModal && (
        <ExtendSessionModal
          booking={booking}
          onConfirm={handleExtensionComplete}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
```typescript
// apps/hotel/src/services/__tests__/extendSessionService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { extendBookingSession } from '../extendSessionService';

describe('extendBookingSession', () => {
  it('should calculate correct price for 60-minute extension', async () => {
    // Mock data and test price calculation
  });

  it('should assign original staff when available', async () => {
    // Test staff assignment logic
  });

  it('should find alternative staff when original is unavailable', async () => {
    // Test fallback staff assignment
  });

  it('should reject extension when max extensions reached', async () => {
    // Test business rule validation
  });
});
```

### **Integration Tests:**
```typescript
// apps/hotel/src/__tests__/extendSession.integration.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExtendSessionButton } from '../components/ExtendSessionButton';

describe('Extend Session Integration', () => {
  it('should complete full extend session workflow', async () => {
    // Test complete user workflow
  });
});
```

---

## 📋 **Next Steps (Implementation Order)**

### **Week 1: Foundation**
1. **Day 1-2:** Create migration file และ run migration
2. **Day 3-4:** สร้าง TypeScript types และ service functions
3. **Day 5:** Unit tests สำหรับ business logic

### **Week 2: Core Features**
1. **Day 1-2:** React hooks และ UI components
2. **Day 3-4:** Staff assignment algorithm
3. **Day 5:** Integration testing

### **Week 3: Polish & Integration**
1. **Day 1-2:** Error handling และ validation
2. **Day 3-4:** Notification system
3. **Day 5:** End-to-end testing

### **Week 4: Deployment**
1. **Day 1-2:** Production testing
2. **Day 3:** Deploy to staging
3. **Day 4-5:** Deploy to production และ monitoring

---

## 🔧 **Development Commands**

```bash
# สร้าง migration
pnpm db:migration:create add_extend_session_support

# Run migration
pnpm db:migration:up

# Run tests
pnpm test:hotel

# Start development
pnpm dev:hotel

# Type checking
pnpm typecheck
```

---

## 📊 **Monitoring & Analytics**

### **Key Metrics to Track:**
```typescript
// Analytics events to implement
analytics.track('extension_requested', { bookingId, duration, hotelId });
analytics.track('extension_completed', { bookingId, price, staffId });
analytics.track('extension_failed', { bookingId, reason, error });
```

### **Dashboard KPIs:**
- Extension adoption rate per hotel
- Average extension revenue per booking
- Staff utilization efficiency
- Customer satisfaction scores

---

## ✅ **Definition of Done**

### **Feature Complete When:**
- [x] Database schema updated
- [x] Core business logic implemented
- [x] UI components functional
- [x] Staff notifications working
- [x] Error handling comprehensive
- [x] Tests passing (>80% coverage)
- [x] Documentation updated
- [x] Production deployment successful

---

**🚀 Ready to Start Implementation!**

**Next Action:** Create migration file และเริ่ม implementation ตาม priority order

---

**Document Status:** ✅ Approved
**Implementation Start Date:** 2026-03-24
**Expected Completion:** 2026-04-21 (4 weeks)