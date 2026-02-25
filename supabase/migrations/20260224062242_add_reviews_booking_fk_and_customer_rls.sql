-- Migration: Add Reviews Booking FK and Customer RLS
-- Version: 20260224062242
-- Description: Add foreign key constraints to reviews table and
-- RLS policies for customer review creation and visibility.

-- ============================================
-- 1. Add FK constraints on reviews table
-- ============================================

ALTER TABLE reviews
  ADD CONSTRAINT reviews_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_staff_id_fkey
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL;

-- Unique constraint: one review per booking
ALTER TABLE reviews
  ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);

-- ============================================
-- 2. Enable RLS on reviews table
-- ============================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Public can view visible reviews (anonymous + authenticated)
CREATE POLICY "public_can_view_visible_reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- Customers can view their own reviews
CREATE POLICY "customers_can_view_own_reviews"
  ON reviews FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = reviews.customer_id
        AND c.profile_id = auth.uid()
    )
  );

-- Customers can create reviews for their own completed bookings
CREATE POLICY "customers_can_create_reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = reviews.booking_id
        AND c.profile_id = auth.uid()
    )
  );

-- Admins can view all reviews
CREATE POLICY "admins_can_view_all_reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can manage (CRUD) all reviews
CREATE POLICY "admins_can_manage_reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
