# 🔧 Extension Acknowledgments System Setup

## ปัญหา
**ExtensionAcceptanceCard ไม่แสดงใน Staff App** เพราะขาดระบบ Database สำหรับ acknowledgments

## วิธีแก้ไข - รัน SQL ใน Supabase Dashboard

### 1️⃣ เปิด Supabase SQL Editor
```
https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql
```

### 2️⃣ Copy + Paste SQL ด้านล่างนี้

```sql
-- Extension Acknowledgments System
-- สร้างตาราง extension_acknowledgments และ RPC function

-- Create extension_acknowledgments table
CREATE TABLE IF NOT EXISTS extension_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL,
  booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_staff_extension UNIQUE(staff_profile_id, booking_service_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_staff ON extension_acknowledgments(staff_profile_id);
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_service ON extension_acknowledgments(booking_service_id);
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_acknowledged ON extension_acknowledgments(acknowledged_at);

-- RLS Policies
ALTER TABLE extension_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can only see their own acknowledgments
CREATE POLICY "Staff can view own acknowledgments"
ON extension_acknowledgments FOR SELECT
USING (staff_profile_id = auth.uid());

-- Policy: Staff can update their own acknowledgments
CREATE POLICY "Staff can update own acknowledgments"
ON extension_acknowledgments FOR UPDATE
USING (staff_profile_id = auth.uid());

-- Function to get pending extension acknowledgments
CREATE OR REPLACE FUNCTION get_pending_extension_acknowledgments(staff_profile_id UUID)
RETURNS TABLE (
  acknowledgment_id UUID,
  booking_service_id UUID,
  job_id UUID,
  service_name TEXT,
  customer_name TEXT,
  duration INTEGER,
  price DECIMAL(10,2),
  extended_at TIMESTAMPTZ,
  booking_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id as acknowledgment_id,
    ea.booking_service_id,
    ea.job_id,
    s.name_th as service_name,
    b.customer_name,
    bs.duration,
    bs.price,
    bs.extended_at,
    b.booking_number
  FROM extension_acknowledgments ea
  JOIN booking_services bs ON bs.id = ea.booking_service_id
  JOIN services s ON s.id = bs.service_id
  JOIN bookings b ON b.id = bs.booking_id
  WHERE ea.staff_profile_id = staff_profile_id
    AND ea.acknowledged_at IS NULL
    AND bs.is_extension = true
  ORDER BY bs.extended_at DESC;
END;
$$;

-- Function to create extension acknowledgment when extension is added
CREATE OR REPLACE FUNCTION create_extension_acknowledgment()
RETURNS TRIGGER AS $$
DECLARE
  target_job_id UUID;
  target_staff_profile_id UUID;
BEGIN
  -- Only process extension services
  IF NEW.is_extension = TRUE THEN
    -- Get the job and staff for this booking
    SELECT j.id, j.staff_id
    INTO target_job_id, target_staff_profile_id
    FROM jobs j
    WHERE j.booking_id = NEW.booking_id
    AND j.status IN ('assigned', 'confirmed', 'traveling', 'arrived', 'in_progress')
    LIMIT 1;

    -- Create acknowledgment record if staff found
    IF target_staff_profile_id IS NOT NULL THEN
      INSERT INTO extension_acknowledgments (
        staff_profile_id,
        booking_service_id,
        job_id
      ) VALUES (
        target_staff_profile_id,
        NEW.id,
        target_job_id
      )
      ON CONFLICT (staff_profile_id, booking_service_id) DO NOTHING;

      RAISE NOTICE 'Extension acknowledgment created for staff % and service %',
        target_staff_profile_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic acknowledgment creation
DROP TRIGGER IF EXISTS create_extension_acknowledgment_trigger ON booking_services;
CREATE TRIGGER create_extension_acknowledgment_trigger
  AFTER INSERT ON booking_services
  FOR EACH ROW
  WHEN (NEW.is_extension = TRUE)
  EXECUTE FUNCTION create_extension_acknowledgment();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON extension_acknowledgments TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_extension_acknowledgments(UUID) TO authenticated;
```

### 3️⃣ กดปุ่ม **RUN**

## ✅ หลังรัน SQL แล้ว

### 🎯 ExtensionAcceptanceCard จะทำงาน:
1. **เมื่อมี Extension** → Trigger สร้าง acknowledgment record
2. **Staff เข้า Dashboard** → Hook ดึงข้อมูล pending acknowledgments
3. **แสดง Card** → ExtensionAcceptanceCard ปรากฏพร้อมข้อมูล
4. **กดรับทราบ** → อัปเดต acknowledged_at และ Card หายไป

### 📱 ทดสอบ:
**Staff Dashboard:** http://localhost:3004/staff/dashboard
- ถ้ามี extension ค้างรับทราบ จะเห็น Card สีเหลือง
- แสดงรายละเอียด: เวลาเพิ่ม, รายได้เพิ่ม, ชื่อลูกค้า
- ปุ่ม "รับทราบ" และ "ดูรายละเอียด"

## 📊 Database Tables Created:
- `extension_acknowledgments` - เก็บสถานะการรับทราบ
- `get_pending_extension_acknowledgments()` - RPC function
- Trigger สำหรับสร้าง acknowledgment อัตโนมัติ

## 🔄 Workflow:
1. โรงแรมเพิ่มเวลา → `booking_services` insert
2. Trigger สร้าง `extension_acknowledgments` record
3. Staff เข้า Dashboard → RPC function ดึงข้อมูล
4. แสดง ExtensionAcceptanceCard
5. Staff กดรับทราบ → อัปเดต `acknowledged_at`
6. Card หายไปจาก Dashboard