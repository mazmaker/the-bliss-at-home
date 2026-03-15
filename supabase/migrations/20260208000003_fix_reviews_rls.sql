-- ============================================
-- Fix RLS Policies for reviews table
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON reviews;
DROP POLICY IF EXISTS "Customers can review own bookings" ON reviews;
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;

-- Drop any existing policies with new names before recreating
DROP POLICY IF EXISTS "public_can_view_visible_reviews" ON reviews;
DROP POLICY IF EXISTS "admins_can_view_all_reviews" ON reviews;
DROP POLICY IF EXISTS "customers_can_create_reviews" ON reviews;
DROP POLICY IF EXISTS "admins_can_manage_reviews" ON reviews;

-- Create new policies using helper functions

-- Allow anyone to view visible reviews (public-facing)
CREATE POLICY "public_can_view_visible_reviews"
ON reviews
FOR SELECT
TO authenticated, anon
USING (is_visible = true);

-- Allow admins to view ALL reviews (including hidden)
CREATE POLICY "admins_can_view_all_reviews"
ON reviews
FOR SELECT
TO authenticated
USING (is_admin());

-- Allow customers to create reviews for their own bookings
CREATE POLICY "customers_can_create_reviews"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    WHERE b.id = reviews.booking_id
    AND c.profile_id = auth.uid()
  )
);

-- Allow admins to manage all reviews
CREATE POLICY "admins_can_manage_reviews"
ON reviews
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

SELECT 'Reviews RLS policies fixed!' as status;
