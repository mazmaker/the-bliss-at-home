-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
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
CREATE TABLE IF NOT EXISTS public.hotel_invoices (
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
CREATE TABLE IF NOT EXISTS public.hotel_payments (
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
CREATE TABLE IF NOT EXISTS public.hotel_bookings (
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
  duration INTEGER NOT NULL, -- in minutes
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

-- Create policies for admin access (temporary - allow all for now)
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
