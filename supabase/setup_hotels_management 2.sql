-- ===================================
-- Hotels Management Database Setup
-- Run this SQL in Supabase SQL Editor
-- ===================================

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS public.hotel_bookings CASCADE;
DROP TABLE IF EXISTS public.hotel_payments CASCADE;
DROP TABLE IF EXISTS public.hotel_invoices CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;

-- Create hotels table
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive', 'suspended', 'banned')),
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  tax_id TEXT,
  description TEXT,
  website TEXT,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hotel_invoices table
CREATE TABLE public.hotel_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hotel_payments table
CREATE TABLE public.hotel_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.hotel_invoices(id) ON DELETE SET NULL,
  invoice_number TEXT,
  transaction_ref TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'online')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_date DATE NOT NULL,
  verified_by TEXT,
  verified_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hotel_bookings table (bookings created by hotel for guests)
CREATE TABLE public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  staff_name TEXT,
  booking_date DATE NOT NULL,
  service_date DATE NOT NULL,
  service_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  room_number TEXT,
  notes TEXT,
  created_by_hotel BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_hotels_status ON public.hotels(status);
CREATE INDEX idx_hotel_invoices_hotel_id ON public.hotel_invoices(hotel_id);
CREATE INDEX idx_hotel_invoices_status ON public.hotel_invoices(status);
CREATE INDEX idx_hotel_payments_hotel_id ON public.hotel_payments(hotel_id);
CREATE INDEX idx_hotel_payments_status ON public.hotel_payments(status);
CREATE INDEX idx_hotel_bookings_hotel_id ON public.hotel_bookings(hotel_id);
CREATE INDEX idx_hotel_bookings_status ON public.hotel_bookings(status);
CREATE INDEX idx_hotel_bookings_service_date ON public.hotel_bookings(service_date);

-- Enable Row Level Security
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Allow all operations on hotels for authenticated users"
  ON public.hotels FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on hotel_invoices for authenticated users"
  ON public.hotel_invoices FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on hotel_payments for authenticated users"
  ON public.hotel_payments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on hotel_bookings for authenticated users"
  ON public.hotel_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_invoices_updated_at BEFORE UPDATE ON public.hotel_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_payments_updated_at BEFORE UPDATE ON public.hotel_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Insert Mock Data
-- ===================================

-- Insert mock hotels data
INSERT INTO public.hotels (id, name_th, name_en, contact_person, email, phone, address, latitude, longitude, commission_rate, status, bank_name, bank_account_number, bank_account_name, tax_id, description, website, rating) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'โรงแรมฮิลตัน กรุงเทพฯ', 'Hilton Bangkok', 'คุณสมศรี มั่งมี', 'reservations@hilton.com', '02-123-4567', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', 13.7563, 100.5018, 20.00, 'active', 'ธนาคารกรุงเทพ', '123-4-56789-0', 'บริษัท โรงแรมฮิลตัน จำกัด', '0123456789012', 'โรงแรม 5 ดาว ใจกลางเมือง พร้อมสิ่งอำนวยความสะดวกครบครัน', 'https://www.hilton.com', 4.8),
('550e8400-e29b-41d4-a716-446655440002', 'รีสอร์ทในฝัน เชียงใหม่', 'Nimman Resort', 'คุณวิชัย รวยมั่ง', 'booking@nimman.com', '053-123-456', '456 ถนนนิมมานเหมินท์ เชียงใหม่', 18.7883, 98.9660, 15.00, 'active', 'ธนาคารกสิกรไทย', '456-7-89012-3', 'บริษัท รีสอร์ทในฝัน จำกัด', '0123456789013', 'รีสอร์ทสไตล์บูติก ท่ามกลางธรรมชาติ', 'https://www.nimmanresort.com', 4.9),
('550e8400-e29b-41d4-a716-446655440003', 'โรงแรมดุสิต ธานี', 'Dusit Thani', 'คุณสมหมาย ร่ำรวย', 'info@dusit.com', '02-987-6543', '789 ถนนราชดำริ ปทุมวัน กรุงเทพฯ', 13.7466, 100.5384, 25.00, 'active', 'ธนาคารไทยพาณิชย์', '789-0-12345-6', 'บริษัท โรงแรมดุสิตธานี จำกัด', '0123456789014', 'โรงแรมระดับ 5 ดาว มาตรฐานสากล', 'https://www.dusit.com', 4.7),
('550e8400-e29b-41d4-a716-446655440004', 'เซ็นทรัล พลาซ่า โฮเทล', 'Central Plaza Hotel', 'คุณกานดา บริการดี', 'booking@centralplaza.com', '02-456-7890', '321 ถนนพหลโยธิน ลาดพร้าว กรุงเทพฯ', 13.8151, 100.5619, 18.00, 'pending', 'ธนาคารกรุงศรีอยุธยา', '012-3-45678-9', 'บริษัท เซ็นทรัลพลาซ่า จำกัด', '0123456789015', 'โรงแรมทันสมัย ติดห้างสรรพสินค้า', 'https://www.centralplaza.com', 4.5);

-- Insert mock hotel invoices
INSERT INTO public.hotel_invoices (id, invoice_number, hotel_id, period_start, period_end, period_type, total_bookings, total_revenue, commission_rate, commission_amount, status, issued_date, due_date, paid_date) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'INV-2024-01-001', '550e8400-e29b-41d4-a716-446655440001', '2024-01-01', '2024-01-07', 'weekly', 15, 58000.00, 20.00, 11600.00, 'paid', '2024-01-08', '2024-01-15', '2024-01-10'),
('660e8400-e29b-41d4-a716-446655440002', 'INV-2024-01-002', '550e8400-e29b-41d4-a716-446655440001', '2024-01-08', '2024-01-14', 'weekly', 18, 62000.00, 20.00, 12400.00, 'paid', '2024-01-15', '2024-01-22', '2024-01-16'),
('660e8400-e29b-41d4-a716-446655440003', 'INV-2024-01-003', '550e8400-e29b-41d4-a716-446655440001', '2024-01-15', '2024-01-21', 'weekly', 16, 55000.00, 20.00, 11000.00, 'pending', '2024-01-22', '2024-01-29', NULL),
('660e8400-e29b-41d4-a716-446655440004', 'INV-2024-01-004', '550e8400-e29b-41d4-a716-446655440001', '2024-01-22', '2024-01-28', 'weekly', 20, 70000.00, 20.00, 14000.00, 'pending', '2024-01-29', '2024-02-05', NULL),
('660e8400-e29b-41d4-a716-446655440005', 'INV-2024-01-M', '550e8400-e29b-41d4-a716-446655440001', '2024-01-01', '2024-01-31', 'monthly', 69, 245000.00, 20.00, 49000.00, 'draft', '2024-02-01', '2024-02-15', NULL);

-- Insert mock hotel payments
INSERT INTO public.hotel_payments (id, hotel_id, invoice_id, invoice_number, transaction_ref, amount, payment_method, status, payment_date, verified_by, verified_date, notes) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'INV-2024-01-001', 'TXN-20240110-001', 11600.00, 'bank_transfer', 'completed', '2024-01-10', 'Admin User', '2024-01-10', 'โอนผ่านธนาคารกรุงเทพ'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 'INV-2024-01-002', 'TXN-20240116-002', 12400.00, 'bank_transfer', 'completed', '2024-01-16', 'Admin User', '2024-01-16', 'โอนผ่านธนาคารกรุงเทพ'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'INV-2024-01-003', 'PENDING', 11000.00, 'bank_transfer', 'pending', '2024-01-25', NULL, NULL, NULL);

-- Insert mock hotel bookings
INSERT INTO public.hotel_bookings (id, booking_number, hotel_id, customer_name, customer_phone, customer_email, service_name, service_category, staff_name, booking_date, service_date, service_time, duration, total_price, status, payment_status, room_number, notes, created_by_hotel) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'BK-HTL-2024-001', '550e8400-e29b-41d4-a716-446655440001', 'คุณสมชาย ใจดี', '081-234-5678', 'somchai@email.com', 'นวดแผนไทย 2 ชั่วโมง', 'massage', 'พี่หนิง', '2024-01-25', '2024-01-26', '14:00:00', 120, 1200.00, 'confirmed', 'paid', '501', 'แขกพักห้อง 501 ขอบริการนวดในห้อง', true),
('880e8400-e29b-41d4-a716-446655440002', 'BK-HTL-2024-002', '550e8400-e29b-41d4-a716-446655440001', 'Mrs. Sarah Johnson', '082-345-6789', NULL, 'Aromatherapy Massage', 'spa', 'พี่แอน', '2024-01-25', '2024-01-25', '16:00:00', 90, 1800.00, 'completed', 'paid', '302', 'Foreign guest - English speaking', true),
('880e8400-e29b-41d4-a716-446655440003', 'BK-HTL-2024-003', '550e8400-e29b-41d4-a716-446655440001', 'คุณวิไล สุขสันต์', '083-456-7890', NULL, 'ทำเล็บมือ + เท้า', 'nail', 'พี่นิด', '2024-01-26', '2024-01-27', '10:00:00', 120, 800.00, 'pending', 'pending', '405', NULL, true),
('880e8400-e29b-41d4-a716-446655440004', 'BK-HTL-2024-004', '550e8400-e29b-41d4-a716-446655440001', 'คุณประพันธ์ มีสุข', '084-567-8901', NULL, 'นวดน้ำมัน', 'massage', NULL, '2024-01-24', '2024-01-24', '18:00:00', 60, 600.00, 'no_show', 'refunded', '210', 'แขกไม่มารับบริการ ทำการคืนเงินแล้ว', true);

-- Done! Tables created and populated with mock data
