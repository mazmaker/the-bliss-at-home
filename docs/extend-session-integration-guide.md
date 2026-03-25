# 🔧 Extend Session Integration Guide

**วิธีการ integrate Extend Session components ใน existing pages**

---

## 📋 **Step 1: Import Components**

```typescript
// ใน existing booking pages
import { ExtendSessionButton } from '../components/ExtendSessionButton';
import { BookingCard } from '../components/BookingCard'; // ถ้าต้องการใช้
import { useExtendSession } from '../hooks/useExtendSession';
```

---

## 🎯 **Step 2: Integration Examples**

### **2.1 BookingHistory.tsx Integration:**

```typescript
// เพิ่มใน BookingHistory component
import { ExtendSessionButton } from '../components/ExtendSessionButton';

// ใน render function ของแต่ละ booking card:
<div className="booking-actions">
  {/* Existing buttons */}
  <button onClick={() => viewBooking(booking)}>View</button>
  <button onClick={() => editBooking(booking)}>Edit</button>

  {/* 🆕 Add Extend Button */}
  {['confirmed', 'in_progress'].includes(booking.status) && (
    <ExtendSessionButton
      booking={booking}
      onExtended={() => {
        // Refresh booking list
        refetchBookings();
      }}
      size="sm"
    />
  )}
</div>
```

### **2.2 GuestBookings.tsx Integration:**

```typescript
// ใช้ BookingCard component ที่มี extend session built-in
import { BookingCard } from '../components/BookingCard';

// ใน render function:
{bookings.map((booking) => (
  <BookingCard
    key={booking.id}
    booking={booking}
    onExtended={() => refetchBookings()}
    onView={(booking) => setSelectedBooking(booking)}
    onEdit={(booking) => setEditingBooking(booking)}
    showExtendButton={true}
  />
))}
```

### **2.3 Booking Detail Page Integration:**

```typescript
// ใน booking detail page
import { ExtendSessionButton } from '../components/ExtendSessionButton';
import { useExtendSession, useExtensionStatus } from '../hooks/useExtendSession';

function BookingDetail({ bookingId }: { bookingId: string }) {
  const { data: booking, refetch } = useQuery(['booking', bookingId], () =>
    getBookingById(bookingId)
  );

  const extensionStatus = useExtensionStatus(booking);

  return (
    <div className="booking-detail">
      {/* Booking info */}
      <div className="booking-header">
        <h1>{booking.booking_number}</h1>
        <div className="booking-status">{booking.status}</div>
      </div>

      {/* Extension info */}
      {extensionStatus.hasExtensions && (
        <div className="extension-summary">
          <h3>ประวัติการขยายเวลา</h3>
          <p>ขยายเวลา: {extensionStatus.extensionCount} ครั้ง</p>
          <p>ค่าใช้จ่ายเพิ่ม: ฿{extensionStatus.totalExtensionPrice}</p>
          <p>ครั้งล่าสุด: {extensionStatus.lastExtendedAt}</p>
        </div>
      )}

      {/* Services list with extensions */}
      <div className="services-list">
        {booking.booking_services?.map((service, index) => (
          <div
            key={service.id}
            className={`service-item ${service.is_extension ? 'extension' : 'original'}`}
          >
            <span className="service-number">
              {service.is_extension ? `+${index}` : index + 1}
            </span>
            <span className="service-name">{service.service_name}</span>
            <span className="service-duration">{service.duration} นาที</span>
            <span className="service-price">฿{service.price}</span>
            {service.is_extension && (
              <span className="extension-badge">เพิ่มเติม</span>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="booking-actions">
        <ExtendSessionButton
          booking={booking}
          onExtended={() => refetch()}
          size="lg"
        />
      </div>
    </div>
  );
}
```

---

## 🎨 **Step 3: CSS Styling**

```css
/* เพิ่มใน CSS file */
.service-item.extension {
  background-color: #fef3e2; /* amber-50 */
  border-left: 4px solid #f59e0b; /* amber-500 */
  padding-left: 12px;
}

.extension-badge {
  background-color: #f59e0b;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.extension-summary {
  background-color: #f3f4f6; /* gray-100 */
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}
```

---

## 🔄 **Step 4: Data Fetching Updates**

### **4.1 Update Booking Queries:**

```typescript
// ใน existing query functions
const getBookingsWithExtensions = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_services (
        *,
        services (name_th, name_en)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Update existing useQuery
const { data: bookings, refetch } = useQuery(
  ['bookings', hotelId],
  () => getBookingsWithExtensions(),
  {
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  }
);
```

### **4.2 Real-time Subscriptions:**

```typescript
// เพิ่ม real-time subscription สำหรับ booking updates
useEffect(() => {
  const subscription = supabase
    .channel('booking-extensions')
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_services',
        filter: 'is_extension=eq.true'
      },
      (payload) => {
        console.log('Extension added:', payload);
        refetchBookings(); // Refresh booking list
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

---

## 🧪 **Step 5: Testing Integration**

### **5.1 Manual Testing Checklist:**

```
✅ Booking list แสดง extend button เฉพาะ confirmed/in_progress bookings
✅ Click extend button เปิด modal ได้
✅ Modal แสดง extension options ถูกต้อง
✅ เลือกเวลาและ confirm extension ได้
✅ Booking list refresh หลัง extend สำเร็จ
✅ Extension data แสดงใน booking detail
✅ Extension count และ total price อัพเดทถูกต้อง
✅ ไม่สามารถ extend เกิน 3 ครั้ง
```

### **5.2 Console Testing:**

```javascript
// ใน browser console
// Test extend session API
const testExtension = async () => {
  const response = await fetch('/api/bookings/BOOKING_ID/extend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      additionalDuration: 60,
      notes: 'Test extension'
    })
  });
  console.log(await response.json());
};
```

---

## 📱 **Step 6: Mobile Responsiveness**

```typescript
// สำหรับ mobile view
<div className="booking-card-mobile">
  {/* Stack buttons vertically on mobile */}
  <div className="actions-mobile flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
    <button>View</button>
    <button>Edit</button>
    <ExtendSessionButton
      booking={booking}
      onExtended={refetch}
      size="sm"
    />
  </div>
</div>
```

---

## ⚡ **Step 7: Performance Optimization**

```typescript
// Memoize expensive calculations
const extensionSummary = useMemo(() => {
  return booking.booking_services?.reduce((acc, service) => {
    if (service.is_extension) {
      acc.extensionCount++;
      acc.extensionPrice += service.price;
    } else {
      acc.originalPrice += service.price;
    }
    return acc;
  }, { extensionCount: 0, extensionPrice: 0, originalPrice: 0 });
}, [booking.booking_services]);

// Lazy load extension modal
const ExtendSessionModal = lazy(() => import('./ExtendSessionModal'));
```

---

## 🔧 **Step 8: Error Handling**

```typescript
// Error boundary for extension components
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallback={<div>Extension feature temporarily unavailable</div>}
  onError={(error) => console.error('Extension error:', error)}
>
  <ExtendSessionButton booking={booking} onExtended={refetch} />
</ErrorBoundary>
```

---

## ✅ **Integration Complete Checklist**

- [ ] Components imported correctly
- [ ] Extension buttons added to booking lists
- [ ] Booking detail shows extension history
- [ ] Real-time updates working
- [ ] Mobile responsive design
- [ ] Error handling in place
- [ ] Performance optimized
- [ ] Manual testing passed

---

**🎯 Ready to integrate! Start with BookingHistory.tsx หรือ existing booking page ที่ใช้งานมากที่สุด**