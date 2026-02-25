# ✅ การแก้ไข Staff Scheduling Logic ที่ถูกต้อง

## ปัญหาในระบบปัจจุบัน:
1. ❌ เช็คแค่วันเดียวกัน ไม่เช็คเวลาจริง
2. ❌ หาหมอนวดทดแทนไม่เช็คว่าว่างจริงไหม
3. ❌ ไม่มีการคำนวณเวลาทับซ้อน

## วิธีแก้ไขที่ถูกต้อง:

### 1. ✅ Time Overlap Detection Function
```typescript
const checkTimeOverlap = (
  start1: string, duration1: number,
  start2: string, duration2: number
): boolean => {
  const startTime1 = new Date(`2000-01-01T${start1}:00`)
  const endTime1 = new Date(startTime1.getTime() + (duration1 * 60000))

  const startTime2 = new Date(`2000-01-01T${start2}:00`)
  const endTime2 = new Date(startTime2.getTime() + (duration2 * 60000))

  // Check if time ranges overlap
  return startTime1 < endTime2 && startTime2 < endTime1
}
```

### 2. ✅ Accurate Conflict Detection
```typescript
// Get existing bookings with time details
const { data: conflictBookings } = await supabase
  .from('bookings')
  .select('booking_time, duration')
  .eq('staff_id', currentBooking.staff_id)
  .eq('booking_date', newDate)
  .neq('id', bookingId)
  .in('status', ['pending', 'confirmed', 'in_progress'])

let hasRealConflict = false
if (conflictBookings?.length > 0) {
  hasRealConflict = conflictBookings.some(booking =>
    checkTimeOverlap(
      newTime, currentBooking.duration,
      booking.booking_time, booking.duration
    )
  )
}
```

### 3. ✅ Smart Staff Availability Check
```typescript
const findAvailableStaff = async (date: string, time: string, duration: number) => {
  // Get all active staff
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id, name_th')
    .eq('is_active', true)
    .eq('is_available', true)

  if (!allStaff) return null

  // Check each staff for availability
  for (const staff of allStaff) {
    const { data: staffBookings } = await supabase
      .from('bookings')
      .select('booking_time, duration')
      .eq('staff_id', staff.id)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress'])

    // Check if this staff has no conflicts
    const hasConflict = staffBookings?.some(booking =>
      checkTimeOverlap(time, duration, booking.booking_time, booking.duration)
    )

    if (!hasConflict) {
      return staff // Found available staff!
    }
  }

  return null // No available staff
}
```

### 4. ✅ Complete Fixed Logic
```typescript
const handleRescheduleBooking = async (bookingId: string, newDate: string, newTime: string) => {
  try {
    // 1. Get current booking
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (!currentBooking.staff_id) {
      throw new Error('ไม่พบข้อมูลหมอนวดที่ได้รับมอบหมาย')
    }

    // 2. Check if current staff is available at new time
    const { data: conflictBookings } = await supabase
      .from('bookings')
      .select('booking_time, duration')
      .eq('staff_id', currentBooking.staff_id)
      .eq('booking_date', newDate)
      .neq('id', bookingId)
      .in('status', ['pending', 'confirmed', 'in_progress'])

    let hasRealConflict = false
    if (conflictBookings?.length > 0) {
      hasRealConflict = conflictBookings.some(booking =>
        checkTimeOverlap(
          newTime, currentBooking.duration,
          booking.booking_time, booking.duration
        )
      )
    }

    // 3. Handle staff reassignment if needed
    let finalStaffId = currentBooking.staff_id
    let staffChangeMessage = ''

    if (hasRealConflict) {
      const availableStaff = await findAvailableStaff(newDate, newTime, currentBooking.duration)

      if (availableStaff) {
        finalStaffId = availableStaff.id
        staffChangeMessage = `\n⚠️ หมอนวดเดิมไม่ว่าง จึงได้จัดหมอนวดคนใหม่: ${availableStaff.name_th}`
      } else {
        throw new Error('ไม่พบหมอนวดที่ว่างในช่วงเวลาที่เลือก กรุณาเลือกเวลาอื่น')
      }
    }

    // 4. Update booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        staff_id: finalStaffId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) throw updateError

    return {
      success: true,
      staffChanged: hasRealConflict,
      staffChangeMessage
    }

  } catch (error) {
    console.error('Error rescheduling booking:', error)
    throw error
  }
}
```

## ตัวอย่างการทำงาน:

### กรณีที่ 1: ไม่ทับคิว ✅
- หมอนวด A มีคิว: 09:00-10:30
- เปลี่ยนเป็น: 11:00-12:30
- **ผลลัพธ์**: ใช้หมอนวดคนเดิม

### กรณีที่ 2: ทับคิว + มีหมอนวดว่าง ✅
- หมอนวด A มีคิว: 09:00-10:30
- เปลี่ยนเป็น: 10:00-11:30 (ทับ 30 นาที)
- หมอนวด B ว่าง: 10:00-11:30
- **ผลลัพธ์**: เปลี่ยนเป็นหมอนวด B

### กรณีที่ 3: ทับคิว + ไม่มีหมอนวดว่าง ❌
- หมอนวด A มีคิว: 09:00-10:30
- เปลี่ยนเป็น: 10:00-11:30
- หมอนวดทุกคนไม่ว่าง
- **ผลลัพธ์**: Error "ไม่พบหมอนวดที่ว่าง"

## สรุป:
ระบบปัจจุบันมีปัญหา แต่สามารถแก้ไขได้โดยใช้ logic ข้างบนนี้