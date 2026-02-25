
          -- Direct SQL execution
          ALTER TABLE services ENABLE ROW LEVEL SECURITY;

          -- ลบ policy เก่า
          DROP POLICY IF EXISTS "authenticated_users_can_read_services_FINAL" ON services;

          -- สร้าง policy ใหม่
          CREATE POLICY "authenticated_users_can_read_services_FINAL" ON services
            FOR SELECT
            USING (auth.uid() IS NOT NULL);

          -- ให้สิทธิ์
          GRANT SELECT ON services TO authenticated;

          -- ตรวจสอบ
          SELECT policyname FROM pg_policies WHERE tablename = 'services';
        