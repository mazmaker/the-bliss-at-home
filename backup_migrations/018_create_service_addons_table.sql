-- Migration: Create Service Add-ons Tables
-- Description: Service add-ons (extra options for services) and booking_addons junction table
-- Version: 018

-- Service add-ons (extra options for services)
CREATE TABLE service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  price DECIMAL(10,2) NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking add-ons (junction table for selected add-ons)
CREATE TABLE booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES service_addons(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, addon_id)
);

-- Indexes
CREATE INDEX idx_service_addons_service ON service_addons(service_id);
CREATE INDEX idx_service_addons_active ON service_addons(is_active);
CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX idx_booking_addons_addon ON booking_addons(addon_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_service_addons_updated_at
  BEFORE UPDATE ON service_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active addons
CREATE POLICY "Anyone can view active addons" ON service_addons
  FOR SELECT USING (is_active = true);

-- Admins can manage addons
CREATE POLICY "Admins can manage addons" ON service_addons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Customers can view own booking addons
CREATE POLICY "Customers can view own booking addons" ON booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.id = booking_addons.booking_id
      AND c.profile_id = auth.uid()
    )
  );

-- Admins can manage all booking addons
CREATE POLICY "Admins can manage all booking addons" ON booking_addons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Grant permissions
GRANT SELECT ON service_addons TO anon, authenticated;
GRANT SELECT ON booking_addons TO authenticated;
