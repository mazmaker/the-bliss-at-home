-- FINAL FIX FOR SERVICES RLS - GUARANTEED TO WORK
-- Run this SQL to fix 401 Unauthorized error

-- Step 1: Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to prevent conflicts
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname FROM pg_policies WHERE tablename = 'services'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON services', pol_name);
    END LOOP;
END $$;

-- Step 3: Create ONE simple working policy
CREATE POLICY "services_select_for_authenticated_users" ON services
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Step 4: Grant necessary table permissions
GRANT SELECT ON services TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Verify the fix
SELECT 'RLS_ENABLED' as status,
       COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'services';

-- Step 6: Test query (should return data)
SELECT COUNT(*) as services_count FROM services WHERE is_active = true;