-- ตรวจสอบข้อมูล staff และ performance ของ "สมหญิง นวดเก่ง"

-- 1. ตรวจสอบข้อมูล profile ของ สมหญิง นวดเก่ง
SELECT
    id as staff_id,
    full_name,
    email,
    role,
    status
FROM profiles
WHERE full_name LIKE '%สมหญิง%'
   OR full_name LIKE '%somying%';

-- 2. ตรวจสอบข้อมูล performance ทั้งหมดของ staff คนนี้
SELECT
    spm.*,
    p.full_name
FROM staff_performance_metrics spm
INNER JOIN profiles p ON p.id = spm.staff_id
WHERE p.full_name LIKE '%สมหญิง%'
ORDER BY spm.year DESC, spm.month DESC;

-- 3. ตรวจสอบข้อมูลเดือนปัจจุบัน (กุมภาพันธ์ 2026)
SELECT
    spm.*,
    p.full_name,
    p.id as staff_id
FROM staff_performance_metrics spm
INNER JOIN profiles p ON p.id = spm.staff_id
WHERE p.full_name LIKE '%สมหญิง%'
  AND spm.year = 2026
  AND spm.month = 2;

-- 4. ทดสอบ RLS policy - ตรวจสอบว่า admin user สามารถเข้าถึงได้หรือไม่
SELECT is_admin() as am_i_admin;

-- 5. ตรวจสอบว่า data types ถูกต้องหรือไม่
SELECT
    pg_typeof(year) as year_type,
    pg_typeof(month) as month_type,
    pg_typeof(staff_id) as staff_id_type,
    pg_typeof(completion_rate) as completion_rate_type,
    pg_typeof(performance_score) as performance_score_type
FROM staff_performance_metrics
LIMIT 1;
