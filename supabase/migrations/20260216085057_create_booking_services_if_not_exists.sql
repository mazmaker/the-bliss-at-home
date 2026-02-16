-- Create booking_services table (idempotent)
CREATE TABLE IF NOT EXISTS booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  duration INTEGER NOT NULL CHECK (duration > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  recipient_index INTEGER NOT NULL DEFAULT 0 CHECK (recipient_index >= 0 AND recipient_index <= 10),
  recipient_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service ON booking_services(service_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_order ON booking_services(booking_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_recipient ON booking_services(booking_id, recipient_index);

-- RLS
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

-- Policies (drop first to be idempotent)
DROP POLICY IF EXISTS "Customers can view own booking services" ON booking_services;
DROP POLICY IF EXISTS "Admins can view all booking services" ON booking_services;
DROP POLICY IF EXISTS "Authenticated users can create booking services" ON booking_services;
DROP POLICY IF EXISTS "Admins can manage all booking services" ON booking_services;

CREATE POLICY "Customers can view own booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = booking_services.booking_id
      AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all booking services" ON booking_services
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Authenticated users can create booking services" ON booking_services
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all booking services" ON booking_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Grants
GRANT SELECT, INSERT ON booking_services TO authenticated;

-- Add is_multi_service column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'is_multi_service') THEN
    ALTER TABLE bookings ADD COLUMN is_multi_service BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
