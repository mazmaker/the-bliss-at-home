# Quick Integration Example

## Add to BookingHistory.tsx:

```tsx
// 1. Add import at the top
import { ExtendSessionButton } from '../components/ExtendSessionButton';

// 2. In the booking card render (around line 400+):
{/* Existing action buttons */}
<button onClick={() => viewBooking(booking)}>
  <Eye className="w-4 h-4" />
  View
</button>

{/* ADD THIS: Extend Session Button */}
{['confirmed', 'in_progress'].includes(booking.status) && (
  <ExtendSessionButton
    booking={booking}
    onExtended={() => {
      // Refresh booking list
      window.location.reload(); // or use refetch if available
    }}
    size="sm"
  />
)}
```

## Test URL:
- Test Page: http://localhost:3003/hotel/test-extend
- BookingHistory: http://localhost:3003/hotel/history

## Expected Behavior:
1. ✅ Button shows only for confirmed/in_progress bookings
2. ✅ Click opens modal with extension options
3. ✅ Extension creates new booking_service record
4. ✅ Database totals update automatically (trigger)
5. ✅ UI refreshes to show extension

## Debug Console Commands:
```javascript
// Check if components loaded
console.log(window.React);

// Test service import
import('./src/services/extendSessionService.ts').then(console.log);

// Check database
supabase.from('bookings').select('*').limit(1).then(console.log);
```