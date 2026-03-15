-- ============================================
-- Debug Staff Relationships
-- ============================================
-- ตรวจสอบความสัมพันธ์ระหว่าง profiles, staff, และ performance

-- 1. ตรวจสอบ profiles ทั้งหมดที่ชื่อ "สมหญิง"
SELECT
    'Profiles with name สมหญิง' as info,
    id as profile_id,
    full_name,
    email,
    role,
    status
FROM profiles
WHERE full_name LIKE '%สมหญิง%'
ORDER BY created_at;

-- 2. ตรวจสอบ staff records ทั้งหมดที่ชื่อ "สมหญิง"
SELECT
    'Staff records with name สมหญิง' as info,
    s.id as staff_id,
    s.profile_id,
    s.name_th,
    s.status,
    p.full_name as profile_name,
    p.role as profile_role
FROM staff s
LEFT JOIN profiles p ON p.id = s.profile_id
WHERE s.name_th LIKE '%สมหญิง%'
ORDER BY s.created_at;

-- 3. ตรวจสอบ performance data ทั้งหมดที่เกี่ยวข้อง
SELECT
    'Performance data' as info,
    spm.staff_id,
    spm.year,
    spm.month,
    spm.completion_rate,
    spm.performance_score,
    s.name_th as staff_name,
    s.profile_id,
    p.full_name as profile_name,
    p.role as profile_role
FROM staff_performance_metrics spm
LEFT JOIN staff s ON s.id = spm.staff_id
LEFT JOIN profiles p ON p.id = s.profile_id
WHERE s.name_th LIKE '%สมหญิง%'
   OR p.full_name LIKE '%สมหญิง%'
ORDER BY spm.year DESC, spm.month DESC;

-- 4. ตรวจสอบว่า staff_id ใน performance ตรงกับ staff.id หรือไม่
SELECT
    'Check if staff_id matches' as info,
    spm.staff_id,
    CASE
        WHEN EXISTS (SELECT 1 FROM staff WHERE id = spm.staff_id) THEN '✅ Found in staff table'
        ELSE '❌ NOT found in staff table'
    END as staff_exists,
    CASE
        WHEN EXISTS (SELECT 1 FROM profiles WHERE id = spm.staff_id) THEN '✅ Matches profile_id'
        ELSE '❌ Does NOT match profile_id'
    END as matches_profile
FROM staff_performance_metrics spm
GROUP BY spm.staff_id;
